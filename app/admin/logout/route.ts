import type { NextRequest } from "next/server";
import { handleApi } from "@/server/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export function POST(request: NextRequest) {
  return handleApi(request, "admin/logout");
}
