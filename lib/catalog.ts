import { goonSource, mysteryArt } from "./goon-catalog";
import { epipenSource } from "./epipen-catalog";
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
export type Item = {
  id: string;
  name: string;
  rarity: Rarity;
  image: string;
  value?: number;
  mystery?: boolean;
};
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
  COMMON: 45,
  UNCOMMON: 28,
  RARE: 16,
  EPIC: 7,
  LEGENDARY: 3,
  MYTHIC: 1,
};
export const ashSource: [string, Rarity][] = [
  ["ash paffet.jpg", "UNCOMMON"],
  ["Aura Farm ash.jpg", "MYTHIC"],
  ["Bald ash.jpg", "RARE"],
  ["Bannana Ash.png", "COMMON"],
  ["blue bag ash.jpg", "COMMON"],
  ["caveman ash.jpg", "UNCOMMON"],
  ["Cheeky ash.jpg", "UNCOMMON"],
  ["Chocolate milk ash.jpg", "RARE"],
  ["Clipper Ash.png", "EPIC"],
  ["Egg Ash.jpg", "LEGENDARY"],
  ["Football ash.png", "LEGENDARY"],
  ["Frustrated Ash.png", "EPIC"],
  ["Gate Ash.jpg", "COMMON"],
  ["Goalkeeper ash.png", "EPIC"],
  ["Horny ash.png", "MYTHIC"],
  ["Hotdog ash.png", "EPIC"],
  ["Mars Bar Ash.jpg", "RARE"],
  ["obese ash.png", "LEGENDARY"],
  ["posture ash.png", "LEGENDARY"],
  ["Rude Ash.png", "EPIC"],
  ["Sleepy Ash.png", "RARE"],
  ["Seductive Ash.jpg", "UNCOMMON"],
  ["Supercool Young Ash.jpg", "EPIC"],
  ["Taking it ash.png", "MYTHIC"],
  ["The Gang ash.jpg", "LEGENDARY"],
  ["Thumbs up ash.jpg", "EPIC"],
  ["TTT ash.png", "RARE"],
  ["Workout ash.jpg", "RARE"],
];
export const satchelSource: [string, Rarity][] = [
  ["A&H.jpg", "RARE"],
  ["Ash kyle show.png", "EPIC"],
  ["Bathtub boys.jpg", "EPIC"],
  ["Bev and the Bean Stalk.png", "LEGENDARY"],
  ["Biker bev.jpg", "RARE"],
  ["Boys 4 Life.jpg", "LEGENDARY"],
  ["Bright Future.png", "EPIC"],
  ["Dodgy Elevator ride.jpg", "RARE"],
  ["Erm IDK.jpg", "RARE"],
  ["Game Time.png", "EPIC"],
  ["Happy Zac.png", "RARE"],
  ["Ima Celeb TTG.png", "EPIC"],
  ["Mafia.png", "LEGENDARY"],
  ["Nerf Gun TTG.png", "RARE"],
  ["Packet man.png", "UNCOMMON"],
  ["Postman Jay.png", "UNCOMMON"],
  ["Shocked TTG.png", "COMMON"],
  ["TTG FUNERAL.png", "LEGENDARY"],
  ["TTG Files.png", "MYTHIC"],
  ["TTG's Football club.png", "LEGENDARY"],
  ["Thumbs up ash.png", "COMMON"],
  ["TikTok Live TTG.png", "EPIC"],
  ["W RIZZ.jpg", "LEGENDARY"],
  ["Wise TTg words.png", "RARE"],
  ["alien abduction zac.png", "MYTHIC"],
  ["bird zac.png", "RARE"],
  ["cheeky ash.jpg", "UNCOMMON"],
  ["chicken Bomber.png", "EPIC"],
  ["corona ash.jpg", "UNCOMMON"],
  ["dodgy zac.png", "COMMON"],
  ["dont get cuaght.jpg", "COMMON"],
  ["double thumbs up ash.png", "UNCOMMON"],
  ["drunk haz.jpg", "UNCOMMON"],
  ["dumptruck zac.png", "RARE"],
  ["fat slob.png", "COMMON"],
  ["harry myatt.png", "UNCOMMON"],
  ["headset liam.jpg", "COMMON"],
  ["hungry zac.jpg", "UNCOMMON"],
  ["illuminati ash.png", "MYTHIC"],
  ["jared.jpg", "COMMON"],
  ["liam P.jpg", "COMMON"],
  ["lolipop ash.png", "COMMON"],
  ["long neck ash.png", "UNCOMMON"],
  ["nipslip haz.png", "COMMON"],
  ["no body cam since belmont road.png", "COMMON"],
  ["paintjob haz.png", "RARE"],
  ["pdf ash.png", "COMMON"],
  ["pepperoni haz.png", "COMMON"],
  ["prom fellas.jpg", "RARE"],
  ["shocked zac.png", "UNCOMMON"],
  ["skinfade ash.png", "COMMON"],
  ["slender haz.png", "COMMON"],
  ["snoty dave.png", "COMMON"],
  ["special train ride.png", "EPIC"],
  ["stupid wall photo.jpg", "COMMON"],
  ["suited up ash.png", "UNCOMMON"],
  ["thinker ash.jpg", "RARE"],
  ["what went wrong.png", "UNCOMMON"],
];
export const seedCatalog: Catalog = {
  items: [
    ...epipenSource.map((i) => ({
      id: i.id,
      name: i.name,
      rarity: (i.mystery ? "MYTHIC" : "COMMON") as Rarity,
      image: "/assets/items/" + i.id + ".webp",
      mystery: i.mystery,
      value: i.value,
    })),
    ...goonSource.map((i) => ({
      id: i.id,
      name: i.name,
      rarity: i.rarity,
      image: "/assets/items/" + i.id + ".webp",
      mystery: !!i.mystery,
      value: i.value,
    })),
    ...source.map(([file, rarity]) => ({
      id: slug(file),
      name: file.replace(/\.(png|jpg)$/i, ""),
      rarity,
      image: "/assets/items/" + slug(file) + ".webp",
    })),
    ...ashSource.map(([file, rarity]) => ({
      id: "ash-" + slug(file),
      name: file.replace(/\.(png|jpg)$/i, ""),
      rarity,
      image: "/assets/items/ash-" + slug(file) + ".webp",
    })),
    ...satchelSource.map(([file, rarity]) => ({
      id: "satchel-" + slug(file),
      name: file.replace(/\.(png|jpg)$/i, ""),
      rarity,
      image: "/assets/items/satchel-" + slug(file) + ".webp",
    })),
  ],
  cases: [
    {
      id: "epipen",
      name: "EPIPEN CASE",
      price: 1000,
      enabled: true,
      weights: epipenSource.map((i) => ({ itemId: i.id, weight: i.weight })),
    },
    {
      id: "goon",
      name: "THE RETURN OF THE GOON",
      price: 500,
      enabled: true,
      weights: goonSource.map((i) => ({ itemId: i.id, weight: i.weight })),
    },
    {
      id: "basic",
      name: "SPUNK CASE - BASIC",
      price: 20,
      enabled: true,
      weights: source.map(([file, rarity, w]) => ({
        itemId: slug(file),
        weight:
          (totals[rarity] * w) /
          source.filter((s) => s[1] === rarity).reduce((a, s) => a + s[2], 0),
      })),
    },
    {
      id: "ash",
      name: "ASH CASE",
      price: 100,
      enabled: true,
      weights: ashSource.map(([file, r]) => ({
        itemId: "ash-" + slug(file),
        weight: totals[r] / ashSource.filter((x) => x[1] === r).length,
      })),
    },
    {
      id: "satchel",
      name: "SEMEN SATCHEL",
      price: 150,
      enabled: true,
      weights: satchelSource.map(([file, r]) => ({
        itemId: "satchel-" + slug(file),
        weight: totals[r] / satchelSource.filter((x) => x[1] === r).length,
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

export const effects = ["RAW", "NONE", "SPUNK", "POO", "SMEGMA"] as const;
export type Effect = (typeof effects)[number];
export const effectMultipliers: Record<Effect, number> = {
  RAW: 1,
  NONE: 1,
  SPUNK: 2,
  POO: 5,
  SMEGMA: 10,
};
export const cardValues: Record<Rarity, number> = {
  COMMON: 10,
  UNCOMMON: 25,
  RARE: 75,
  EPIC: 200,
  LEGENDARY: 2500,
  MYTHIC: 15000,
};
export const cardValue = (item: Item, effect: Effect = "RAW") =>
  (item.value ?? cardValues[item.rarity]) * effectMultipliers[effect];

export function hiddenMystery(item: Item): Item {
  return item.mystery
    ? { ...item, name: "Mystery Item", image: mysteryArt }
    : item;
}

// Values use each card's most accessible pull percentage, not a rarity-wide
// flat price. Explicit jackpot values remain fixed as requested.
export function valueFromOdds(percent: number) {
  return Math.max(
    5,
    Math.round(400 / Math.pow(Math.max(percent, 0.001), 1.5) / 5) * 5,
  );
}
for (const item of seedCatalog.items) {
  const p = Math.max(...seedCatalog.cases.map((c) => chance(c, item.id)));
  item.value ??= valueFromOdds(p);
}
export function rarityGroups(c: Catalog) {
  return c.cases.flatMap((ca) =>
    rarities.map((r) => ({
      caseId: ca.id,
      rarity: r,
      key: ca.id === "basic" ? r : ca.id + ":" + r,
      items: c.items.filter(
        (i) => i.rarity === r && ca.weights.some((w) => w.itemId === i.id),
      ),
    })),
  );
}

// The new case has much smaller collections (including one 40% card).
// Keep its one-time completion bonuses modest without changing older cases.
export function collectionReward(c: Catalog, caseId: string, rarity: Rarity) {
  if (caseId === "epipen")
    return rarity === "COMMON" ? 100 : rarity === "MYTHIC" ? 25000 : 0;
  const goonRewards: Record<Rarity, number> = {
    COMMON: 250,
    UNCOMMON: 100,
    RARE: 500,
    EPIC: 1000,
    LEGENDARY: 5000,
    MYTHIC: 25000,
  };
  return caseId === "goon"
    ? goonRewards[rarity]
    : c.settings.rarityRewards[rarity];
}

export const effectChances = { SPUNK: 50, POO: 30, SMEGMA: 10 } as const;
export type UpgradeEffect = keyof typeof effectChances;
