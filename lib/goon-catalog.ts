import type { Rarity } from "./catalog";
export const mysteryArt = "/cases/goon-mystery.webp";
export const goonSource: {
  file: string;
  name: string;
  id: string;
  rarity: Rarity;
  weight: number;
  mystery?: boolean;
  value?: number;
}[] = [
  {
    file: "arm_wresling.png",
    name: "Arm Wrestling",
    id: "goon-arm-wresling",
    rarity: "MYTHIC",
    weight: 0.02,
    value: 120000,
  },
  {
    file: "Big Breast haz.png",
    name: "Big Breast Haz",
    id: "goon-big-breast-haz",
    rarity: "LEGENDARY",
    weight: 2,
  },
  {
    file: "BlobFish Ash.png",
    name: "BlobFish Ash",
    id: "goon-blobfish-ash",
    rarity: "MYTHIC",
    weight: 0.08,
    value: 100000,
  },
  {
    file: "Border patrol.png",
    name: "Border Patrol",
    id: "goon-mystery-01",
    rarity: "MYTHIC",
    weight: 0.004,
    mystery: true,
    value: 1000000,
  },
  {
    file: "boxing.png",
    name: "Boxing",
    id: "goon-mystery-02",
    rarity: "MYTHIC",
    weight: 0.004,
    mystery: true,
    value: 1000000,
  },
  {
    file: "Dodgy Dave.png",
    name: "Dodgy Dave",
    id: "goon-dodgy-dave",
    rarity: "EPIC",
    weight: 5,
  },
  {
    file: "Fish Ash.png",
    name: "Fish Ash",
    id: "goon-fish-ash",
    rarity: "COMMON",
    weight: 1.946,
  },
  {
    file: "Gary Post.png",
    name: "Gary Post",
    id: "goon-gary-post",
    rarity: "RARE",
    weight: 10,
  },
  {
    file: "Goon Face Ash.png",
    name: "Goon Face Ash",
    id: "goon-goon-face-ash",
    rarity: "LEGENDARY",
    weight: 2,
  },
  {
    file: "Hard Work Zac.jpg",
    name: "Hard Work Zac",
    id: "goon-hard-work-zac",
    rarity: "EPIC",
    weight: 5,
  },
  {
    file: "Island Boys.png",
    name: "Island Boys",
    id: "goon-island-boys",
    rarity: "RARE",
    weight: 10,
  },
  {
    file: "Kebab Delight.png",
    name: "Kebab Delight",
    id: "goon-kebab-delight",
    rarity: "UNCOMMON",
    weight: 40,
  },
  {
    file: "Lippy.jpg",
    name: "Lippy",
    id: "goon-lippy",
    rarity: "EPIC",
    weight: 5,
  },
  {
    file: "open wide.png",
    name: "Open Wide",
    id: "goon-open-wide",
    rarity: "EPIC",
    weight: 5,
  },
  {
    file: "Photogenic ash.jpg",
    name: "Photogenic Ash",
    id: "goon-photogenic-ash",
    rarity: "COMMON",
    weight: 1.946,
  },
  {
    file: "slobbery smile.jpg",
    name: "Slobbery Smile",
    id: "goon-slobbery-smile",
    rarity: "LEGENDARY",
    weight: 2,
  },
  {
    file: "taking it Zac.png",
    name: "Taking It Zac",
    id: "goon-taking-it-zac",
    rarity: "EPIC",
    weight: 5,
  },
  {
    file: "Tripple Chin Tart.png",
    name: "Triple Chin Tart",
    id: "goon-tripple-chin-tart",
    rarity: "EPIC",
    weight: 5,
  },
];
