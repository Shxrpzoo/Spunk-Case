import { readFile } from "node:fs/promises";
import { getDB } from "../server/db";
import { writeCatalog } from "../server/catalog";
import { seedCatalog } from "../lib/catalog";
import { loadEnvFile } from "node:process";
try {
  loadEnvFile(".env.local");
} catch {}
const db = await getDB();
const sql = await readFile("database/schema.sql", "utf8");
// postgres.unsafe supports the complete migration; PGlite needs exec for multi-statements.
if (process.env.USE_LOCAL_DB === "true")
  throw new Error("Use scripts/local-setup.ts for the development database.");
await db.query(sql);
await db.transaction(async (tx) => {
  const old = await tx.query("SELECT id FROM spunk.settings WHERE id=1");
  if (!old.length) await writeCatalog(tx, seedCatalog);
});
await db.query(await readFile("database/UPDATE-V2.sql", "utf8"));
await db.query(await readFile("database/UPDATE-GOON.sql", "utf8"));
console.log("Database ready. Existing progress and configuration preserved.");
process.exit(0);
