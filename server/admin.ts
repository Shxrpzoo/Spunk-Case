import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { DB } from "./db";
import type { Player } from "@/lib/types";
import { readCatalog, writeCatalog } from "./catalog";
import { awardCompletions, changeBalance, getState, takeCard } from "./game";
import { digest, GameError } from "./security";
async function overview(db: DB) {
  const players = await db.query(
    `SELECT p.id,p.name,p.balance,p.daily_at,p.free_at,p.created_at,(SELECT count(*)::int FROM spunk.case_openings o WHERE o.player_id=p.id) AS openings,(SELECT count(*)::int FROM spunk.player_items i WHERE i.player_id=p.id) AS items FROM spunk.players p ORDER BY p.name`,
  );
  const [stats] = await db.query(
    `SELECT (SELECT count(*)::int FROM spunk.players) AS players,(SELECT count(*)::int FROM spunk.case_openings) AS cases,(SELECT COALESCE(sum(balance),0)::bigint FROM spunk.players) AS circulation,(SELECT COALESCE(sum(amount),0)::bigint FROM spunk.ledger WHERE amount>0) AS awarded,(SELECT COALESCE(-sum(amount),0)::bigint FROM spunk.ledger WHERE amount<0) AS removed,(SELECT count(*)::int FROM spunk.case_openings o JOIN spunk.items i ON i.id=o.item_id WHERE rarity='MYTHIC') AS mythics,(SELECT count(*)::int FROM spunk.case_openings o JOIN spunk.items i ON i.id=o.item_id WHERE rarity='LEGENDARY') AS legendaries,(SELECT count(*)::int FROM spunk.history WHERE kind='upgrade') AS upgrades,(SELECT count(*)::int FROM spunk.history WHERE kind='coin') AS flips,(SELECT COALESCE(max((detail->>'payout')::bigint),0) FROM spunk.history) AS largest_win`,
  );
  const popular = await db.query(
    `SELECT i.name,count(*)::int AS count FROM spunk.case_openings o JOIN spunk.items i ON i.id=o.item_id GROUP BY i.name ORDER BY count(*) DESC LIMIT 1`,
  );
  const rarest = await db.query(
    `SELECT i.name,i.rarity,min(w.weight/t.total) AS probability FROM spunk.case_openings o JOIN spunk.items i ON i.id=o.item_id LEFT JOIN spunk.case_items w ON w.case_id=o.case_id AND w.item_id=o.item_id LEFT JOIN (SELECT case_id,sum(weight) AS total FROM spunk.case_items GROUP BY case_id) t ON t.case_id=w.case_id GROUP BY i.id,i.name,i.rarity ORDER BY probability ASC NULLS LAST LIMIT 1`,
  );
  const audit = await db.query(
    "SELECT * FROM spunk.admin_audit ORDER BY created_at DESC LIMIT 100",
  );
  const catalog = await readCatalog(db);
  const [version] = await db.query<{ version: number }>(
    "SELECT version FROM spunk.settings WHERE id=1",
  );
  return {
    players,
    stats,
    popular: popular[0] ?? null,
    rarest: rarest[0] ?? null,
    audit,
    catalog,
    version: version.version,
  };
}
export async function adminOverview(db: DB) {
  return db.transaction(async (tx) => {
    await tx.query("SELECT id FROM spunk.settings WHERE id=1 FOR SHARE");
    return overview(tx);
  });
}
const mutation = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("catalog"),
    key: z.string().uuid(),
    version: z.number().int(),
    catalog: z.unknown(),
  }),
  z.object({
    action: z.enum([
      "add",
      "remove",
      "set",
      "give-item",
      "remove-item",
      "reset-player",
      "reset-daily",
      "reset-collection",
      "reset-passcode",
    ]),
    key: z.string().uuid(),
    playerId: z.string().uuid(),
    amount: z.number().int().min(0).max(100000000).optional(),
    itemId: z.string().max(80).optional(),
    confirmation: z.string().optional(),
    passcode: z.string().min(6).max(128).optional(),
  }),
]);
export async function adminMutate(db: DB, input: unknown) {
  const a = mutation.parse(input),
    fingerprint = digest(JSON.stringify(a));
  return db.transaction(async (tx) => {
    // Serialize admin edits without reversing player/catalog lock order.
    await tx.query("SELECT pg_advisory_xact_lock(761912)");
    const [old] = await tx.query<{ fingerprint: string; response: unknown }>(
      "SELECT * FROM spunk.admin_requests WHERE key=$1",
      [a.key],
    );
    if (old) {
      if (old.fingerprint !== fingerprint)
        throw new GameError("Request key conflict.", 409);
      return old.response;
    }
    if (a.action === "catalog") {
      const [row] = await tx.query<{ version: number }>(
        "SELECT version FROM spunk.settings WHERE id=1 FOR UPDATE",
      );
      if (row.version !== a.version)
        throw new GameError(
          "Another admin changed settings. Reload before saving.",
          409,
        );
      await writeCatalog(tx, a.catalog);
    } else {
      const [p] = await tx.query<Player>(
        "SELECT * FROM spunk.players WHERE id=$1 FOR UPDATE",
        [a.playerId],
      );
      if (!p) throw new GameError("Player not found.", 404);
      p.balance = Number(p.balance);
      const ref = randomUUID();
      if (
        ["reset-player", "reset-collection"].includes(a.action) &&
        a.confirmation !== "RESET"
      )
        throw new GameError("Type RESET to confirm.");
      if (a.action === "add" || a.action === "remove" || a.action === "set") {
        if (a.amount === undefined) throw new GameError("Amount is required.");
        await changeBalance(
          tx,
          p,
          a.action === "add"
            ? a.amount
            : a.action === "remove"
              ? -a.amount
              : a.amount - p.balance,
          "ADMIN_ADJUSTMENT",
          ref,
        );
      }
      if (a.action === "give-item" || a.action === "remove-item") {
        if (
          !a.itemId ||
          !(
            await tx.query("SELECT id FROM spunk.items WHERE id=$1", [a.itemId])
          ).length
        )
          throw new GameError("Choose a valid item.");
        if (a.action === "give-item") {
          await tx.query(
            "INSERT INTO spunk.player_items(player_id,item_id,quantity) VALUES($1,$2,1) ON CONFLICT(player_id,item_id) DO UPDATE SET quantity=spunk.player_items.quantity+1,last_obtained_at=now()",
            [p.id, a.itemId],
          );
          await tx.query("SELECT id FROM spunk.settings WHERE id=1 FOR SHARE");
          await awardCompletions(tx, p, await readCatalog(tx), ref, []);
        } else {
          const [raw] = await tx.query(
            "SELECT item_id FROM spunk.player_items WHERE player_id=$1 AND item_id=$2",
            [p.id, a.itemId],
          );
          if (raw) await takeCard(tx, p.id, a.itemId, "RAW");
          else {
            const [copy] = await tx.query<{
              effect: import("@/lib/catalog").Effect;
            }>(
              "SELECT effect FROM spunk.card_effects WHERE player_id=$1 AND item_id=$2 ORDER BY effect LIMIT 1",
              [p.id, a.itemId],
            );
            if (copy) await takeCard(tx, p.id, a.itemId, copy.effect);
          }
        }
      }
      if (a.action === "reset-daily")
        await tx.query("UPDATE spunk.players SET daily_at=NULL WHERE id=$1", [
          p.id,
        ]);
      if (a.action === "reset-player" || a.action === "reset-collection") {
        await tx.query("DELETE FROM spunk.card_effects WHERE player_id=$1", [
          p.id,
        ]);
        await tx.query("DELETE FROM spunk.discoveries WHERE player_id=$1", [
          p.id,
        ]);
        await tx.query("DELETE FROM spunk.player_items WHERE player_id=$1", [
          p.id,
        ]);
      }
      if (a.action === "reset-player") {
        await tx.query("SELECT id FROM spunk.settings WHERE id=1 FOR SHARE");
        await changeBalance(
          tx,
          p,
          (await readCatalog(tx)).settings.startingBalance - p.balance,
          "ADMIN_ADJUSTMENT",
          ref,
        );
        await tx.query(
          "UPDATE spunk.players SET daily_at=NULL,free_at=NULL WHERE id=$1",
          [p.id],
        );
      }
      if (a.action === "reset-passcode") {
        if (!a.passcode) throw new GameError("New passcode is required.");
        const { hashPassword } = await import("./security");
        await tx.query("UPDATE spunk.players SET pin_hash=$2 WHERE id=$1", [
          p.id,
          await hashPassword(a.passcode),
        ]);
        await tx.query("DELETE FROM spunk.sessions WHERE player_id=$1", [p.id]);
      }
      await tx.query(
        "INSERT INTO spunk.history(id,player_id,kind,amount,detail) VALUES($1,$2,'admin',$3,$4::jsonb)",
        [
          ref,
          p.id,
          Number(
            (
              await tx.query<{ n: number }>(
                "SELECT COALESCE(sum(amount),0)::bigint n FROM spunk.ledger WHERE reference_id=$1",
                [ref],
              )
            )[0].n,
          ),
          JSON.stringify({ action: a.action, itemId: a.itemId }),
        ],
      );
    }
    const safe = {
      ...a,
      ...("passcode" in a ? { passcode: "[redacted]" } : {}),
    };
    await tx.query(
      "INSERT INTO spunk.admin_audit(id,action,detail) VALUES($1,$2,$3::jsonb)",
      [randomUUID(), a.action, JSON.stringify(safe)],
    );
    const response = { ok: true };
    await tx.query("INSERT INTO spunk.admin_requests VALUES($1,$2,$3::jsonb)", [
      a.key,
      fingerprint,
      JSON.stringify(response),
    ]);
    return response;
  });
}
export async function inspectPlayer(db: DB, id: string) {
  z.string().uuid().parse(id);
  return {
    state: await getState(db, id),
    ledger: await db.query(
      "SELECT * FROM spunk.ledger WHERE player_id=$1 ORDER BY created_at DESC LIMIT 500",
      [id],
    ),
  };
}
