# Verification — Spunk Cases v2

Validated locally on 15 September 2026:

- Production `next build --webpack` passed, including TypeScript and API route validation.
- 28 PostgreSQL-compatible integration/migration tests passed.
- All 108 catalog image paths exist with exact filename casing.
- Migration starts from the original 22-item schema, reaches 108 items, preserves
  player balance, password hash, timestamps, quantities and previous rewards,
  and does not reset later card effects when rerun.
- Tests cover chosen-effect success/failure, single-copy destruction, selling,
  effect replacement, all four Nugget multipliers, moved win-zone wraparound,
  preserved probabilities, idempotent retries, concurrency, balance ledgers,
  collection rewards, coin results, admin controls, and leaderboard rankings.
- Browser checks covered case selection, Basic/Ash opening, reveal collection,
  effect upgrades, sale proceeds, coin flip, Satchel contents, chosen-effect
  failure removing one copy, Nugget mode, and all three leaderboard tabs.
- Collection Load more increased Satchel cards from 24 to 48 to 58.
- Desktop and 390x844 mobile checks found no document-wide horizontal overflow.
  The wide leaderboard table intentionally scrolls horizontally on small screens.
- Removed requested slogans are absent from the frontend source.
- Original artwork folders were left unchanged. WebP derivatives total 3,345,128 bytes.

These checks do not claim a live Vercel/Supabase deployment. The owner must run
UPDATE-V2.sql in the existing Supabase project, then deploy the extracted files.
Existing environment values and database identity must be retained.

Sound uses an original synthesized mechanical tick, not an exact CS2 recording.
