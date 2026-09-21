import type { Catalog, Effect } from "./catalog";
export type Player = {
  id: string;
  name: string;
  balance: number;
  daily_at: string | null;
  free_at: string | null;
  first_case_day: string | null;
};
export type Owned = { item_id: string; quantity: number };
export type CardStack = { item_id: string; effect: Effect; quantity: number };
export type History = {
  id: string;
  kind: string;
  amount: number;
  detail: Record<string, unknown>;
  created_at: string;
};
export type State = {
  player: Player;
  inventory: Owned[];
  cards: CardStack[];
  discoveries: string[];
  completions: { kind: string; key: string }[];
  history: History[];
  recent: { name: string; item_id: string; created_at: string }[];
  catalog: Catalog;
  serverTime: string;
};
export type Outcome = {
  battleId?: string;
  tradeId?: string;
  sold?: number;
  batchId?: string;
  kind: string;
  effect?: Effect;
  roll?: number;
  zone?: number;
  chance?: number;
  sourceEffect?: Effect;
  value?: number;
  itemId?: string;
  item?: import("./catalog").Item;
  duplicate?: boolean;
  won?: boolean;
  face?: string;
  multiplier?: number;
  wager?: number;
  payout?: number;
  rewards: { label: string; amount: number }[];
  balance: number;
  id: string;
};

export type LeaderboardEntry = {
  id: string;
  name: string;
  balance: number;
  cases: number;
  card_value: number;
  item_id: string | null;
  effect: Effect | null;
};
export type Leaderboards = {
  cards: LeaderboardEntry[];
  nuggets: LeaderboardEntry[];
  cases: LeaderboardEntry[];
};

export type CoinStatsEntry = {
  id: string;
  name: string;
  flips: number;
  wins: number;
  losses: number;
  wagered: number;
  won: number;
  lost: number;
  net: number;
  biggest_wager: number;
  biggest_win: number;
};
export type CoinStats = {
  recent: {
    id: string;
    name: string;
    wager: number;
    payout: number;
    net: number;
    won: boolean;
    created_at: string;
  }[];
  players: CoinStatsEntry[];
  totals: { flips: number; wagered: number; won: number; lost: number };
};
