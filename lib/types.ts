import type { Catalog } from "./catalog";
export type Player = {
  id: string;
  name: string;
  balance: number;
  daily_at: string | null;
  free_at: string | null;
  first_case_day: string | null;
};
export type Owned = { item_id: string; quantity: number };
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
  completions: { kind: string; key: string }[];
  history: History[];
  recent: { name: string; item_id: string; created_at: string }[];
  catalog: Catalog;
  serverTime: string;
};
export type Outcome = {
  kind: string;
  itemId?: string;
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
