# SPUNK CASES

A private case-opening game for friends. Spunk Nuggets are entirely fictional: no payments, deposits, withdrawals, prizes with cash value, or cash-out features.

## Start here: GitHub → Vercel

**Uploading the ZIP file itself to GitHub will not deploy the app. Extract it first, then upload the contents of the `spunk-cases` folder. `package.json` must be at the repository root.** Include the `app`, `components`, `lib`, `server`, `database`, `scripts`, `tests`, and `public` folders, plus the configuration files and lockfile. Use a private personal GitHub repository for the friends' photos.

1. Create a free Supabase project. Save the database password securely. You do not need Supabase email authentication or a storage bucket.
2. Open Supabase's SQL Editor. Run `database/schema.sql`, then `database/seed.sql`, in that order. Both are safe to rerun; the seed skips itself if initial settings already exist. Never replace a live database to deploy a new frontend.
3. In Supabase, choose **Connect → Transaction pooler**, and copy the PostgreSQL connection URI for port **6543**. Replace the password placeholder with your database password; URL-encode special characters in the password. Use the exact host and username Supabase provides.
4. Install Node.js 22 LTS or newer on your computer. In the extracted project folder, run `npm ci`, then `npm run admin:password`. Save the generated admin password in a password manager. The command also prints its salted hash, which goes into the environment variable below. No default admin password is included.
5. In Vercel, add a new project, import the GitHub repository, and select **Next.js**. Root directory: the folder containing `package.json`. Build command: `npm run build`. Install command: `npm ci`. Leave Output Directory at its Next.js default. Choose Node.js 22.x or a supported newer LTS.
6. Add these **server environment variables** in Vercel. Do not put them into GitHub and do not use `NEXT_PUBLIC_` prefixes:

   | Variable              | Value                                                           |
   | --------------------- | --------------------------------------------------------------- |
   | `DATABASE_URL`        | Supabase transaction pooler PostgreSQL URI                      |
   | `APP_ORIGIN`          | Exact final site origin, e.g. `https://your-project.vercel.app` |
   | `INVITE_CODE`         | A long random code shared only with friends                     |
   | `ADMIN_PASSWORD_HASH` | Hash printed by `npm run admin:password`                        |

   Leave `USE_LOCAL_DB` unset on Vercel. Production refuses the local test database.

7. Deploy. If you only learn the final URL after the first deployment, update `APP_ORIGIN` to that URL and redeploy. Changing to a custom domain also requires updating this value. Preview deployments should have their own database and matching origin before you use them for testing.
8. Visit the site → Sign in → New player. Enter your name, a passcode of at least six characters, and the friends invite code. Give friends the site URL and invite code. Existing players sign in using the same name and passcode on any device.
9. Open `/admin` and use the separate admin password to manage players and the game. A player login never grants admin access.

## What is included

- Normal ~4.2-second case reel and ~0.45-second Quick Open, both using the same server roll.
- All **22 supplied images** with original filenames and extensions preserved. The brief says 23, but its authoritative named list also contains only 22. No additional person or artwork has been invented. Four supplied files are JPGs (`Chud Zac.jpg`, `mike.jpg`, `TTG NIP SLIP.jpg`, `wonkey ash.jpg`); references use those actual filenames.
- Starting balance of 2,000; 500 daily; 500 every five minutes; 250 on the first case of each UTC calendar day; 50 for every case; 100 per duplicate.
- Inventory quantities, six rarity collections, six name lines, one-time completion rewards, recent discoveries, and game history.
- Upgrader: 1.5× / 2× / 5× / 10× / 20×, with visible configurable success chances. Coin Flip: fair 50/50, 2× total return on a win.
- Separate admin login, player adjustments, item grants/removal, cooldown/collection/player reset, passcode recovery, case and catalog management, rewards, odds, statistics, and admin audit trail.
- Responsive interface, keyboard controls, reduced motion, optional synthesized sound, and optimized images.

## How progress is saved

**PostgreSQL is the authority.** Every action locks the player's database row and commits its balance changes, ledger entries, item quantities, rewards, opening history, and retry response in one transaction. The server commits before the reel, wheel, or coin animation runs. Closing or refreshing the browser during the animation does not undo the result. Reopen History to see it.

Currency and inventory are never read from localStorage. The browser holds an opaque HttpOnly session cookie (90-day lifetime), sound/Quick Open preferences, and an in-flight request key. The same name and passcode retrieve the same database-backed profile from another device. Signing out, clearing browser storage, or letting a cookie expire does not delete your player. Passcodes are salted and hashed with scrypt.

An uncertain network response retains the request key. **Reconnect & recover** replays the same request and retrieves its saved response without another charge. Separate keys are serialized with a row lock, and a short action interval protects against rapid submissions. Already-awarded completion records remain even after an admin collection reset, so removing and regaining an item cannot farm a reward.

Deploying new code on Vercel preserves progress as long as `DATABASE_URL` still points to the same database. Keep your Supabase account and project. **Persistence is not a backup:** accidental database deletion, destructive SQL, or provider/account loss can still lose data. Periodically export your database and keep an offline copy. With PostgreSQL's tools installed, use `pg_dump --schema=spunk --format=custom --file=spunk-backup.dump "$DATABASE_URL"` from a secure terminal using a suitable Supabase direct/session connection. Do not put backups in GitHub; they contain private player data and password/session hashes. Test restoration into a separate database before relying on a backup.

## Stack and local development

Next.js App Router, React, TypeScript, custom responsive CSS, PostgreSQL via `postgres`, Zod validation, and Lucide icons. CSS is used directly rather than adding Tailwind solely for utility classes. Supabase hosts PostgreSQL; Vercel runs the Next.js Node server. No paid API is required. `package-lock.json` fixes exact installed dependency versions.

```sh
npm ci
```

Copy `.env.example` to `.env.local`, fill the four secrets/settings, and set `APP_ORIGIN=http://localhost:3000`. Never commit `.env.local`.

```sh
npm run db:setup  # optional alternative to running the two SQL files in Supabase
npm run dev
```

Open `http://localhost:3000`. The production path always uses PostgreSQL; no production filesystem saves are used. The client can render the artwork before setup, but gameplay requires a working database.

For isolated development without Supabase, set `USE_LOCAL_DB=true` in `.env.local`, then run `npx tsx scripts/local-setup.ts` and `npm run dev`. This uses PGlite, a local PostgreSQL engine, in the ignored `.local-db` folder. This mode is **development only**, is not deployed, and should have separate test players. Stop the dev server before initializing/accessing the local database from another process.

```sh
npm run typecheck
npm test
npm run verify:assets
npm run simulate
npm run build
npm start
```

`npm test` exercises the actual SQL and server game functions using an isolated PGlite database. It covers transactions, retries, parallel requests, insufficient funds, every reward, duplicates, completion reuse, UTC reset, upgrader options, coin flip, input tampering, authentication, rate limiting, and admin changes. The local engine serializes transactions; multi-connection cloud behavior should also be smoke-tested after configuring Supabase. Production uses PostgreSQL `FOR UPDATE` row locks.

## Database and security

All relational tables live in the private `spunk` schema, outside Supabase's default public Data API schema. Row-level security is enabled on every table; no browser policies are granted. Keep `spunk` out of Supabase's exposed schemas. The server connection uses the project database owner and must be kept secret. The direct SQL driver disables prepared statements for transaction-pooler compatibility and uses TLS. Browser requests can never submit arbitrary SQL.

Tables: players, sessions, rate_limits, items, cases, case_items, lines, line_items, settings, player_items, completions, requests, history, case_openings, ledger, admin_audit, admin_requests. Settings use one JSON configuration value; inventory, players, balances, line memberships, openings, and ledger rows are relational rather than one giant game-state blob.

Every currency ledger record includes amount, before/after balances, reason, reference, and timestamp. API routes authenticate independently of visible buttons. Mutating requests require same-origin JSON. Login limits are stored in PostgreSQL, including player-name limits. Sessions use random 256-bit opaque tokens; only their hashes are stored. Admin is one environment-configured owner, with its own cookie and password. Raw passcodes are not logged or stored in the audit.

Artwork and the signed-out shell are public web assets. Gameplay, balances, inventories, and friends' activity require sign-in. For fully restricted artwork access, use hosting access protection or authenticated asset delivery; a private GitHub repository alone does not password-protect a deployed site's public files.

## Probability and economy rules

Basic case rarity targets total exactly 100% before display rounding:

| Rarity    | Chance | Completion reward |
| --------- | -----: | ----------------: |
| Common    |    52% |             5,000 |
| Uncommon  |    27% |            10,000 |
| Rare      |    13% |            20,000 |
| Epic      |     6% |            40,000 |
| Legendary |  1.75% |           100,000 |
| Mythic    |  0.25% |           500,000 |

Within each rarity, the original supplied percentages are used as relative weights. The server selects with cryptographic randomness and cumulative normalized weights. Rounded displayed percentages may differ from exactly 100% by a tiny rounding amount.

Upgrader choices are separate Bernoulli bets. Their chances do **not** need to sum to 100%. The supplied 65%, 50%, 10%, 5%, and 2.5% are valid for those separate choices. A winning return includes the original wager; a loss loses the wager. Fractional total returns are rounded down to whole nuggets. Wagers are 1–1,000,000 whole nuggets. The server checks the balance and ignores client-supplied odds/results/reward values.

Daily reward: rolling 24-hour cooldown. Free nuggets: rolling five-minute cooldown, immediately available for a new player. First-case bonus: once per UTC calendar day, resetting at 00:00 UTC. Every countdown is based on a server time sample and monotonic elapsed time; only the server can approve a claim.

Lines: TTG (750,000), Ash (150,000), Shuan (150,000), Zac (25,000), Haz (50,000), Mike (150,000). Only directly related names are grouped. Shuan's line does not include surfing haz.

## Admin configuration and images

Open Admin Mode → **Cases, items & rewards**. The complete structured JSON editor is the working configuration interface. Expand **Current effective probabilities** to inspect every normalized chance. Edit and select **Validate & save configuration**. Validation rejects duplicate/missing IDs, invalid image paths, negative/zero case weights, empty cases, invalid rewards, and higher multipliers with easier chances. Stale admin edits are rejected rather than silently overwriting a newer edit.

- Change `cases[].price`, `enabled`, or each item's `weight` to rebalance cases.
- Add a case with a new lowercase ID, name, positive price, enabled flag, and existing item IDs/weights.
- Add item files under `public/assets/items` in GitHub and deploy them first, then add an item in the editor with a unique ID, name, rarity, and matching local path. Use URL-encoded spaces, such as `/assets/items/Angry%20Ash.png`. Linux/Vercel filenames are case sensitive. Original PNG and JPG files are retained; Next.js generates appropriately sized variants.
- Remove an item from a case by deleting its weight entry. Existing item/case/line IDs cannot be deleted, protecting historical references and completion records. Disable unwanted cases. Item names, rarity, and artwork paths can be edited.
- Change rewards under `settings` and `lines`; change success chances under `settings.upgradeChances`. Newly completed groups use current reward values. Editing a completed group's membership does not make its reward claimable again.
- Player actions support adding/removing/setting nuggets, giving/removing one item copy, resetting daily cooldown, inventory reset, player reset, and resetting a forgotten passcode. Reset player restores starting balance and clears inventory/daily/free cooldowns; audit/history/completion records remain. Type `RESET` to confirm a reset. Passcode reset revokes existing player sessions.
- A granted item can complete a collection and awards the corresponding bonus once. Admin balance edits are recorded in the currency ledger.

`npm run simulate` performs 100,000 development-only case rolls from the seed catalog. It does not change real player balances or expose an endpoint to players. For a customized live case, use the current admin configuration to update a separate local test catalog before simulating.

## Troubleshooting

- **Connection unavailable / 503:** verify Supabase is running, both SQL files were applied, and the connection URI/password is correct. Provider downtime causes an error rather than replacing saved progress with a new local profile.
- **Request origin is not allowed:** set `APP_ORIGIN` to the exact origin you are visiting and redeploy. Do not include a path.
- **Wrong player/passcode:** names are case-insensitive, passcodes are case-sensitive. Do not create a second name to recover an old profile. Ask the owner to reset your passcode.
- **A request needs checking:** sign into the same player and use Reconnect & recover; inspect History before another play.
- **Too many attempts:** wait for the server rate-limit window to expire. This is intentional protection, not a progress reset.
- **Missing image:** check actual extension, capitalization, spaces, and whether the new asset was deployed before its database path changed.
- **A completion paid nothing:** already-awarded groups cannot pay a second time, including after inventory reset. New group changes are evaluated when the next item is acquired.
- **New code did not appear:** ensure files are extracted into the GitHub repository root, commit/push the change, and check the Vercel deployment log. Do not upload `node_modules`, `.next`, `.env.local`, or `.local-db`.

## Hosting limits and operational checks

This private non-commercial friends game fits the intended use of [Vercel Hobby](https://vercel.com/docs/plans/hobby). [Supabase connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres) recommends transaction pooling for serverless functions. Both services have free-tier quotas and availability policies that can change; monitor their dashboards and maintain backups. No application can promise zero bugs or immunity to lost/deleted hosting accounts.

Before inviting everyone, create one real test player on the deployed URL, claim a reward, open a case, close the page mid-animation, sign back in, verify History/Inventory/balance, try the mini-games, and confirm the normal player cannot open protected admin data. Cloud setup and this final live smoke test require your Supabase/Vercel account configuration and have not been performed by merely producing this ZIP.
