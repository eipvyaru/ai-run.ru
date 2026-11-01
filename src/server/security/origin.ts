import type { NextRequest } from "next/server";
import { env } from "@/server/config/env";

export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return origin === request.nextUrl.origin || origin === env().APP_ORIGIN;
}
