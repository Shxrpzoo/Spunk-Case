import type { DB } from "./db";
import type { Leaderboards } from "@/lib/types";
import { cardValues, effectMultipliers } from "@/lib/catalog";
export async function leaderboard(db: DB): Promise<Leaderboards> {
  // Discoveries and history survive sales; only currently owned stacks qualify.
  // These parameters are already JSON strings. Bind them as text before casting
  // so Postgres.js does not JSON-encode them a second time in production.
  const [row] = await db.query<{ boards: Leaderboards }>(
    `WITH cards AS (
 SELECT player_id,item_id,'RAW'::text effect FROM spunk.player_items WHERE quantity > 0
 UNION ALL SELECT player_id,item_id,effect FROM spunk.card_effects WHERE quantity > 0),
 valued AS (SELECT c.*,($1::text::jsonb->>i.rarity)::int * ($2::text::jsonb->>c.effect)::int value FROM cards c JOIN spunk.items i ON i.id=c.item_id),
 best AS (SELECT DISTINCT ON(player_id) player_id,item_id,effect,value
          FROM valued WHERE value IS NOT NULL ORDER BY player_id,value DESC,item_id,effect),
 openings AS (SELECT player_id,count(*)::int count FROM spunk.case_openings GROUP BY player_id),
 stats AS (SELECT p.id,p.name,p.balance,coalesce(o.count,0) cases,coalesce(b.value,0) card_value,b.item_id,b.effect FROM spunk.players p LEFT JOIN best b ON b.player_id=p.id LEFT JOIN openings o ON o.player_id=p.id)
 SELECT jsonb_build_object(
 'cards',(SELECT coalesce(jsonb_agg(x ORDER BY card_value DESC,cases DESC,name,id),'[]') FROM (SELECT * FROM stats ORDER BY card_value DESC,cases DESC,name,id LIMIT 100)x),
 'nuggets',(SELECT coalesce(jsonb_agg(x ORDER BY balance DESC,cases DESC,name,id),'[]') FROM (SELECT * FROM stats ORDER BY balance DESC,cases DESC,name,id LIMIT 100)x),
 'cases',(SELECT coalesce(jsonb_agg(x ORDER BY cases DESC,balance DESC,name,id),'[]') FROM (SELECT * FROM stats ORDER BY cases DESC,balance DESC,name,id LIMIT 100)x)) boards`,
    [JSON.stringify(cardValues), JSON.stringify(effectMultipliers)],
  );
  return row.boards;
}
