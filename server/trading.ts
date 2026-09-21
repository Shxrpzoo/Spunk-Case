import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { DB } from "./db";
import { GameError, digest } from "./security";
import { changeBalance, takeCard } from "./game";
import { readCatalog } from "./catalog";
import { effects } from "@/lib/catalog";
import type { Player, CardStack } from "@/lib/types";
import type {
  Trade,
  TradeSide,
  TradeProposal,
  SocialOutcome,
  TradeInbox,
  TradeInventory,
  NotificationInbox,
} from "@/lib/trading";
import { stackKey } from "@/lib/trading";

const id = z.string().min(1).max(100);
const amount = z.number().int().min(0).max(9000000000000);
const sideSchema = z
  .object({
    nuggets: amount,
    cards: z
      .array(
        z.object({
          item_id: id,
          effect: z.enum(effects),
          quantity: z.number().int().min(1).max(5),
        }),
      )
      .max(5),
  })
  .superRefine((s, ctx) => {
    if (s.cards.reduce((n, c) => n + c.quantity, 0) > 5)
      ctx.addIssue({
        code: "custom",
        message: "Choose at most five card copies per player.",
      });
    if (new Set(s.cards.map(stackKey)).size !== s.cards.length)
      ctx.addIssue({
        code: "custom",
        message: "Combine duplicate card selections into one quantity.",
      });
  });
const offerFields = { give: sideSchema, receive: sideSchema };
export const socialSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("offer"),
    recipientId: id,
    key: z.string().uuid(),
    ...offerFields,
  }),
  z.object({
    action: z.literal("counter"),
    tradeId: id,
    revision: z.number().int().positive(),
    key: z.string().uuid(),
    ...offerFields,
  }),
  z.object({
    action: z.enum(["accept", "decline"]),
    tradeId: id,
    revision: z.number().int().positive(),
    key: z.string().uuid(),
  }),
  z.object({
    action: z.literal("gift"),
    recipientId: id,
    amount: amount.min(1),
    key: z.string().uuid(),
  }),
]);
type TradeRow = Omit<Trade, "a_name" | "b_name">;
async function notify(
  db: DB,
  player: string,
  kind: string,
  title: string,
  tradeId: string | null,
  detail: object = {},
) {
  await db.query(
    "INSERT INTO spunk.notifications(id,player_id,kind,title,trade_id,detail) VALUES($1,$2,$3,$4,$5,$6::text::jsonb)",
    [randomUUID(), player, kind, title, tradeId, JSON.stringify(detail)],
  );
}
async function ensureSide(db: DB, player: Player, side: TradeSide) {
  if (Number(player.balance) < side.nuggets)
    throw new GameError(
      `${player.name} no longer has enough Spunk Nuggets. Request a revised offer.`,
      409,
    );
  for (const c of side.cards) {
    const raw = c.effect === "RAW";
    const [row] = await db.query<{ quantity: number }>(
      raw
        ? "SELECT quantity FROM spunk.player_items WHERE player_id=$1 AND item_id=$2"
        : "SELECT quantity FROM spunk.card_effects WHERE player_id=$1 AND item_id=$2 AND effect=$3",
      raw ? [player.id, c.item_id] : [player.id, c.item_id, c.effect],
    );
    if (!row || row.quantity < c.quantity)
      throw new GameError(
        `${player.name} no longer owns all the selected cards. Request a revised offer.`,
        409,
      );
  }
}
export async function addCard(db: DB, player: string, c: CardStack) {
  if (c.effect === "RAW")
    await db.query(
      "INSERT INTO spunk.player_items(player_id,item_id,quantity) VALUES($1,$2,$3) ON CONFLICT(player_id,item_id) DO UPDATE SET quantity=spunk.player_items.quantity+$3,last_obtained_at=now()",
      [player, c.item_id, c.quantity],
    );
  else
    await db.query(
      "INSERT INTO spunk.card_effects(player_id,item_id,effect,quantity) VALUES($1,$2,$3,$4) ON CONFLICT(player_id,item_id,effect) DO UPDATE SET quantity=spunk.card_effects.quantity+$4",
      [player, c.item_id, c.effect, c.quantity],
    );
  await db.query(
    "INSERT INTO spunk.discoveries(player_id,item_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
    [player, c.item_id],
  );
}
async function removeSide(db: DB, player: string, side: TradeSide) {
  for (const c of side.cards)
    for (let n = 0; n < c.quantity; n++)
      await takeCard(db, player, c.item_id, c.effect);
}
async function history(
  db: DB,
  player: string,
  kind: string,
  net: number,
  detail: object,
) {
  await db.query(
    "INSERT INTO spunk.history(id,player_id,kind,amount,detail) VALUES($1,$2,$3,$4,$5::text::jsonb)",
    [randomUUID(), player, kind, net, JSON.stringify(detail)],
  );
}
export async function socialAction(
  db: DB,
  actorId: string,
  input: unknown,
): Promise<SocialOutcome> {
  const a = socialSchema.parse(input),
    fingerprint = digest("social:" + JSON.stringify(a));
  return db.transaction(async (tx) => {
    // Always lock the two player rows in the same order. These are also the
    // locks used by play/sell/upgrade, so a card or balance cannot be spent twice.
    let existing: TradeRow | undefined;
    if ("tradeId" in a) {
      [existing] = await tx.query<TradeRow>(
        "SELECT * FROM spunk.trades WHERE id=$1 AND (party_a=$2 OR party_b=$2)",
        [a.tradeId, actorId],
      );
      if (!existing) throw new GameError("Trade not found.", 404);
    }
    const otherId =
      "recipientId" in a
        ? a.recipientId
        : existing!.party_a === actorId
          ? existing!.party_b
          : existing!.party_a;
    if (actorId === otherId) throw new GameError("Choose another player.");
    const players = await tx.query<Player>(
      "SELECT id,name,balance,daily_at,free_at,first_case_day FROM spunk.players WHERE id IN ($1,$2) ORDER BY id FOR UPDATE",
      [actorId, otherId],
    );
    const actor = players.find((p) => p.id === actorId),
      other = players.find((p) => p.id === otherId);
    if (!actor || !other) throw new GameError("Player not found.", 404);
    actor.balance = Number(actor.balance);
    other.balance = Number(other.balance);
    const [prior] = await tx.query<{
      fingerprint: string;
      response: SocialOutcome | string;
    }>(
      "SELECT fingerprint,response FROM spunk.requests WHERE player_id=$1 AND key=$2",
      [actorId, a.key],
    );
    if (prior) {
      if (prior.fingerprint !== fingerprint)
        throw new GameError(
          "Request key was already used for a different action.",
          409,
        );
      return typeof prior.response === "string"
        ? JSON.parse(prior.response)
        : prior.response;
    }
    const result: SocialOutcome = {
      id: randomUUID(),
      kind: "social",
      balance: actor.balance,
      rewards: [],
    };
    if (a.action === "gift") {
      await changeBalance(tx, actor, -a.amount, "NUGGET_GIFT_SENT", result.id);
      await changeBalance(
        tx,
        other,
        a.amount,
        "NUGGET_GIFT_RECEIVED",
        result.id,
      );
      await history(tx, actorId, "transfer", -a.amount, {
        id: result.id,
        to: other.name,
        amount: a.amount,
      });
      await history(tx, otherId, "transfer", a.amount, {
        id: result.id,
        from: actor.name,
        amount: a.amount,
      });
      await notify(
        tx,
        otherId,
        "nuggets-received",
        `${actor.name} sent you Spunk Nuggets`,
        null,
        { amount: a.amount, from: actor.name },
      );
    } else {
      let trade: TradeRow;
      if (a.action === "offer") {
        trade = {
          id: randomUUID(),
          party_a: actorId,
          party_b: otherId,
          offered_by: actorId,
          awaiting_id: otherId,
          status: "pending",
          revision: 1,
          proposal: { a: a.give, b: a.receive },
          created_at: "",
          updated_at: "",
        };
      } else {
        [trade] = await tx.query<TradeRow>(
          "SELECT * FROM spunk.trades WHERE id=$1 FOR UPDATE",
          [a.tradeId],
        );
        if (trade.status !== "pending")
          throw new GameError(
            "This trade has already been completed or declined. Refresh your inbox.",
            409,
          );
        if (trade.revision !== a.revision)
          throw new GameError(
            "This offer has changed. Review the latest version before deciding.",
            409,
          );
        if (trade.awaiting_id !== actorId)
          throw new GameError(
            "The other player must respond to this offer.",
            403,
          );
      }
      if (a.action === "offer" || a.action === "counter") {
        if (
          !a.give.cards.length &&
          !a.receive.cards.length &&
          !a.give.nuggets &&
          !a.receive.nuggets
        )
          throw new GameError("Add cards or Spunk Nuggets to the offer.");
        await ensureSide(tx, actor, a.give);
        await ensureSide(tx, other, a.receive);
        if (a.action === "counter") {
          trade.proposal =
            trade.party_a === actorId
              ? { a: a.give, b: a.receive }
              : { a: a.receive, b: a.give };
          trade.revision++;
          trade.offered_by = actorId;
          trade.awaiting_id = otherId;
          await tx.query(
            "UPDATE spunk.trades SET proposal=$2::text::jsonb,offered_by=$3,awaiting_id=$4,revision=$5,updated_at=now() WHERE id=$1",
            [
              trade.id,
              JSON.stringify(trade.proposal),
              actorId,
              otherId,
              trade.revision,
            ],
          );
        } else
          await tx.query(
            "INSERT INTO spunk.trades(id,party_a,party_b,offered_by,awaiting_id,proposal) VALUES($1,$2,$3,$2,$3,$4::text::jsonb)",
            [trade.id, actorId, otherId, JSON.stringify(trade.proposal)],
          );
        await notify(
          tx,
          otherId,
          a.action === "offer" ? "trade-offer" : "trade-counter",
          `${actor.name} ${a.action === "offer" ? "sent a trade offer" : "requested a revised trade"}`,
          trade.id,
          { revision: trade.revision },
        );
      } else if (a.action === "accept") {
        const pa = players.find((p) => p.id === trade.party_a)!,
          pb = players.find((p) => p.id === trade.party_b)!;
        // Revalidate the stored proposal as well as both current inventories.
        const proposal: TradeProposal = {
          a: sideSchema.parse(trade.proposal.a),
          b: sideSchema.parse(trade.proposal.b),
        };
        await ensureSide(tx, pa, proposal.a);
        await ensureSide(tx, pb, proposal.b);
        await removeSide(tx, pa.id, proposal.a);
        await removeSide(tx, pb.id, proposal.b);
        for (const c of proposal.a.cards) await addCard(tx, pb.id, c);
        for (const c of proposal.b.cards) await addCard(tx, pa.id, c);
        // Debit both sides before crediting, preserving the balance ceiling.
        if (proposal.a.nuggets)
          await changeBalance(
            tx,
            pa,
            -proposal.a.nuggets,
            "TRADE_SENT",
            result.id,
          );
        if (proposal.b.nuggets)
          await changeBalance(
            tx,
            pb,
            -proposal.b.nuggets,
            "TRADE_SENT",
            result.id,
          );
        if (proposal.a.nuggets)
          await changeBalance(
            tx,
            pb,
            proposal.a.nuggets,
            "TRADE_RECEIVED",
            result.id,
          );
        if (proposal.b.nuggets)
          await changeBalance(
            tx,
            pa,
            proposal.b.nuggets,
            "TRADE_RECEIVED",
            result.id,
          );
        trade.status = "accepted";
        await tx.query(
          "UPDATE spunk.trades SET status='accepted',updated_at=now(),completed_at=now() WHERE id=$1",
          [trade.id],
        );
        for (const p of players) {
          const own = p.id === trade.party_a ? proposal.a : proposal.b,
            received = p.id === trade.party_a ? proposal.b : proposal.a;
          const counterpart = p.id === actorId ? other : actor;
          await history(tx, p.id, "trade", received.nuggets - own.nuggets, {
            id: result.id,
            tradeId: trade.id,
            with: counterpart.name,
            given: own,
            received,
          });
          await notify(
            tx,
            p.id,
            "trade-accepted",
            `Trade with ${counterpart.name} completed`,
            trade.id,
            { revision: trade.revision },
          );
        }
      } else {
        trade.status = "declined";
        await tx.query(
          "UPDATE spunk.trades SET status='declined',updated_at=now(),completed_at=now() WHERE id=$1",
          [trade.id],
        );
        await notify(
          tx,
          otherId,
          "trade-declined",
          `${actor.name} declined your trade offer`,
          trade.id,
          { revision: trade.revision },
        );
      }
      await tx.query(
        "INSERT INTO spunk.trade_events(id,trade_id,actor_id,kind,revision,proposal) VALUES($1,$2,$3,$4,$5,$6::text::jsonb)",
        [
          result.id,
          trade.id,
          actorId,
          a.action === "offer"
            ? "offered"
            : a.action === "counter"
              ? "countered"
              : a.action === "accept"
                ? "accepted"
                : "declined",
          trade.revision,
          JSON.stringify(trade.proposal),
        ],
      );
      result.tradeId = trade.id;
      result.status = trade.status;
      result.revision = trade.revision;
    }
    result.balance = actor.balance;
    await tx.query(
      "INSERT INTO spunk.requests(player_id,key,fingerprint,response) VALUES($1,$2,$3,$4::text::jsonb)",
      [actorId, a.key, fingerprint, JSON.stringify(result)],
    );
    return result;
  });
}
export async function tradeInventory(
  db: DB,
  playerId: string,
): Promise<TradeInventory> {
  const [row] = await db.query<{ data: TradeInventory }>(
    `WITH stacks AS (
    SELECT item_id,'RAW'::text effect,quantity FROM spunk.player_items WHERE player_id=$1
    UNION ALL SELECT item_id,effect,quantity FROM spunk.card_effects WHERE player_id=$1)
    SELECT jsonb_build_object('player',jsonb_build_object('id',p.id,'name',p.name,'balance',p.balance),
      'cards',(SELECT COALESCE(jsonb_agg(s),'[]') FROM stacks s),
      'items',(SELECT COALESCE(jsonb_agg(i),'[]') FROM spunk.items i WHERE id IN (SELECT item_id FROM stacks))) data
    FROM spunk.players p WHERE p.id=$1`,
    [playerId],
  );
  if (!row) throw new GameError("Player not found.", 404);
  return row.data;
}
export async function tradeInbox(
  db: DB,
  playerId: string,
  page = 0,
): Promise<TradeInbox> {
  const [count] = await db.query<{ total: number }>(
    "SELECT count(*)::int total FROM spunk.trades WHERE party_a=$1 OR party_b=$1",
    [playerId],
  );
  const trades = await db.query<Trade>(
    `SELECT t.*,a.name a_name,b.name b_name FROM spunk.trades t JOIN spunk.players a ON a.id=t.party_a JOIN spunk.players b ON b.id=t.party_b
    WHERE party_a=$1 OR party_b=$1 ORDER BY (status='pending') DESC,updated_at DESC,id LIMIT 30 OFFSET $2`,
    [playerId, page * 30],
  );
  const ids = new Set(
    trades.flatMap((t) =>
      [...t.proposal.a.cards, ...t.proposal.b.cards].map((c) => c.item_id),
    ),
  );
  const catalog = await readCatalog(db);
  return {
    trades,
    items: catalog.items.filter((i) => ids.has(i.id)),
    total: count.total,
    page,
  };
}
export async function tradeDetail(db: DB, playerId: string, tradeId: string) {
  const [trade] = await db.query<Trade>(
    "SELECT t.*,a.name a_name,b.name b_name FROM spunk.trades t JOIN spunk.players a ON a.id=t.party_a JOIN spunk.players b ON b.id=t.party_b WHERE t.id=$1 AND (party_a=$2 OR party_b=$2)",
    [tradeId, playerId],
  );
  if (!trade) throw new GameError("Trade not found.", 404);
  const ids = new Set(
    [...trade.proposal.a.cards, ...trade.proposal.b.cards].map(
      (c) => c.item_id,
    ),
  );
  const c = await readCatalog(db);
  return { trade, items: c.items.filter((i) => ids.has(i.id)) };
}
export async function notifications(
  db: DB,
  playerId: string,
  page = 0,
): Promise<NotificationInbox> {
  const [row] = await db.query<{ data: NotificationInbox }>(
    `SELECT jsonb_build_object(
    'unread',(SELECT count(*)::int FROM spunk.notifications WHERE player_id=$1 AND read_at IS NULL),
    'notifications',(SELECT COALESCE(jsonb_agg(n ORDER BY created_at DESC,id),'[]') FROM (SELECT id,kind,title,trade_id,battle_id,detail,created_at,read_at FROM spunk.notifications WHERE player_id=$1 ORDER BY created_at DESC,id LIMIT 30 OFFSET $2)n)) data`,
    [playerId, page * 30],
  );
  return row.data;
}
export async function readNotifications(
  db: DB,
  playerId: string,
  input: unknown,
) {
  const { ids } = z.object({ ids: z.array(id).max(30) }).parse(input);
  // Each UPDATE is idempotent and restricted to the signed-in recipient.
  for (const notificationId of ids)
    await db.query(
      "UPDATE spunk.notifications SET read_at=COALESCE(read_at,now()) WHERE id=$1 AND player_id=$2",
      [notificationId, playerId],
    );
  return { ok: true };
}
