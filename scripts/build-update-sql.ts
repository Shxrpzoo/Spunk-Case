import {readFile,writeFile} from "node:fs/promises";
const files=["UPDATE-V2.sql","UPDATE-GOON.sql","UPDATE-CASE-ORDER.sql","UPDATE-TRADING.sql","UPDATE-EPIPEN.sql","UPDATE-BATTLES.sql","UPDATE-AUTO-ROLL.sql"];
let sql="-- SEPTEMBER UPDATE: copy ALL contents into Supabase SQL Editor and Run before uploading the website.\n-- Adds EpiPen, Battles, Trading and Auto Roll. Includes earlier prerequisites.\n-- Rerunnable. Existing players, passwords, balances, cards and saved results are preserved.\nBEGIN;\nSELECT pg_advisory_xact_lock(761912);\nSELECT id FROM spunk.settings WHERE id=1 FOR UPDATE;\n";
for(const file of files)sql+="\n-- ===== "+file+" =====\n"+(await readFile("database/"+file,"utf8")).replace(/^\s*(BEGIN;|COMMIT;)\s*$/gm,"")+"\n";
sql+="COMMIT;\nSELECT c.id,c.name,c.price,count(w.item_id)::int AS cards,round(sum(w.weight)::numeric,3) AS total_weight FROM spunk.cases c JOIN spunk.case_items w ON w.case_id=c.id GROUP BY c.id,c.name,c.price ORDER BY c.id;\n";
await writeFile("database/UPDATE-SEPTEMBER.sql",sql);
console.log("Combined progress-preserving migration written.");
