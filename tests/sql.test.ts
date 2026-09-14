import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('deployable SQL schema and seed can be rerun without resetting saved progress', async()=>{
 const pg=new PGlite();
 try{
  const schema=await readFile('database/schema.sql','utf8'),seed=await readFile('database/seed.sql','utf8');
  await pg.exec(schema);await pg.exec(seed);
  await pg.query("INSERT INTO spunk.players(id,name,pin_hash,balance) VALUES('preserve','Preserve Test','test-only',12345)");
  await pg.query("UPDATE spunk.settings SET value=jsonb_set(value,'{dailyReward}','999'::jsonb) WHERE id=1");
  await pg.exec(schema);await pg.exec(seed);
  assert.equal((await pg.query<{n:number}>('SELECT count(*)::int AS n FROM spunk.items')).rows[0].n,22);
  assert.equal(Number((await pg.query<{balance:number}>("SELECT balance FROM spunk.players WHERE id='preserve'")).rows[0].balance),12345);
  assert.equal((await pg.query<{n:number}>("SELECT (value->>'dailyReward')::int AS n FROM spunk.settings WHERE id=1")).rows[0].n,999);
 }finally{await pg.close();}
});
