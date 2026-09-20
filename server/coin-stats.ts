import type { DB } from "./db";
import type { CoinStats } from "@/lib/types";
export async function coinStats(db: DB): Promise<CoinStats> {
  // The ledger is authoritative and also works for old games whose history
  // detail was double-encoded JSON. Winnings below mean profit, excluding stake.
  const [row] = await db.query<{ stats: CoinStats }>(`
    WITH flips AS (
      SELECT l.reference_id id,l.player_id,
        -SUM(l.amount) FILTER(WHERE l.type='COIN_FLIP_WAGER') wager,
        COALESCE(SUM(l.amount) FILTER(WHERE l.type='COIN_FLIP_WIN'),0) payout,
        MIN(l.created_at) created_at
      FROM spunk.ledger l WHERE l.type IN ('COIN_FLIP_WAGER','COIN_FLIP_WIN','COIN_FLIP_LOSS')
      GROUP BY l.reference_id,l.player_id
      HAVING COUNT(*) FILTER(WHERE l.type='COIN_FLIP_WAGER') > 0
    ), results AS (SELECT f.*,p.name,payout-wager net,payout>0 won FROM flips f JOIN spunk.players p ON p.id=f.player_id),
    players AS (
      SELECT player_id id,name,COUNT(*)::int flips,COUNT(*) FILTER(WHERE won)::int wins,COUNT(*) FILTER(WHERE NOT won)::int losses,
        SUM(wager) wagered,COALESCE(SUM(wager) FILTER(WHERE won),0) won,COALESCE(SUM(wager) FILTER(WHERE NOT won),0) lost,
        SUM(net) net,MAX(wager) biggest_wager,COALESCE(MAX(wager) FILTER(WHERE won),0) biggest_win
      FROM results GROUP BY player_id,name
    ) SELECT jsonb_build_object(
      'recent',(SELECT COALESCE(jsonb_agg(r ORDER BY created_at DESC,id DESC),'[]') FROM (SELECT id,name,wager,payout,net,won,created_at FROM results ORDER BY created_at DESC,id DESC LIMIT 20) r),
      'players',(SELECT COALESCE(jsonb_agg(p ORDER BY wagered DESC,id),'[]') FROM players p),
      'totals',jsonb_build_object('flips',(SELECT COUNT(*) FROM results),'wagered',(SELECT COALESCE(SUM(wager),0) FROM results),'won',(SELECT COALESCE(SUM(wager) FILTER(WHERE won),0) FROM results),'lost',(SELECT COALESCE(SUM(wager) FILTER(WHERE NOT won),0) FROM results))
    ) stats`);
  return row.stats;
}
