import { writeFile } from "node:fs/promises";
import { seedCatalog as c } from "../lib/catalog";
const q = (v: unknown) =>
  typeof v === "number"
    ? String(v)
    : typeof v === "boolean"
      ? String(v)
      : "'" + String(v).replaceAll("'", "''") + "'";
const lines = [
  "-- Initial seed only. Safe to rerun: never resets player progress or edited settings.",
  "DO $seed$ BEGIN",
  "IF EXISTS (SELECT 1 FROM spunk.settings WHERE id=1) THEN RETURN; END IF;",
];
const insert = (table: string, values: unknown[]) =>
  lines.push(`INSERT INTO spunk.${table} VALUES (${values.map(q).join(",")});`);
for (const i of c.items) insert("items", [i.id, i.name, i.rarity, i.image]);
for (const ca of c.cases) {
  insert("cases", [ca.id, ca.name, ca.price, ca.enabled]);
  for (const w of ca.weights) insert("case_items", [ca.id, w.itemId, w.weight]);
}
for (const l of c.lines) {
  insert("lines", [l.id, l.name, l.reward]);
  for (const id of l.itemIds) insert("line_items", [l.id, id]);
}
lines.push(
  `INSERT INTO spunk.settings(id,value) VALUES(1,${q(JSON.stringify(c.settings))}::jsonb);`,
  "END $seed$;",
);
await writeFile("database/seed.sql", lines.join("\n") + "\n");
