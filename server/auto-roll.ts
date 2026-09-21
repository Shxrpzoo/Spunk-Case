import type { DB } from "./db";
import { GameError } from "./security";
import { readCatalog } from "./catalog";
import type { AutoBatch } from "@/lib/auto-roll";
export async function autoBatch(
  db: DB,
  playerId: string,
  batchId?: string,
): Promise<AutoBatch | null> {
  const [batch] = await db.query<{ id: string }>(
    batchId
      ? "SELECT id FROM spunk.auto_batches WHERE player_id=$1 AND id=$2"
      : "SELECT id FROM spunk.auto_batches WHERE player_id=$1 ORDER BY created_at DESC,id LIMIT 1",
    batchId ? [playerId, batchId] : [playerId],
  );
  if (!batch) return null;
  const rows = await db.query<{
    opening_id: string;
    item_id: string;
    consumed_at: string | null;
  }>(
    "SELECT opening_id,item_id,consumed_at FROM spunk.auto_receipts WHERE batch_id=$1 ORDER BY created_at,opening_id",
    [batch.id],
  );
  const c = await readCatalog(db);
  return {
    id: batch.id,
    results: rows.map((r) => ({
      id: r.opening_id,
      item: c.items.find((i) => i.id === r.item_id)!,
      available: !r.consumed_at,
    })),
  };
}
export async function ensureBatch(db: DB, playerId: string, batchId: string) {
  await db.query(
    "INSERT INTO spunk.auto_batches(id,player_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
    [batchId, playerId],
  );
  const [b] = await db.query<{ player_id: string }>(
    "SELECT player_id FROM spunk.auto_batches WHERE id=$1",
    [batchId],
  );
  if (b.player_id !== playerId)
    throw new GameError("Batch belongs to another player.", 403);
  const [n] = await db.query<{ count: number }>(
    "SELECT count(*)::int count FROM spunk.auto_receipts WHERE batch_id=$1",
    [batchId],
  );
  if (n.count >= 50) throw new GameError("This batch has reached 50 rolls.");
}
// Raw cards are interchangeable. Manual sales, trades and upgrades consume recent
// auto-roll receipts first, so a later batch sale cannot consume older inventory.
export async function consumeAutoReceipt(
  db: DB,
  playerId: string,
  itemId: string,
  receiptId?: string,
) {
  const [table] = await db.query<{ name: string | null }>(
    "SELECT to_regclass('spunk.auto_receipts')::text name",
  );
  if (!table.name) return;
  if (receiptId) {
    const rows = await db.query(
      "UPDATE spunk.auto_receipts SET consumed_at=now() WHERE opening_id=$1 AND player_id=$2 AND item_id=$3 AND consumed_at IS NULL RETURNING opening_id",
      [receiptId, playerId, itemId],
    );
    if (!rows.length)
      throw new GameError("This batch card is no longer available.", 409);
  } else
    await db.query(
      "UPDATE spunk.auto_receipts SET consumed_at=now() WHERE opening_id=(SELECT opening_id FROM spunk.auto_receipts WHERE player_id=$1 AND item_id=$2 AND consumed_at IS NULL ORDER BY created_at DESC,opening_id DESC LIMIT 1)",
      [playerId, itemId],
    );
}
