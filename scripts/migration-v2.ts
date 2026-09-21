import { readFile, writeFile } from "node:fs/promises";
import { seedCatalog as c } from "../lib/catalog";
const q = (v: unknown) =>
  typeof v === "number" || typeof v === "boolean"
    ? String(v)
    : "'" + String(v).replaceAll("'", "''") + "'";
const sql = [
  `-- Run the complete contents once in Supabase SQL Editor BEFORE deploying v2.
-- Existing players, balances, passcodes, sessions, card counts and awards are preserved.
BEGIN;
CREATE TABLE IF NOT EXISTS spunk.migrations (id text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE spunk.migrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON spunk.migrations FROM PUBLIC;
SELECT pg_advisory_xact_lock(761912);
DO $v2$ BEGIN
IF EXISTS(SELECT 1 FROM spunk.migrations WHERE id='002-ash-effects') THEN RETURN; END IF;
-- Prevent a game from observing a half-updated catalog.
PERFORM id FROM spunk.settings WHERE id=1 FOR UPDATE;`,
  await readFile("database/cards.sql", "utf8"),
];
for (const i of c.items.filter((i) => !i.id.startsWith("satchel-")))
  sql.push(
    `INSERT INTO spunk.items(id,name,rarity,image) VALUES(${[i.id, i.name, i.rarity, i.image].map(q)}) ON CONFLICT(id) DO UPDATE SET image=EXCLUDED.image;`,
  );
for (const ca of c.cases.filter((ca) => ca.id !== "satchel")) {
  sql.push(
    `INSERT INTO spunk.cases(id,name,price,enabled) VALUES(${[ca.id, ca.name, ca.price, true].map(q)}) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,price=EXCLUDED.price,enabled=true;`,
  );
  sql.push(`DELETE FROM spunk.case_items WHERE case_id=${q(ca.id)};`);
  for (const w of ca.weights)
    sql.push(
      `INSERT INTO spunk.case_items(case_id,item_id,weight) VALUES(${[ca.id, w.itemId, w.weight].map(q)});`,
    );
}
sql.push(`UPDATE spunk.settings SET version=version+1 WHERE id=1;
INSERT INTO spunk.migrations(id) VALUES('002-ash-effects');
END $v2$;
COMMIT;`);
const extra = [
  `BEGIN;
SELECT pg_advisory_xact_lock(761912);
DO $satchel$ BEGIN
IF EXISTS(SELECT 1 FROM spunk.migrations WHERE id='003-satchel') THEN RETURN; END IF;
PERFORM id FROM spunk.settings WHERE id=1 FOR UPDATE;`,
];
for (const i of c.items.filter((i) => i.id.startsWith("satchel-")))
  extra.push(
    `INSERT INTO spunk.items(id,name,rarity,image) VALUES(${[i.id, i.name, i.rarity, i.image].map(q)}) ON CONFLICT(id) DO NOTHING;`,
  );
const satchel = c.cases.find((ca) => ca.id === "satchel")!;
extra.push(
  `INSERT INTO spunk.cases(id,name,price,enabled) VALUES(${[satchel.id, satchel.name, satchel.price, true].map(q)}) ON CONFLICT(id) DO NOTHING;`,
);
for (const w of satchel.weights)
  extra.push(
    `INSERT INTO spunk.case_items(case_id,item_id,weight) VALUES(${[satchel.id, w.itemId, w.weight].map(q)}) ON CONFLICT(case_id,item_id) DO NOTHING;`,
  );
extra.push(`UPDATE spunk.settings SET version=version+1 WHERE id=1;
INSERT INTO spunk.migrations(id) VALUES('003-satchel');
END $satchel$;
COMMIT;`);
await writeFile("database/UPDATE-V2.sql", [...sql, ...extra].join("\n") + "\n");
