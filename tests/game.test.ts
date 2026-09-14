import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import type { DB } from "../server/db";
import { seedCatalog, rarities, chance } from "../lib/catalog";
import { catalogSchema, writeCatalog, readCatalog } from "../server/catalog";
import {
  play,
  weightedRoll,
  getState,
  changeBalance,
  awardCompletions,
} from "../server/game";
import {
  hashPassword,
  verifyPassword,
  session,
  newSession,
  rateLimit,
} from "../server/security";
import { authenticate } from "../server/auth";
import { adminMutate, adminOverview } from "../server/admin";
import type { Player } from "../lib/types";

test("authoritative PostgreSQL game integration", async (t) => {
  const pg = new PGlite();
  await pg.exec(await readFile("database/schema.sql", "utf8"));
  function wrap(client: Pick<PGlite, "query">): DB {
    return {
      query: async <T>(q: string, p: unknown[] = []) =>
        (await client.query<T>(q, p)).rows,
      transaction: async (fn) => pg.transaction((tx) => fn(wrap(tx))),
    };
  }
  const db = wrap(pg);
  await writeCatalog(db, seedCatalog);
  async function player(balance = 2000) {
    const id = randomUUID();
    await db.query(
      "INSERT INTO spunk.players(id,name,pin_hash,balance) VALUES($1,$2,$3,$4)",
      [id, id, await hashPassword("secret123"), balance],
    );
    return id;
  }
  async function unlock(id: string) {
    await db.query("UPDATE spunk.players SET last_action_at=NULL WHERE id=$1", [
      id,
    ]);
  }
  async function ledger(id: string) {
    return db.query<{
      amount: number;
      balance_before: number;
      balance_after: number;
      type: string;
    }>("SELECT * FROM spunk.ledger WHERE player_id=$1 ORDER BY created_at,id", [
      id,
    ]);
  }
  const key = () => randomUUID();
  await t.test(
    "exact 100% distribution, intended rarity totals, unequal item weights and boundaries",
    () => {
      const c = seedCatalog.cases[0];
      assert.ok(
        Math.abs(c.weights.reduce((s, w) => s + w.weight, 0) - 100) < 1e-10,
      );
      assert.deepEqual(
        rarities.map((r) =>
          Number(
            seedCatalog.items
              .filter((i) => i.rarity === r)
              .reduce((s, i) => s + chance(c, i.id), 0)
              .toFixed(2),
          ),
        ),
        [52, 27, 13, 6, 1.75, 0.25],
      );
      assert.notEqual(chance(c, "ttg"), chance(c, "tony"));
      assert.equal(
        weightedRoll(
          [
            { itemId: "a", weight: 1 },
            { itemId: "b", weight: 3 },
          ],
          () => 0,
        ),
        "a",
      );
      assert.equal(
        weightedRoll(
          [
            { itemId: "a", weight: 1 },
            { itemId: "b", weight: 3 },
          ],
          () => 0.25,
        ),
        "b",
      );
    },
  );
  await t.test(
    "first case purchases, item save, +50 reward and UTC first-case bonus",
    async () => {
      const id = await player();
      const r = await play(
        db,
        id,
        { kind: "case", caseId: "basic", key: key() },
        () => 0,
      );
      assert.equal(r.balance, 1800);
      assert.equal(r.itemId, "angry-ash");
      const s = await getState(db, id);
      assert.equal(s.inventory[0].quantity, 1);
      assert.equal(s.history.length, 1);
      assert.equal(r.rewards.length, 2);
      assert.equal(
        (await ledger(id)).reduce((n, l) => n + Number(l.amount), 0),
        -200,
      );
    },
  );
  await t.test("insufficient funds rolls back every write", async () => {
    const id = await player(499);
    await assert.rejects(
      play(db, id, { kind: "case", caseId: "basic", key: key() }),
      /Not enough/,
    );
    const s = await getState(db, id);
    assert.equal(Number(s.player.balance), 499);
    assert.equal(s.inventory.length, 0);
    assert.equal((await ledger(id)).length, 0);
  });
  await t.test(
    "duplicate quantity and +100; first case bonus only once on UTC date",
    async () => {
      const id = await player();
      await play(
        db,
        id,
        { kind: "case", caseId: "basic", key: key() },
        () => 0,
      );
      await unlock(id);
      const r = await play(
        db,
        id,
        { kind: "case", caseId: "basic", key: key() },
        () => 0,
      );
      assert.equal(r.balance, 1450);
      assert.equal(r.duplicate, true);
      assert.equal(
        r.rewards.some((x) => x.label === "FIRST CASE TODAY"),
        false,
      );
      assert.equal((await getState(db, id)).inventory[0].quantity, 2);
    },
  );
  await t.test("first-case reward resets on a later UTC date", async () => {
    const id = await player();
    await db.query(
      "UPDATE spunk.players SET first_case_day='2020-01-01' WHERE id=$1",
      [id],
    );
    const r = await play(
      db,
      id,
      { kind: "case", caseId: "basic", key: key() },
      () => 0,
    );
    assert.ok(r.rewards.some((x) => x.label === "FIRST CASE TODAY"));
  });
  await t.test(
    "daily and five-minute reward cooldowns use database time",
    async () => {
      const id = await player();
      assert.equal(
        (await play(db, id, { kind: "daily", key: key() })).balance,
        2500,
      );
      await unlock(id);
      await assert.rejects(
        play(db, id, { kind: "daily", key: key() }),
        /cooldown/,
      );
      assert.equal(
        (await play(db, id, { kind: "free", key: key() })).balance,
        3000,
      );
      await unlock(id);
      await assert.rejects(
        play(db, id, { kind: "free", key: key() }),
        /cooldown/,
      );
      await db.query(
        "UPDATE spunk.players SET free_at=now()-interval '301 seconds',daily_at=now()-interval '25 hours' WHERE id=$1",
        [id],
      );
      assert.equal(
        (await play(db, id, { kind: "free", key: key() })).balance,
        3500,
      );
      await unlock(id);
      assert.equal(
        (await play(db, id, { kind: "daily", key: key() })).balance,
        4000,
      );
    },
  );
  await t.test(
    "identical retry replays outcome without a second charge",
    async () => {
      const id = await player(),
        a = { kind: "case", caseId: "basic", key: key() };
      const r = await play(db, id, a, () => 0);
      assert.deepEqual(await play(db, id, a, () => 0.9), r);
      assert.equal((await getState(db, id)).history.length, 1);
      await assert.rejects(
        play(db, id, { kind: "free", key: a.key }),
        /different action/,
      );
    },
  );
  await t.test(
    "rapid parallel identical requests produce one saved action",
    async () => {
      const id = await player(),
        a = { kind: "case", caseId: "basic", key: key() };
      const [r1, r2] = await Promise.all([
        play(db, id, a, () => 0),
        play(db, id, a, () => 0.9),
      ]);
      assert.deepEqual(r1, r2);
      assert.equal((await getState(db, id)).inventory[0].quantity, 1);
    },
  );
  await t.test(
    "rapid distinct requests cannot double spend or claim",
    async () => {
      const id = await player(500);
      const r = await Promise.allSettled([
        play(db, id, { kind: "case", caseId: "basic", key: key() }, () => 0),
        play(db, id, { kind: "case", caseId: "basic", key: key() }, () => 0),
      ]);
      assert.equal(r.filter((x) => x.status === "fulfilled").length, 1);
      assert.equal((await getState(db, id)).player.balance, 300);
    },
  );
  await t.test(
    "rarity and line awards are exactly once, including after reset and reacquisition",
    async () => {
      const id = await player(),
        p = (
          await db.query<Player>("SELECT * FROM spunk.players WHERE id=$1", [
            id,
          ])
        )[0];
      for (const i of seedCatalog.items)
        await db.query(
          "INSERT INTO spunk.player_items(player_id,item_id,quantity) VALUES($1,$2,1)",
          [id, i.id],
        );
      let rewards: { label: string; amount: number }[] = [];
      await db.transaction((tx) =>
        awardCompletions(tx, p, seedCatalog, key(), rewards),
      );
      assert.equal(rewards.length, 12);
      const expected =
        2000 +
        Object.values(seedCatalog.settings.rarityRewards).reduce(
          (a, b) => a + b,
          0,
        ) +
        seedCatalog.lines.reduce((a, b) => a + b.reward, 0);
      assert.equal(Number(p.balance), expected);
      rewards = [];
      await awardCompletions(db, p, seedCatalog, key(), rewards);
      assert.equal(rewards.length, 0);
      await adminMutate(db, {
        action: "reset-collection",
        playerId: id,
        key: key(),
        confirmation: "RESET",
      });
      for (const i of seedCatalog.items)
        await db.query(
          "INSERT INTO spunk.player_items(player_id,item_id,quantity) VALUES($1,$2,1)",
          [id, i.id],
        );
      await awardCompletions(db, p, seedCatalog, key(), rewards);
      assert.equal(rewards.length, 0);
    },
  );
  await t.test(
    "all upgrader options return correct wins and losses",
    async () => {
      for (const m of [1.5, 2, 5, 10, 20]) {
        const id = await player();
        const win = await play(
          db,
          id,
          { kind: "upgrade", wager: 101, multiplier: m, key: key() },
          () => 0,
        );
        assert.equal(win.payout, Math.floor(101 * m));
        assert.equal(win.balance, 2000 - 101 + Math.floor(101 * m));
        await unlock(id);
        const lose = await play(
          db,
          id,
          { kind: "upgrade", wager: 100, multiplier: m, key: key() },
          () => 0.999,
        );
        assert.equal(lose.won, false);
        assert.equal(lose.balance, win.balance - 100);
      }
    },
  );
  await t.test("coin flip is 50/50 with 2x total return", async () => {
    const id = await player();
    const win = await play(
      db,
      id,
      { kind: "coin", wager: 500, face: "HEADS", key: key() },
      () => 0.4999,
    );
    assert.equal(win.balance, 2500);
    assert.equal(win.face, "HEADS");
    await unlock(id);
    const loss = await play(
      db,
      id,
      { kind: "coin", wager: 500, face: "HEADS", key: key() },
      () => 0.5,
    );
    assert.equal(loss.face, "TAILS");
    assert.equal(loss.balance, 2000);
  });
  await t.test(
    "server rejects negative/fractional/excessive wagers and unknown multipliers",
    async () => {
      const id = await player();
      for (const wager of [-1, 1.1, 1000001])
        await assert.rejects(
          play(db, id, { kind: "coin", wager, face: "HEADS", key: key() }),
        );
      await assert.rejects(
        play(db, id, {
          kind: "upgrade",
          wager: 100,
          multiplier: 100,
          key: key(),
        }),
      );
    },
  );
  await t.test(
    "ledger equations and balance chain remain correct",
    async () => {
      const id = await player(0),
        p = (
          await db.query<Player>("SELECT * FROM spunk.players WHERE id=$1", [
            id,
          ])
        )[0];
      await changeBalance(db, p, 2000, "STARTING_BALANCE", key());
      await play(
        db,
        id,
        { kind: "coin", wager: 400, face: "TAILS", key: key() },
        () => 0.75,
      );
      await unlock(id);
      await play(db, id, { kind: "free", key: key() });
      const entries = await ledger(id);
      assert.ok(
        entries.every(
          (e) =>
            Number(e.balance_before) + Number(e.amount) ===
            Number(e.balance_after),
        ),
      );
      assert.equal(
        entries.reduce((n, e) => n + Number(e.amount), 0),
        (await getState(db, id)).player.balance,
      );
    },
  );
  await t.test(
    "tampering with client reward, balance, result and probability does not change server result",
    async () => {
      const id = await player();
      const out = await play(
        db,
        id,
        {
          kind: "coin",
          wager: 100,
          face: "HEADS",
          key: key(),
          balance: 99999999,
          payout: 999999,
          won: true,
          chance: 100,
        },
        () => 0.99,
      );
      assert.equal(out.won, false);
      assert.equal(out.balance, 1900);
    },
  );
  await t.test(
    "PIN hashing, invitation and role separation protect accounts",
    async () => {
      const h = await hashPassword("abcdef");
      assert.equal(await verifyPassword("abcdef", h), true);
      assert.equal(await verifyPassword("nope", h), false);
      const id = await player();
      const s = await newSession(db, "player", id);
      assert.equal((await session(db, s.token, "player")).player_id, id);
      await assert.rejects(session(db, s.token, "admin"), /session expired/);
      process.env.INVITE_CODE = "invite-test";
      await assert.rejects(
        authenticate(
          db,
          {
            name: "Test Player",
            passcode: "abcdef",
            create: true,
            invite: "wrong",
          },
          "test",
        ),
        /invite/,
      );
      const created = await authenticate(
        db,
        {
          name: "Test Player",
          passcode: "abcdef",
          create: true,
          invite: "invite-test",
        },
        "test",
      );
      const login = await authenticate(
        db,
        { name: "test player", passcode: "abcdef", create: false },
        "test",
      );
      assert.equal(
        (await session(db, created.token, "player")).player_id,
        (await session(db, login.token, "player")).player_id,
      );
    },
  );
  await t.test(
    "database-backed rate limiting persists across calls",
    async () => {
      await rateLimit(db, "rate-test", 2);
      await rateLimit(db, "rate-test", 2);
      await assert.rejects(rateLimit(db, "rate-test", 2), /Too many/);
    },
  );
  await t.test(
    "admin adjustment is idempotent, audited and cannot make negative balances",
    async () => {
      const id = await player(),
        a = { action: "add", playerId: id, amount: 500, key: key() };
      await adminMutate(db, a);
      await adminMutate(db, a);
      assert.equal((await getState(db, id)).player.balance, 2500);
      await assert.rejects(
        adminMutate(db, {
          action: "remove",
          playerId: id,
          amount: 3000,
          key: key(),
        }),
        /Not enough/,
      );
      const overview = await adminOverview(db);
      assert.ok(overview.audit.length > 0);
    },
  );
  await t.test(
    "invalid catalog cannot corrupt active odds, images, or saved IDs",
    async () => {
      const c = structuredClone(seedCatalog);
      c.cases[0].weights[0].weight = -1;
      assert.equal(catalogSchema.safeParse(c).success, false);
      const broken = structuredClone(seedCatalog);
      broken.items[0].image = "https://evil.example/a.png";
      assert.equal(catalogSchema.safeParse(broken).success, false);
      const removed = structuredClone(seedCatalog);
      removed.items = [];
      await assert.rejects(db.transaction((tx) => writeCatalog(tx, removed)));
      assert.equal((await readCatalog(db)).items.length, 22);
    },
  );
  await pg.close();
});
