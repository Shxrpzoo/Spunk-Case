import { seedCatalog, rarities } from "../lib/catalog";
import { weightedRoll } from "../server/game";
const count = 100000,
  results = Object.fromEntries(rarities.map((r) => [r, 0]));
for (let i = 0; i < count; i++) {
  const id = weightedRoll(seedCatalog.cases[0].weights);
  results[seedCatalog.items.find((x) => x.id === id)!.rarity]++;
}
console.table(
  Object.fromEntries(
    Object.entries(results).map(([r, n]) => [
      r,
      { count: n, percent: ((n / count) * 100).toFixed(3) },
    ]),
  ),
);
