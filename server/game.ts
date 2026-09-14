import { randomInt, randomUUID } from "node:crypto";
import { z } from "zod";
import { rarities, type Catalog } from "@/lib/catalog";
import type { Player, Outcome, State } from "@/lib/types";
import type { DB } from "./db";
import { readCatalog } from "./catalog";
import { GameError, digest } from "./security";
export const secureRandom = () => randomInt(0, 2 ** 48 - 1) / (2 ** 48 - 1);
export function weightedRoll(
  weights: { itemId: string; weight: number }[],
  random = secureRandom,
) {
  const total = weights.reduce((s, w) => s + w.weight, 0);
  if (!weights.length || !Number.isFinite(total) || total <= 0)
    throw new GameError("This case has no valid contents.");
  const pick = random() * total;
  let n = 0;
  for (const w of weights) {
    n += w.weight;
    if (pick < n) return w.itemId;
  }
  return weights[weights.length - 1].itemId;
}
const uuid = z.string().uuid();
export const actionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("case"),
    caseId: z.string().min(1).max(80),
    key: uuid,
  }),
  z.object({ kind: z.literal("daily"), key: uuid }),
  z.object({ kind: z.literal("free"), key: uuid }),
  z.object({
    kind: z.literal("upgrade"),
    wager: z.number().int().min(1).max(1000000),
    multiplier: z.union([
      z.literal(1.5),
      z.literal(2),
      z.literal(5),
      z.literal(10),
      z.literal(20),
    ]),
    key: uuid,
  }),
  z.object({
    kind: z.literal("coin"),
    wager: z.number().int().min(1).max(1000000),
    face: z.enum(["HEADS", "TAILS"]),
    key: uuid,
  }),
]);
export async function changeBalance(
  db: DB,
  p: Player,
  amount: number,
  type: string,
  ref: string,
) {
  const before = Number(p.balance),
    after = before + amount;
  if (!Number.isSafeInteger(after) || after < 0 || after > 9000000000000)
    throw new GameError(
      after < 0
        ? "Not enough Spunk Nuggets. Claim a daily or free reward."
        : "Balance limit reached.",
    );
  await db.query("UPDATE spunk.players SET balance=$2 WHERE id=$1", [
    p.id,
    after,
  ]);
  await db.query(
    "INSERT INTO spunk.ledger(id,player_id,amount,balance_before,balance_after,type,reference_id) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [randomUUID(), p.id, amount, before, after, type, ref],
  );
  p.balance = after;
}
export async function awardCompletions(
  db: DB,
  p: Player,
  c: Catalog,
  ref: string,
  rewards: Outcome["rewards"],
) {
  const owned = new Set(
    (
      await db.query<{ item_id: string }>(
        "SELECT item_id FROM spunk.player_items WHERE player_id=$1",
        [p.id],
      )
    ).map((i) => i.item_id),
  );
  const groups = [
    ...rarities.map((r) => ({
      kind: "rarity",
      key: r,
      ids: c.items.filter((i) => i.rarity === r).map((i) => i.id),
      reward: c.settings.rarityRewards[r],
      label: r + " COLLECTION COMPLETE",
    })),
    ...c.lines.map((l) => ({
      kind: "line",
      key: l.id,
      ids: l.itemIds,
      reward: l.reward,
      label: l.name + " COMPLETE",
    })),
  ];
  for (const g of groups)
    if (g.ids.length && g.ids.every((id) => owned.has(id))) {
      const row = await db.query(
        "INSERT INTO spunk.completions(player_id,kind,key,amount) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING key",
        [p.id, g.kind, g.key, g.reward],
      );
      if (row.length) {
        await changeBalance(
          db,
          p,
          g.reward,
          g.kind === "rarity" ? "RARITY_COMPLETION" : "LINE_COMPLETION",
          ref,
        );
        rewards.push({ label: g.label, amount: g.reward });
      }
    }
}
export async function play(
  db: DB,
  playerId: string,
  input: unknown,
  random = secureRandom,
): Promise<Outcome> {
  const a = actionSchema.parse(input),
    fingerprint = digest(JSON.stringify(a));
  return db.transaction(async (tx) => {
    const [p] = await tx.query<Player & { last_action_at: string | null }>(
      "SELECT * FROM spunk.players WHERE id=$1 FOR UPDATE",
      [playerId],
    );
    if (!p) throw new GameError("Player not found.", 404);
    p.balance = Number(p.balance);
    const [prior] = await tx.query<{ fingerprint: string; response: Outcome }>(
      "SELECT fingerprint,response FROM spunk.requests WHERE player_id=$1 AND key=$2",
      [playerId, a.key],
    );
    if (prior) {
      if (prior.fingerprint !== fingerprint)
        throw new GameError(
          "Request key was already used for a different action.",
          409,
        );
      return prior.response;
    }
    const [clock] = await tx.query<{ now: string; day: string }>(
      "SELECT clock_timestamp()::text AS now,(clock_timestamp() AT TIME ZONE 'UTC')::date::text AS day",
    );
    const now = new Date(clock.now).getTime();
    if (p.last_action_at && now - new Date(p.last_action_at).getTime() < 800)
      throw new GameError("Please wait a moment before playing again.", 429);
    // Shared lock prevents catalog edits halfway through an action.
    await tx.query("SELECT id FROM spunk.settings WHERE id=1 FOR SHARE");
    const c = await readCatalog(tx),
      s = c.settings,
      id = randomUUID();
    const out: Outcome = { id, kind: a.kind, rewards: [], balance: p.balance };
    const reward = async (amount: number, type: string, label: string) => {
      await changeBalance(tx, p, amount, type, id);
      out.rewards.push({ label, amount });
    };
    if (a.kind === "daily" || a.kind === "free") {
      const last = a.kind === "daily" ? p.daily_at : p.free_at,
        period = a.kind === "daily" ? 86400000 : 300000;
      if (last && now - new Date(last).getTime() < period)
        throw new GameError("Reward cooldown is still active.");
      await reward(
        a.kind === "daily" ? s.dailyReward : s.freeReward,
        a.kind === "daily" ? "DAILY_CLAIM" : "FIVE_MINUTE_REWARD",
        a.kind === "daily" ? "DAILY REWARD" : "FREE NUGGETS",
      );
      await tx.query(
        a.kind === "daily"
          ? "UPDATE spunk.players SET daily_at=$2 WHERE id=$1"
          : "UPDATE spunk.players SET free_at=$2 WHERE id=$1",
        [p.id, clock.now],
      );
    } else if (a.kind === "case") {
      const ca = c.cases.find((ca) => ca.id === a.caseId && ca.enabled);
      if (!ca) throw new GameError("Case is unavailable.");
      await changeBalance(tx, p, -ca.price, "CASE_PURCHASE", id);
      out.itemId = weightedRoll(ca.weights, random);
      const old = await tx.query(
        "SELECT item_id FROM spunk.player_items WHERE player_id=$1 AND item_id=$2",
        [p.id, out.itemId],
      );
      out.duplicate = old.length > 0;
      await tx.query(
        "INSERT INTO spunk.player_items(player_id,item_id,quantity) VALUES($1,$2,1) ON CONFLICT(player_id,item_id) DO UPDATE SET quantity=spunk.player_items.quantity+1,last_obtained_at=now()",
        [p.id, out.itemId],
      );
      await reward(s.caseReward, "CASE_OPEN_REWARD", "CASE OPEN REWARD");
      const first = p.first_case_day
        ? new Date(p.first_case_day).toISOString().slice(0, 10)
        : null;
      if (first !== clock.day) {
        await reward(
          s.firstCaseReward,
          "FIRST_CASE_REWARD",
          "FIRST CASE TODAY",
        );
        await tx.query(
          "UPDATE spunk.players SET first_case_day=$2 WHERE id=$1",
          [p.id, clock.day],
        );
      }
      if (out.duplicate)
        await reward(s.duplicateReward, "DUPLICATE_REWARD", "DUPLICATE BONUS");
      await awardCompletions(tx, p, c, id, out.rewards);
    } else {
      await changeBalance(
        tx,
        p,
        -a.wager,
        a.kind === "coin" ? "COIN_FLIP_WAGER" : "UPGRADER_WAGER",
        id,
      );
      out.wager = a.wager;
      if (a.kind === "coin") {
        out.face = random() < 0.5 ? "HEADS" : "TAILS";
        out.won = out.face === a.face;
        out.multiplier = 2;
      } else {
        out.multiplier = a.multiplier;
        out.won = random() < s.upgradeChances[String(a.multiplier)] / 100;
      }
      out.payout = out.won ? Math.floor(a.wager * out.multiplier) : 0;
      if (out.won)
        await changeBalance(
          tx,
          p,
          out.payout,
          a.kind === "coin" ? "COIN_FLIP_WIN" : "UPGRADER_WIN",
          id,
        );
      else
        await changeBalance(
          tx,
          p,
          0,
          a.kind === "coin" ? "COIN_FLIP_LOSS" : "UPGRADER_LOSS",
          id,
        );
    }
    out.balance = p.balance;
    const net = (
      await tx.query<{ amount: number }>(
        "SELECT COALESCE(sum(amount),0)::bigint AS amount FROM spunk.ledger WHERE reference_id=$1",
        [id],
      )
    )[0].amount;
    await tx.query(
      "INSERT INTO spunk.history(id,player_id,kind,amount,detail) VALUES($1,$2,$3,$4,$5::jsonb)",
      [id, p.id, a.kind, Number(net), JSON.stringify(out)],
    );
    if (a.kind === "case")
      await tx.query(
        "INSERT INTO spunk.case_openings(id,player_id,case_id,item_id,duplicate) VALUES($1,$2,$3,$4,$5)",
        [id, p.id, a.caseId, out.itemId, out.duplicate],
      );
    await tx.query("UPDATE spunk.players SET last_action_at=$2 WHERE id=$1", [
      p.id,
      clock.now,
    ]);
    await tx.query(
      "INSERT INTO spunk.requests(player_id,key,fingerprint,response) VALUES($1,$2,$3,$4::jsonb)",
      [p.id, a.key, fingerprint, JSON.stringify(out)],
    );
    return out;
  });
}
export async function getState(db: DB, id: string): Promise<State> {
  return db.transaction(async (tx) => {
    // The same row lock as mutations gives one consistent balance/inventory snapshot.
    const [player] = await tx.query<Player>(
      "SELECT id,name,balance,daily_at,free_at,first_case_day FROM spunk.players WHERE id=$1 FOR SHARE",
      [id],
    );
    if (!player) throw new GameError("Player not found.", 404);
    player.balance = Number(player.balance);
    await tx.query("SELECT id FROM spunk.settings WHERE id=1 FOR SHARE");
    const inventory = await tx.query<State["inventory"][number]>(
      "SELECT item_id,quantity FROM spunk.player_items WHERE player_id=$1",
      [id],
    );
    const completions = await tx.query<State["completions"][number]>(
      "SELECT kind,key FROM spunk.completions WHERE player_id=$1",
      [id],
    );
    const history = await tx.query<State["history"][number]>(
      "SELECT id,kind,amount,detail,created_at FROM spunk.history WHERE player_id=$1 ORDER BY created_at DESC LIMIT 100",
      [id],
    );
    const recent = await tx.query<State["recent"][number]>(
      "SELECT p.name,o.item_id,o.created_at FROM spunk.case_openings o JOIN spunk.players p ON p.id=o.player_id ORDER BY o.created_at DESC LIMIT 12",
    );
    return {
      player,
      inventory,
      completions,
      history: history.map((h) => ({ ...h, amount: Number(h.amount) })),
      recent,
      catalog: await readCatalog(tx),
      serverTime: (
        await tx.query<{ now: string }>("SELECT clock_timestamp()::text AS now")
      )[0].now,
    };
  });
}
