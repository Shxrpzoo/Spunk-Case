import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { DB } from "./db";
import { readCatalog } from "./catalog";
import { changeBalance, secureRandom, weightedRoll } from "./game";
import { GameError, digest } from "./security";
import { cardValue, type Item } from "@/lib/catalog";
import type { Player, Outcome } from "@/lib/types";
import { BATTLE_FEE, type Battle, type BattleInbox } from "@/lib/battles";
import { addCard } from "./trading";
const id = z.string().min(1).max(100),
  key = z.string().uuid();
export const battleSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    opponentId: id,
    mode: z.enum(["normal", "crazy"]),
    caseIds: z.array(id).min(1).max(5),
    key,
  }),
  z.object({ action: z.enum(["accept", "decline"]), battleId: id, key }),
]);
type Round = {
  id: string;
  name: string;
  pool: { item: Item; weight: number }[];
};
type Row = {
  id: string;
  challenger_id: string;
  opponent_id: string;
  mode: Battle["mode"];
  status: Battle["status"];
  entry_fee: number;
  rounds: Round[];
  challenger_cards: Item[];
  opponent_cards: Item[] | null;
  winner_id: string | null;
  tie: boolean;
  created_at: string;
  completed_at: string | null;
  challenger_name: string;
  opponent_name: string;
};
const total = (cards: Item[]) =>
  cards.reduce((n, i) => n + cardValue(i, "RAW"), 0);
// Explicit projection is intentional: neither snapshots nor hidden totals leave the server.
function visible(r: Row, viewer: string): Battle {
  const complete = r.status === "completed",
    own = r.challenger_id === viewer;
  return {
    id: r.id,
    challenger_id: r.challenger_id,
    opponent_id: r.opponent_id,
    challenger_name: r.challenger_name,
    opponent_name: r.opponent_name,
    mode: r.mode,
    status: r.status,
    entry_fee: Number(r.entry_fee),
    cases: r.rounds.map((x) => ({ id: x.id, name: x.name })),
    challenger_cards: complete || own ? r.challenger_cards : null,
    opponent_cards: complete ? r.opponent_cards : null,
    challenger_total: complete || own ? total(r.challenger_cards) : null,
    opponent_total: complete ? total(r.opponent_cards!) : null,
    winner_id: r.winner_id,
    tie: r.tie,
    created_at: r.created_at,
    completed_at: r.completed_at,
  };
}
const joined =
  "SELECT b.*,a.name challenger_name,o.name opponent_name FROM spunk.battles b JOIN spunk.players a ON a.id=b.challenger_id JOIN spunk.players o ON o.id=b.opponent_id";
export async function battleDetail(
  db: DB,
  viewer: string,
  battleId: string,
): Promise<Battle> {
  const [r] = await db.query<Row>(
    joined + " WHERE b.id=$1 AND (b.challenger_id=$2 OR b.opponent_id=$2)",
    [battleId, viewer],
  );
  if (!r) throw new GameError("Battle not found.", 404);
  return visible(r, viewer);
}
export async function battleInbox(
  db: DB,
  viewer: string,
  page = 0,
): Promise<BattleInbox> {
  page = z.number().int().min(0).max(10000).parse(page);
  const rows = await db.query<Row>(
    joined +
      " WHERE b.challenger_id=$1 OR b.opponent_id=$1 ORDER BY b.created_at DESC,b.id LIMIT 20 OFFSET $2",
    [viewer, page * 20],
  );
  const [count] = await db.query<{ n: number }>(
    "SELECT count(*)::int n FROM spunk.battles WHERE challenger_id=$1 OR opponent_id=$1",
    [viewer],
  );
  return { battles: rows.map((r) => visible(r, viewer)), total: count.n, page };
}
async function notice(
  db: DB,
  player: string,
  battleId: string,
  kind: string,
  title: string,
) {
  await db.query(
    "INSERT INTO spunk.notifications(id,player_id,kind,title,battle_id) VALUES($1,$2,$3,$4,$5)",
    [randomUUID(), player, kind, title, battleId],
  );
}
async function record(
  db: DB,
  player: string,
  kind: string,
  amount: number,
  detail: object,
  recordId: string = randomUUID(),
) {
  await db.query(
    "INSERT INTO spunk.history(id,player_id,kind,amount,detail) VALUES($1,$2,$3,$4,$5::text::jsonb)",
    [recordId, player, kind, amount, JSON.stringify(detail)],
  );
  return recordId;
}
const roll = (rounds: Round[], random: () => number) =>
  rounds.map((r) => {
    const id = weightedRoll(
      r.pool.map((x) => ({ itemId: x.item.id, weight: x.weight })),
      random,
    );
    return r.pool.find((x) => x.item.id === id)!.item;
  });
export async function battleAction(
  db: DB,
  actorId: string,
  input: unknown,
  random = secureRandom,
): Promise<Outcome> {
  const a = battleSchema.parse(input),
    fingerprint = digest("battle:" + JSON.stringify(a));
  return db.transaction(async (tx) => {
    let existing: Row | undefined;
    if (a.action !== "create") {
      [existing] = await tx.query<Row>(
        "SELECT * FROM spunk.battles WHERE id=$1 AND (challenger_id=$2 OR opponent_id=$2)",
        [a.battleId, actorId],
      );
      if (!existing) throw new GameError("Battle not found.", 404);
    }
    const otherId =
      a.action === "create"
        ? a.opponentId
        : existing!.challenger_id === actorId
          ? existing!.opponent_id
          : existing!.challenger_id;
    if (otherId === actorId) throw new GameError("Choose another player.");
    const players = await tx.query<Player>(
      "SELECT * FROM spunk.players WHERE id IN ($1,$2) ORDER BY id FOR UPDATE",
      [actorId, otherId],
    );
    const actor = players.find((p) => p.id === actorId),
      other = players.find((p) => p.id === otherId);
    if (!actor || !other) throw new GameError("Player not found.", 404);
    actor.balance = Number(actor.balance);
    other.balance = Number(other.balance);
    const [prior] = await tx.query<{
      fingerprint: string;
      response: Outcome | string;
    }>(
      "SELECT fingerprint,response FROM spunk.requests WHERE player_id=$1 AND key=$2",
      [actorId, a.key],
    );
    if (prior) {
      if (prior.fingerprint !== fingerprint)
        throw new GameError("Request key already used.", 409);
      return typeof prior.response === "string"
        ? JSON.parse(prior.response)
        : prior.response;
    }
    const out: Outcome = {
      id: randomUUID(),
      kind: "battle",
      balance: actor.balance,
      rewards: [],
    };
    if (a.action === "create") {
      await tx.query("SELECT id FROM spunk.settings WHERE id=1 FOR SHARE");
      const c = await readCatalog(tx);
      const rounds: Round[] = a.caseIds.map((caseId) => {
        const ca = c.cases.find((x) => x.id === caseId && x.enabled);
        if (!ca)
          throw new GameError("One of the selected cases is unavailable.");
        const pool = ca.weights.flatMap((w) => {
          const item = c.items.find((i) => i.id === w.itemId);
          return item && ["EPIC", "LEGENDARY", "MYTHIC"].includes(item.rarity)
            ? [
                {
                  item: { ...item, value: cardValue(item, "RAW") },
                  weight: w.weight,
                },
              ]
            : [];
        });
        if (!pool.length)
          throw new GameError(ca.name + " has no Epic or better cards.");
        return { id: ca.id, name: ca.name, pool };
      });
      await changeBalance(tx, actor, -BATTLE_FEE, "BATTLE_ENTRY", out.id);
      const cards = roll(rounds, random),
        battleId = randomUUID();
      out.battleId = battleId;
      await tx.query(
        "INSERT INTO spunk.battles(id,challenger_id,opponent_id,mode,entry_fee,rounds,challenger_cards) VALUES($1,$2,$3,$4,$5,$6::text::jsonb,$7::text::jsonb)",
        [
          battleId,
          actorId,
          otherId,
          a.mode,
          BATTLE_FEE,
          JSON.stringify(rounds),
          JSON.stringify(cards),
        ],
      );
      await record(
        tx,
        actorId,
        "battle-entry",
        -BATTLE_FEE,
        { battleId, opponent: other.name, mode: a.mode, rounds: rounds.length },
        out.id,
      );
      await notice(
        tx,
        otherId,
        battleId,
        "battle-invite",
        actor.name + " challenged you to a " + a.mode + " battle",
      );
    } else {
      const [b] = await tx.query<Row>(
        "SELECT * FROM spunk.battles WHERE id=$1 FOR UPDATE",
        [a.battleId],
      );
      out.battleId = b.id;
      if (b.opponent_id !== actorId)
        throw new GameError("Only the invited player can respond.", 403);
      if (b.status !== "pending")
        throw new GameError("This battle has already finished.", 409);
      if (a.action === "decline") {
        await changeBalance(
          tx,
          other,
          Number(b.entry_fee),
          "BATTLE_REFUND",
          out.id,
        );
        await tx.query(
          "UPDATE spunk.battles SET status='declined',completed_at=now() WHERE id=$1",
          [b.id],
        );
        await record(tx, other.id, "battle-refund", Number(b.entry_fee), {
          battleId: b.id,
          opponent: actor.name,
        });
        await notice(
          tx,
          other.id,
          b.id,
          "battle-declined",
          actor.name + " declined; your entry fee was refunded",
        );
      } else {
        await changeBalance(
          tx,
          actor,
          -Number(b.entry_fee),
          "BATTLE_ENTRY",
          out.id,
        );
        const theirs = roll(b.rounds, random),
          left = total(b.challenger_cards),
          right = total(theirs),
          tie = left === right;
        const winner = tie
          ? null
          : (b.mode === "normal" ? left > right : left < right)
            ? b.challenger_id
            : b.opponent_id;
        const allocations = tie
          ? [
              { owner: other.id, cards: b.challenger_cards },
              { owner: actor.id, cards: theirs },
            ]
          : [{ owner: winner!, cards: [...b.challenger_cards, ...theirs] }];
        for (const group of allocations)
          for (const item of group.cards)
            await addCard(tx, group.owner, {
              item_id: item.id,
              effect: "RAW",
              quantity: 1,
            });
        await tx.query(
          "UPDATE spunk.battles SET status='completed',opponent_cards=$2::text::jsonb,winner_id=$3,tie=$4,completed_at=now() WHERE id=$1",
          [b.id, JSON.stringify(theirs), winner, tie],
        );
        await record(
          tx,
          actorId,
          "battle-entry",
          -Number(b.entry_fee),
          { battleId: b.id, opponent: other.name, mode: b.mode },
          out.id,
        );
        for (const side of [
          { p: other, cards: b.challenger_cards },
          { p: actor, cards: theirs },
        ]) {
          await record(tx, side.p.id, "battle-result", 0, {
            battleId: b.id,
            mode: b.mode,
            winnerId: winner,
            tie,
            challengerTotal: left,
            opponentTotal: right,
          });
          for (let n = 0; n < side.cards.length; n++) {
            const historyId = await record(tx, side.p.id, "battle-case", 0, {
              battleId: b.id,
              itemId: side.cards[n].id,
            });
            await tx.query(
              "INSERT INTO spunk.case_openings(id,player_id,case_id,item_id,duplicate) VALUES($1,$2,$3,$4,false)",
              [historyId, side.p.id, b.rounds[n].id, side.cards[n].id],
            );
          }
          await notice(
            tx,
            side.p.id,
            b.id,
            "battle-completed",
            tie
              ? "Battle tied — you each kept your cards"
              : winner === side.p.id
                ? "You won your " + b.mode + " battle"
                : "Your " + b.mode + " battle is complete",
          );
        }
      }
    }
    out.balance = actor.balance;
    await tx.query(
      "INSERT INTO spunk.requests(player_id,key,fingerprint,response) VALUES($1,$2,$3,$4::text::jsonb)",
      [actorId, a.key, fingerprint, JSON.stringify(out)],
    );
    return out;
  });
}
