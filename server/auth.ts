import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { DB } from "./db";
import type { Player } from "@/lib/types";
import {
  hashPassword,
  verifyPassword,
  equalSecret,
  rateLimit,
  newSession,
  GameError,
} from "./security";
import { readCatalog } from "./catalog";
import { changeBalance } from "./game";
const credentials = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(30)
    .regex(/^[\p{L}\p{N} _.-]+$/u),
  passcode: z.string().min(6).max(128),
  create: z.boolean(),
  invite: z.string().max(200).optional(),
});
export async function authenticate(db: DB, input: unknown, ip: string) {
  const data = credentials.parse(input);
  await rateLimit(db, "auth:ip:" + ip, 30);
  await rateLimit(db, "auth:name:" + data.name.toLowerCase(), 10);
  if (data.create) {
    if (
      !process.env.INVITE_CODE ||
      !equalSecret(data.invite ?? "", process.env.INVITE_CODE)
    )
      throw new GameError("The friends invite code is incorrect.", 403);
    const pin = await hashPassword(data.passcode);
    return db.transaction(async (tx) => {
      await tx.query("SELECT id FROM spunk.settings WHERE id=1 FOR SHARE");
      const p: Player = {
        id: randomUUID(),
        name: data.name,
        balance: 0,
        daily_at: null,
        free_at: null,
        first_case_day: null,
      };
      const inserted = await tx.query(
        "INSERT INTO spunk.players(id,name,pin_hash) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING id",
        [p.id, p.name, pin],
      );
      if (!inserted.length)
        throw new GameError(
          "That player name already exists. Sign in instead.",
          409,
        );
      const c = await readCatalog(tx);
      await changeBalance(
        tx,
        p,
        c.settings.startingBalance,
        "STARTING_BALANCE",
        p.id,
      );
      return newSession(tx, "player", p.id);
    });
  }
  const [p] = await db.query<{ id: string; pin_hash: string }>(
    "SELECT id,pin_hash FROM spunk.players WHERE lower(name)=lower($1)",
    [data.name],
  );
  // Always run scrypt, including unknown names.
  const fallback = "00000000000000000000000000000000:" + "00".repeat(64);
  const valid = await verifyPassword(data.passcode, p?.pin_hash ?? fallback);
  if (!p || !valid) throw new GameError("Name or passcode is incorrect.", 401);
  return newSession(db, "player", p.id);
}
export async function authenticateAdmin(db: DB, input: unknown, ip: string) {
  const { password } = z
    .object({ password: z.string().min(1).max(256) })
    .parse(input);
  await rateLimit(db, "admin:" + ip, 5);
  await rateLimit(db, "admin:global", 30);
  if (
    !process.env.ADMIN_PASSWORD_HASH ||
    !(await verifyPassword(password, process.env.ADMIN_PASSWORD_HASH))
  )
    throw new GameError("Admin password is incorrect.", 401);
  return newSession(db, "admin", null);
}
