import { z } from "zod";
import {
  rarities,
  type Catalog,
  type Item,
  type Settings,
} from "@/lib/catalog";
import type { DB } from "./db";
import { GameError } from "./security";
const id = z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/);
const amount = z.number().int().min(0).max(100000000);
const settings = z.object({
  startingBalance: amount,
  dailyReward: amount,
  firstCaseReward: amount,
  caseReward: amount,
  duplicateReward: amount,
  freeReward: amount,
  rarityRewards: z.record(z.enum(rarities), amount),
  upgradeChances: z.object({
    "1.5": z.number().min(0.01).max(99.99),
    "2": z.number().min(0.01).max(99.99),
    "5": z.number().min(0.01).max(99.99),
    "10": z.number().min(0.01).max(99.99),
    "20": z.number().min(0.01).max(99.99),
  }),
});
export const catalogSchema = z
  .object({
    items: z
      .array(
        z.object({
          id,
          name: z.string().min(1).max(80),
          rarity: z.enum(rarities),
          image: z
            .string()
            .max(300)
            .regex(
              /^\/assets\/items\/[a-zA-Z0-9% _().-]+\.(png|jpg|jpeg|webp)$/i,
            ),
        }),
      )
      .min(1)
      .max(500),
    cases: z
      .array(
        z.object({
          id,
          name: z.string().min(1).max(80),
          price: amount.min(1),
          enabled: z.boolean(),
          weights: z
            .array(
              z.object({
                itemId: id,
                weight: z.number().min(0.000001).max(1000000),
              }),
            )
            .min(1)
            .max(500),
        }),
      )
      .min(1)
      .max(50),
    lines: z
      .array(
        z.object({
          id,
          name: z.string().min(1).max(80),
          reward: amount,
          itemIds: z.array(id).min(1).max(100),
        }),
      )
      .max(100),
    settings,
  })
  .superRefine((c, ctx) => {
    const err = (message: string) => ctx.addIssue({ code: "custom", message });
    for (const a of [c.items, c.cases, c.lines])
      if (new Set(a.map((x) => x.id)).size !== a.length)
        err("IDs must be unique.");
    const ids = new Set(c.items.map((x) => x.id));
    for (const ca of c.cases) {
      const list = ca.weights.map((w) => w.itemId);
      if (new Set(list).size !== list.length || list.some((i) => !ids.has(i)))
        err("Case items must be unique existing items.");
    }
    for (const line of c.lines)
      if (
        new Set(line.itemIds).size !== line.itemIds.length ||
        line.itemIds.some((i) => !ids.has(i))
      )
        err("Line items must be unique existing items.");
    const p = (["1.5", "2", "5", "10", "20"] as const).map(
      (m) => c.settings.upgradeChances[m],
    );
    if (p.some((v, i) => i > 0 && v > p[i - 1]))
      err("Higher multipliers must not be easier.");
  });
export async function readCatalog(db: DB): Promise<Catalog> {
  const items = await db.query<Item>("SELECT * FROM spunk.items ORDER BY id");
  const cases = await db.query<{
    id: string;
    name: string;
    price: number;
    enabled: boolean;
  }>("SELECT * FROM spunk.cases ORDER BY id");
  const weights = await db.query<{
    case_id: string;
    item_id: string;
    weight: number;
  }>("SELECT * FROM spunk.case_items");
  const lines = await db.query<{ id: string; name: string; reward: number }>(
    "SELECT * FROM spunk.lines ORDER BY id",
  );
  const members = await db.query<{ line_id: string; item_id: string }>(
    "SELECT * FROM spunk.line_items",
  );
  const [row] = await db.query<{ value: Settings }>(
    "SELECT value FROM spunk.settings WHERE id=1",
  );
  if (!row) throw new Error("SETUP_REQUIRED");
  return {
    items,
    cases: cases.map((c) => ({
      ...c,
      weights: weights
        .filter((w) => w.case_id === c.id)
        .map((w) => ({ itemId: w.item_id, weight: w.weight })),
    })),
    lines: lines.map((l) => ({
      ...l,
      itemIds: members.filter((m) => m.line_id === l.id).map((m) => m.item_id),
    })),
    settings: row.value,
  };
}
export async function writeCatalog(db: DB, input: unknown) {
  const c = catalogSchema.parse(input);
  const old = await db.query<{ id: string }>("SELECT id FROM spunk.items");
  if (old.some((i) => !c.items.some((n) => n.id === i.id)))
    throw new GameError(
      "Keep existing item IDs to preserve collections. Remove items from case weights instead.",
    );
  const oldCases = await db.query<{ id: string }>("SELECT id FROM spunk.cases");
  if (oldCases.some((i) => !c.cases.some((n) => n.id === i.id)))
    throw new GameError("Keep existing case IDs; disable a case instead.");
  const oldLines = await db.query<{ id: string }>("SELECT id FROM spunk.lines");
  if (oldLines.some((i) => !c.lines.some((n) => n.id === i.id)))
    throw new GameError(
      "Keep existing line IDs to preserve completion records.",
    );
  for (const i of c.items)
    await db.query(
      "INSERT INTO spunk.items VALUES($1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET name=$2,rarity=$3,image=$4",
      [i.id, i.name, i.rarity, i.image],
    );
  for (const ca of c.cases) {
    await db.query(
      "INSERT INTO spunk.cases VALUES($1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET name=$2,price=$3,enabled=$4",
      [ca.id, ca.name, ca.price, ca.enabled],
    );
    await db.query("DELETE FROM spunk.case_items WHERE case_id=$1", [ca.id]);
    for (const w of ca.weights)
      await db.query("INSERT INTO spunk.case_items VALUES($1,$2,$3)", [
        ca.id,
        w.itemId,
        w.weight,
      ]);
  }
  for (const l of c.lines) {
    await db.query(
      "INSERT INTO spunk.lines VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET name=$2,reward=$3",
      [l.id, l.name, l.reward],
    );
    await db.query("DELETE FROM spunk.line_items WHERE line_id=$1", [l.id]);
    for (const i of l.itemIds)
      await db.query("INSERT INTO spunk.line_items VALUES($1,$2)", [l.id, i]);
  }
  await db.query(
    "INSERT INTO spunk.settings(id,value) VALUES(1,$1::jsonb) ON CONFLICT(id) DO UPDATE SET value=$1::jsonb,version=spunk.settings.version+1",
    [JSON.stringify(c.settings)],
  );
  return c;
}
