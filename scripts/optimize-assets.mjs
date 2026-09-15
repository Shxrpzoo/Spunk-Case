import sharp from "sharp";
import { readdir, mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
const roots = process.argv.slice(2);
if (roots.length !== 3)
  throw new Error(
    "Supply the Basic, Ash and Satchel source-folder paths. Prebuilt images are already included.",
  );
const groups = roots.map((root, i) => [root, ["", "ash-", "satchel-"][i]]);
const dest = "public/assets/items";
await mkdir(dest, { recursive: true });
const manifest = [];
for (const [folder, prefix] of groups)
  for (const file of await readdir(folder)) {
    if (!/\.(jpg|png|jpeg)$/i.test(file)) continue;
    const source = path.join(folder, file),
      slug =
        prefix +
        file
          .replace(/\.(jpg|png|jpeg)$/i, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-");
    const target = path.join(dest, slug + ".webp");
    await sharp(source)
      .rotate()
      .resize({
        width: 720,
        height: 720,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 83, effort: 5 })
      .toFile(target);
    manifest.push({
      source: file,
      output: slug + ".webp",
      before: (await stat(source)).size,
      after: (await stat(target)).size,
    });
  }
await writeFile(
  "database/asset-optimization.json",
  JSON.stringify(manifest, null, 2),
);
console.log(
  JSON.stringify({
    images: manifest.length,
    before: manifest.reduce((s, i) => s + i.before, 0),
    after: manifest.reduce((s, i) => s + i.after, 0),
  }),
);
