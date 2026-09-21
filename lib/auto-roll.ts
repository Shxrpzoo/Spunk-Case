import type { Item } from "./catalog";
export type AutoBatch = {
  id: string;
  results: { id: string; item: Item; available: boolean }[];
};
