import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getDB } from "@/server/db";
import { authenticate, authenticateAdmin } from "@/server/auth";
import { GameError, session, digest, rateLimit } from "@/server/security";
import { getState, play } from "@/server/game";
import { adminOverview, adminMutate, inspectPlayer } from "@/server/admin";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
type Context = { params: Promise<{ path: string[] }> };
async function handler(req: NextRequest, ctx: Context) {
  try {
    const path = (await ctx.params).path.join("/"),
      isPost = req.method === "POST";
    if (isPost) {
      const origin = req.headers.get("origin");
      const allowed = process.env.APP_ORIGIN;
      if (!allowed)
        throw new GameError("Owner must set APP_ORIGIN before playing.", 503);
      if (origin !== new URL(allowed).origin)
        throw new GameError("Request origin is not allowed.", 403);
      if (!req.headers.get("content-type")?.startsWith("application/json"))
        throw new GameError("JSON request required.", 415);
    }
    const db = await getDB();
    // On Vercel this header is supplied by the platform. Name limits remain authoritative too.
    const ip =
      req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ??
      "local";
    let body: unknown = {};
    if (isPost) {
      const raw = await req.text();
      if (raw.length > 200000)
        throw new GameError("Request is too large.", 413);
      try {
        body = JSON.parse(raw);
      } catch {
        throw new GameError("Invalid JSON.");
      }
    }
    const ok = (value: unknown) =>
      NextResponse.json(value, {
        headers: { "Cache-Control": "no-store, private" },
      });
    if (isPost && (path === "auth" || path === "admin/auth")) {
      const admin = path.startsWith("admin");
      const s = admin
        ? await authenticateAdmin(db, body, ip)
        : await authenticate(db, body, ip);
      const response = ok({ ok: true });
      response.cookies.set(admin ? "spunk_admin" : "spunk_player", s.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: s.days * 86400,
      });
      return response;
    }
    if (isPost && (path === "logout" || path === "admin/logout")) {
      const name = path.startsWith("admin") ? "spunk_admin" : "spunk_player";
      const token = req.cookies.get(name)?.value;
      if (token)
        await db.query("DELETE FROM spunk.sessions WHERE token_hash=$1", [
          digest(token),
        ]);
      const r = ok({ ok: true });
      r.cookies.delete(name);
      return r;
    }
    if (path.startsWith("admin/")) {
      await session(db, req.cookies.get("spunk_admin")?.value, "admin");
      if (path === "admin/state" && !isPost) return ok(await adminOverview(db));
      if (path === "admin/player" && !isPost)
        return ok(
          await inspectPlayer(db, req.nextUrl.searchParams.get("id") ?? ""),
        );
      if (path === "admin/mutate" && isPost) {
        await rateLimit(db, "admin-mutate", 120, 60);
        return ok(await adminMutate(db, body));
      }
    } else {
      const s = await session(
        db,
        req.cookies.get("spunk_player")?.value,
        "player",
      );
      const id = s.player_id!;
      if (path === "state" && !isPost) return ok(await getState(db, id));
      if (path === "play" && isPost) {
        await rateLimit(db, "play:" + id, 100, 60);
        return ok(await play(db, id, body));
      }
    }
    throw new GameError("Not found.", 404);
  } catch (e) {
    if (e instanceof ZodError)
      return NextResponse.json(
        { error: e.issues.map((i) => i.message).join(" ") },
        { status: 400 },
      );
    if (e instanceof GameError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(
      "SPUNK API:",
      e instanceof Error ? e.message : "Unknown error",
    );
    return NextResponse.json(
      {
        error:
          "The server could not complete this request. If you were playing, reconnect to check your saved result before trying again.",
      },
      { status: 503 },
    );
  }
}
export const GET = handler;
export const POST = handler;
