import sharp from "sharp";
import { mkdir,writeFile } from "node:fs/promises";
import { epipenSource } from "../lib/epipen-catalog";
await mkdir("public/assets/items",{recursive:true});
for(const i of epipenSource) await sharp("C:/Users/jaden/OneDrive/Desktop/EpiPen Case/"+i.file).rotate().resize(800,800,{fit:"inside",withoutEnlargement:true}).webp({quality:84}).toFile("public/assets/items/"+i.id+".webp");
await sharp("C:/Users/jaden/.codex/generated_images/01a0a07f-ff67-7833-a796-8cd2dbf66dbf/exec-3824ea4c-b584-4403-8010-1b57c61e5076.png").resize(1200,800,{fit:"inside"}).webp({quality:88}).toFile("public/cases/epipen-case.webp");
const q=(s:string)=>"'"+s.replaceAll("'","''")+"'";
const sql=`-- EpiPen: 1,000 SN. Each mystery 0.2%; Greg 97.6%. Preserves all existing progress.
BEGIN;
ALTER TABLE spunk.items ADD COLUMN IF NOT EXISTS value integer;
ALTER TABLE spunk.items ADD COLUMN IF NOT EXISTS mystery boolean NOT NULL DEFAULT false;
ALTER TABLE spunk.cases ADD COLUMN IF NOT EXISTS sort_order integer;
INSERT INTO spunk.items(id,name,rarity,image,value,mystery) VALUES
${epipenSource.map(i=>`(${[i.id,i.name,i.mystery?'MYTHIC':'COMMON','/assets/items/'+i.id+'.webp'].map(q).join(',')},${i.value},${i.mystery})`).join(',\n')}
ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,rarity=EXCLUDED.rarity,image=EXCLUDED.image,value=EXCLUDED.value,mystery=EXCLUDED.mystery;
INSERT INTO spunk.cases(id,name,price,enabled,sort_order) VALUES('epipen','EPIPEN CASE',1000,true,5) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,price=EXCLUDED.price,sort_order=EXCLUDED.sort_order;
INSERT INTO spunk.case_items(case_id,item_id,weight) VALUES
${epipenSource.map(i=>`('epipen',${q(i.id)},${i.weight})`).join(',\n')}
ON CONFLICT(case_id,item_id) DO UPDATE SET weight=EXCLUDED.weight;
COMMIT;
`;
await writeFile("database/UPDATE-EPIPEN.sql",sql);
console.log("13 photos and EpiPen crate ready",await sharp("public/cases/epipen-case.webp").metadata());
