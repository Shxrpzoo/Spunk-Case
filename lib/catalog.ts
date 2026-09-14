export const rarities = [
  "COMMON",
  "UNCOMMON",
  "RARE",
  "EPIC",
  "LEGENDARY",
  "MYTHIC",
] as const;
export type Rarity = (typeof rarities)[number];
export const colors: Record<Rarity, string> = {
  COMMON: "#a8b4ce",
  UNCOMMON: "#64e9ac",
  RARE: "#63a8ff",
  EPIC: "#b48aff",
  LEGENDARY: "#ffcb62",
  MYTHIC: "#ff6baf",
};
export type Item = { id: string; name: string; rarity: Rarity; image: string };
export type Case = {
  id: string;
  name: string;
  price: number;
  enabled: boolean;
  weights: { itemId: string; weight: number }[];
};
export type Line = {
  id: string;
  name: string;
  reward: number;
  itemIds: string[];
};
export type Settings = {
  startingBalance: number;
  dailyReward: number;
  firstCaseReward: number;
  caseReward: number;
  duplicateReward: number;
  freeReward: number;
  rarityRewards: Record<Rarity, number>;
  upgradeChances: Record<string, number>;
};
export type Catalog = {
  items: Item[];
  cases: Case[];
  lines: Line[];
  settings: Settings;
};
const source: [string, Rarity, number][] = [
  ["Angry Ash.png", "LEGENDARY", 1.8],
  ["Drag TTG.png", "LEGENDARY", 1],
  ["mike andy and shuan.png", "LEGENDARY", 2],
  ["mini men.png", "MYTHIC", 0.2],
  ["TTG NIP SLIP.jpg", "MYTHIC", 0.03],
  ["chicken troopers.png", "EPIC", 4],
  ["Jamie G.png", "EPIC", 5],
  ["johnpork.png", "EPIC", 5],
  ["wonkey ash.jpg", "EPIC", 12],
  ["leonardo.png", "RARE", 22],
  ["mike.jpg", "RARE", 26],
  ["pencil arms ash.png", "RARE", 18],
  ["surfing haz.png", "RARE", 19],
  ["TTGDRESSup.png", "RARE", 29],
  ["Chud Zac.jpg", "UNCOMMON", 37],
  ["dodgyHaz.png", "UNCOMMON", 34],
  ["HardHat Zac.png", "UNCOMMON", 33],
  ["Shuan.png", "UNCOMMON", 45],
  ["Cashire TTG.png", "COMMON", 48],
  ["ForkBev.png", "COMMON", 56],
  ["Tony.png", "COMMON", 57],
  ["TTG.png", "COMMON", 67],
];
const slug = (name: string) =>
  name
    .replace(/\.(png|jpg)$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
const totals: Record<Rarity, number> = {
  COMMON: 52,
  UNCOMMON: 27,
  RARE: 13,
  EPIC: 6,
  LEGENDARY: 1.75,
  MYTHIC: 0.25,
};
export const seedCatalog: Catalog = {
  items: source.map(([file, rarity]) => ({
    id: slug(file),
    name: file.replace(/\.(png|jpg)$/i, ""),
    rarity,
    image: "/assets/items/" + encodeURIComponent(file),
  })),
  cases: [
    {
      id: "basic",
      name: "SPUNK CASE - BASIC",
      price: 500,
      enabled: true,
      weights: source.map(([file, rarity, w]) => ({
        itemId: slug(file),
        weight:
          (totals[rarity] * w) /
          source.filter((s) => s[1] === rarity).reduce((a, s) => a + s[2], 0),
      })),
    },
  ],
  lines: [
    {
      id: "ttg",
      name: "TTG LINE",
      reward: 750000,
      itemIds: ["ttg", "cashire-ttg", "drag-ttg", "ttgdressup", "ttg-nip-slip"],
    },
    {
      id: "ash",
      name: "ASH LINE",
      reward: 150000,
      itemIds: ["angry-ash", "pencil-arms-ash", "wonkey-ash"],
    },
    {
      id: "shuan",
      name: "SHUAN LINE",
      reward: 150000,
      itemIds: ["shuan", "mike-andy-and-shuan"],
    },
    {
      id: "zac",
      name: "ZAC LINE",
      reward: 25000,
      itemIds: ["chud-zac", "hardhat-zac"],
    },
    {
      id: "haz",
      name: "HAZ LINE",
      reward: 50000,
      itemIds: ["dodgyhaz", "surfing-haz"],
    },
    {
      id: "mike",
      name: "MIKE LINE",
      reward: 150000,
      itemIds: ["mike", "mike-andy-and-shuan"],
    },
  ],
  settings: {
    startingBalance: 2000,
    dailyReward: 500,
    firstCaseReward: 250,
    caseReward: 50,
    duplicateReward: 100,
    freeReward: 500,
    rarityRewards: {
      COMMON: 5000,
      UNCOMMON: 10000,
      RARE: 20000,
      EPIC: 40000,
      LEGENDARY: 100000,
      MYTHIC: 500000,
    },
    upgradeChances: { "1.5": 65, "2": 50, "5": 10, "10": 5, "20": 2.5 },
  },
};
export function chance(c: Case, itemId: string) {
  const sum = c.weights.reduce((a, w) => a + w.weight, 0);
  return sum
    ? ((c.weights.find((w) => w.itemId === itemId)?.weight ?? 0) / sum) * 100
    : 0;
}
