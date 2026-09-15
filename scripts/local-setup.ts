import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { seedCatalog } from "../lib/catalog";
import { writeCatalog } from "../server/catalog";
import type { DB } from "../server/db";
const pg = new PGlite(".local-db");
await pg.exec(await readFile("database/schema.sql", "utf8"));
const db: DB = {
  query: async <T>(q: string, p: unknown[] = []) =>
    (await pg.query<T>(q, p)).rows,
  transaction: async (fn) => fn(db),
};
if (!(await db.query("SELECT id FROM spunk.settings")).length)
  await writeCatalog(db, seedCatalog);
await pg.exec(await readFile("database/UPDATE-V2.sql", "utf8"));
await pg.close();
console.log("Development database ready.");
