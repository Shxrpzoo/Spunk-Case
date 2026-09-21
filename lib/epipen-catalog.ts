export const epipenSource = [
  {
    file: "1 Eye TTG.png",
    id: "epipen-mystery-01",
    name: "1 Eye TTG",
    value: 200000,
  },
  {
    file: "Black and white TTG.png",
    id: "epipen-mystery-02",
    name: "Black and White TTG",
    value: 160000,
  },
  {
    file: "Cheeky Smile Ash.png",
    id: "epipen-mystery-03",
    name: "Cheeky Smile Ash",
    value: 125000,
  },
  {
    file: "Classroom Haz.png",
    id: "epipen-mystery-04",
    name: "Classroom Haz",
    value: 110000,
  },
  {
    file: "Egg Haz.png",
    id: "epipen-mystery-05",
    name: "Egg Haz",
    value: 150000,
  },
  {
    file: "Goblin.png",
    id: "epipen-mystery-06",
    name: "Goblin",
    value: 190000,
  },
  {
    file: "Jolly Fella.png",
    id: "epipen-mystery-07",
    name: "Jolly Fella",
    value: 100000,
  },
  {
    file: "Milk Man.png",
    id: "epipen-mystery-08",
    name: "Milk Man",
    value: 135000,
  },
  {
    file: "Puffy Cheeks.png",
    id: "epipen-mystery-09",
    name: "Puffy Cheeks",
    value: 120000,
  },
  {
    file: "Runny Nose.png",
    id: "epipen-mystery-10",
    name: "Runny Nose",
    value: 115000,
  },
  {
    file: "Shearbarn Singer.png",
    id: "epipen-mystery-11",
    name: "Shearbarn Singer",
    value: 145000,
  },
  {
    file: "Spunk Face.png",
    id: "epipen-mystery-12",
    name: "Spunk Face",
    value: 175000,
  },
  { file: "Greg.png", id: "epipen-greg", name: "Greg", value: 5 },
].map((i) => ({
  ...i,
  mystery: i.id !== "epipen-greg",
  weight: i.id === "epipen-greg" ? 97.6 : 0.2,
}));
