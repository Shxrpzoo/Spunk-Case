# SPUNK CASES v2

Three animated cases, 108 collectible pictures, card effects, Nugget upgrades,
coin flips, player leaderboards and persistent PostgreSQL saves.

## Update an existing site

Follow **START-HERE.txt**. First run the complete contents of
`database/UPDATE-V2.sql` in the existing Supabase SQL Editor. Then upload the
extracted project contents to the existing GitHub repository and deploy through
Vercel. Do not create a replacement database or reset player tables.

The update preserves account IDs, passcodes, sessions, balances, owned copies,
completion awards, history and request recovery records. It adds permanent
discoveries, effect copies, Ash and Semen Satchel. Basic IDs remain unchanged.
Migration markers make reruns safe; a rerun will not reset later admin edits.

`package.json` belongs at the repository root, alongside `app`, `components`,
`database`, `lib`, `public`, `scripts`, `server`, `tests`, and `vercel.json`.
Use the exact lowercase asset filenames supplied. Do not upload the ZIP itself.
The API uses ordinary route folders to avoid the earlier catch-all upload issue.

## Game rules

| Case | Price | Pictures | Mythic chance |
|---|---:|---:|---:|
| SPUNK CASE - BASIC | 20 SN | 22 | 1% |
| ASH CASE | 100 SN | 28 | 1% |
| SEMEN SATCHEL | 150 SN | 58 | 1% |

All cases: Common 45%, Uncommon 28%, Rare 16%, Epic 7%, Legendary 3%, Mythic 1%.
Basic retains different item weights within rarities. Ash and Satchel split each
rarity's probability equally among its members. `CATALOG.md` lists every card.

Basic remains enabled at 20 SN. If a player has fewer than 20 SN, the server
credits exactly the shortfall as a logged Basic support reward before purchase.
The existing daily, five-minute, first-case, duplicate and opening rewards remain.

| Rarity | Base sale value |
|---|---:|
| Common | 10 SN |
| Uncommon | 25 SN |
| Rare | 75 SN |
| Epic | 200 SN |
| Legendary | 2,500 SN |
| Mythic | 15,000 SN |

Choose an owned copy and a target effect: Spunk 50% (2x value), Poo 30% (5x),
or Smegma 10% (10x). A failed attempt destroys ONE selected copy. Success
replaces its effect; multipliers apply to the base rarity value, never stack.
A modified card may be risked again. Every remaining copy is sellable.
Discovery and earned collection rewards survive sales and failed upgrades.
Old NONE variants from earlier local testing remain usable and sellable.

Nugget mode restores 2x, 5x, 10x and 20x upgrades. Initial chances are 50%,
10%, 5% and 2.5%, using the existing configurable settings. A win returns wager
multiplied by the selected multiplier; a loss costs the wager. Coin Flip is
independently 50/50 with a 2x total return.

For both upgrade modes, the slider moves the winning arc clockwise or
anti-clockwise. Its area, and therefore its probability, stays unchanged.
A new setup starts at a random position. After a result, Prepare Next Spin
creates a fresh area without placing a wager; adjust it, then confirm the spin.
The server uses the submitted position and a cryptographically random roll.

Leaderboards rank the top 100 players by highest-value currently owned card,
current Nuggets, or lifetime case openings. Every row shows all three metrics.
Card effects are included in card value. Selling or losing the highest card
changes that ranking. Ties use the other displayed metric, then name and ID.
Only signed-in players can retrieve leaderboard data.

Collections are separated by case, with independent rarity rewards. Basic
completion keys and the original six name lines remain intact. Collections,
inventories and case contents load more cards in batches of 24.

## Saving and recovery

PostgreSQL is authoritative. Each mutation locks the player row and commits
inventory, effects, currency ledger, discovery/reward records and a retry result
in one transaction. The animation starts from the committed result. Refreshing
or closing the browser does not undo it. History and Reconnect & recover retrieve
saved outcomes. Duplicate request keys cannot charge, sell, destroy, or roll twice.

The browser stores an opaque HttpOnly session cookie plus sound/quick-open
preferences and a pending request key. It never supplies authoritative balances,
values or probabilities. Reusing the same database during deployment keeps saves.
Keep database backups separately; a deployment package is not a player-data backup.

## Hosting and configuration

Vercel runs Next.js, GitHub holds source, and the existing Supabase project holds
PostgreSQL data. Keep the following server environment variables in Vercel:

| Variable | Value |
|---|---|
| DATABASE_URL | Existing working Supabase transaction-pooler URI |
| APP_ORIGIN | https://spunkcase.vercel.app (or your exact custom origin) |
| INVITE_CODE | Existing friends invite code |
| ADMIN_PASSWORD_HASH | Existing salted admin password hash |

Treat database credentials, invite code and admin hash as sensitive. Never commit
live environment files. APP_ORIGIN itself is not secret. No Supabase public key,
service-role key, storage bucket, or Supabase Auth configuration is required.
Production does not use USE_LOCAL_DB.

`vercel.json` selects Dublin (`dub1`), close to the supplied eu-west-1 database.
Catalog reads use one SQL query instead of six; state reads are batched; the
animation no longer waits for a second full state refresh. The small Postgres pool
supports three concurrent connections with prepared statements disabled for the
transaction pooler. See [Vercel regions](https://vercel.com/docs/regions) and
[Supabase connections](https://supabase.com/docs/guides/database/connecting-to-postgres).

The 108 web images total about 3.3 MB, compared with 128 MB in the source folders.
Original source files were not changed. Larger images are resized to fit within
720x720 and encoded as WebP. These files ship ready to serve without a first-view
image-transform request. Contents stay collapsed until opened.

The case designs are original layered SVG/CSS artwork with drips, smoke, yellow
teeth or a white demon; drop/impact/lid/reel animations include quick-open and
reduced-motion modes. Reel decorations shuffle independently of the saved prize.
Audio is an original synthesized mechanical tick and reveal tone. It is **not**
the exact CS2 sound; no CS2 audio file was supplied. Sound is optional.

## Local development and checks

Use Node.js 22.x. Install with `npm ci`; the lockfile pins dependency versions.

- `npm run build`: production Next.js build and TypeScript validation.
- `npm run typecheck`: TypeScript check.
- `npm test`: PostgreSQL-compatible integration and migration tests.
- `npm run verify:assets`: checks every catalog image exists.
- `npm run simulate`: sample the Basic case using the server random generator.
- `npm run admin:password`: create a new admin password/hash for a new installation.

For an existing remote database, configure `.env.local` and use `npm run db:setup`
as an alternative to pasting the SQL update. For a new database, schema, seed,
and the update script are applied without touching pre-existing data.
For disposable local testing, run `npx tsx scripts/local-setup.ts`, set
USE_LOCAL_DB=true and APP_ORIGIN=http://localhost:3000, then `npm run dev`.
The local `.local-db` folder is excluded from Git and releases.

Asset regeneration is optional and is not part of the build. With the three
source folders available, run `node scripts/optimize-assets.mjs "basic folder"
"ash folder" "satchel folder"`. Ready-to-use WebP images are already included.
