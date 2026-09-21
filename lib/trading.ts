import type { Item } from "./catalog";
import type { CardStack } from "./types";

export type TradeSide = {
  nuggets: number;
  cards: CardStack[];
};
export type TradeProposal = {
  a: TradeSide;
  b: TradeSide;
};
export type Trade = {
  id: string;
  party_a: string;
  party_b: string;
  offered_by: string;
  awaiting_id: string;
  status: "pending" | "accepted" | "declined";
  revision: number;
  proposal: TradeProposal;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  a_name: string;
  b_name: string;
};
export type SocialOutcome = {
  id: string;
  kind: "social";
  balance: number;
  rewards: { label: string; amount: number }[];
  tradeId?: string;
  status?: Trade["status"];
  revision?: number;
};
export type TradeInventory = {
  player: { id: string; name: string; balance: number };
  cards: CardStack[];
  items: Item[];
};
export type TradeInbox = {
  trades: Trade[];
  items: Item[];
  total: number;
  page: number;
};
export type Notification = {
  id: string;
  kind:
    | "battle-invite"
    | "battle-completed"
    | "battle-declined"
    | "trade-offer"
    | "trade-counter"
    | "trade-accepted"
    | "trade-declined"
    | "nuggets-received";
  title: string;
  trade_id: string | null;
  battle_id: string | null;
  detail: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
};
export type NotificationInbox = {
  unread: number;
  notifications: Notification[];
};

// Identifies a specific card+effect combination within a trade side, so
// duplicate selections of the same stack can be detected and rejected.
export function stackKey(c: { item_id: string; effect: string }): string {
  return c.item_id + ":" + c.effect;
}
