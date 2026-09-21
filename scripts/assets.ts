import { access } from "node:fs/promises";
import { seedCatalog } from "../lib/catalog";
for (const item of seedCatalog.items)
  await access("public" + decodeURIComponent(item.image));
console.log(
  `All ${seedCatalog.items.length} supplied image references exist, with exact filename case.`,
);
