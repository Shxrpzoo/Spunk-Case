import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
import type { DB } from "./db";
const scrypt = promisify(scryptCallback);
export class GameError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return salt + ":" + key.toString("hex");
}
export async function verifyPassword(password: string, stored: string) {
  const [salt, hex] = stored.split(":");
  if (!salt || !hex || hex.length !== 128) return false;
  const key = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hex, "hex");
  return key.length === expected.length && timingSafeEqual(key, expected);
}
export function equalSecret(a: string, b: string) {
  return timingSafeEqual(Buffer.from(digest(a)), Buffer.from(digest(b)));
}
export async function rateLimit(db: DB, key: string, max = 10, seconds = 900) {
  const [r] = await db.query<{ count: number }>(
    `INSERT INTO spunk.rate_limits(key,count,expires_at) VALUES($1,1,now()+$2*interval '1 second') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN spunk.rate_limits.expires_at<now() THEN 1 ELSE spunk.rate_limits.count+1 END,expires_at=CASE WHEN spunk.rate_limits.expires_at<now() THEN now()+$2*interval '1 second' ELSE spunk.rate_limits.expires_at END RETURNING count`,
    [digest(key), seconds],
  );
  if (r.count > max)
    throw new GameError("Too many attempts. Please wait and try again.", 429);
}
export async function newSession(
  db: DB,
  role: "player" | "admin",
  playerId: string | null,
) {
  const token = randomBytes(32).toString("hex");
  const days = role === "admin" ? 1 : 90;
  await db.query("DELETE FROM spunk.sessions WHERE expires_at<now()");
  await db.query(
    `INSERT INTO spunk.sessions VALUES($1,$2,$3,now()+$4*interval '1 day')`,
    [digest(token), playerId, role, days],
  );
  return { token, days };
}
export async function session(
  db: DB,
  token: string | undefined,
  role: "player" | "admin",
) {
  if (!token) throw new GameError("Please sign in.", 401);
  const [s] = await db.query<{ player_id: string | null }>(
    "SELECT player_id FROM spunk.sessions WHERE token_hash=$1 AND role=$2 AND expires_at>now()",
    [digest(token), role],
  );
  if (!s)
    throw new GameError(
      "Your session expired. Sign in to recover your saved progress.",
      401,
    );
  return s;
}
