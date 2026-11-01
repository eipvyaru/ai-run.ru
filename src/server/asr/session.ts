import type { NextRequest } from "next/server";
import { db } from "@/server/db/database";
import { verify } from "@/server/security/crypto";

export function consentedSession(request: NextRequest): string | null {
  const id = verify(request.cookies.get("ai_run_session")?.value);
  if (!id) return null;
  const session = db().prepare("SELECT consented_at,expires_at FROM sessions WHERE id=?").get(id) as { consented_at: string | null; expires_at: string } | undefined;
  if (!session?.consented_at || Date.parse(session.expires_at) <= Date.now()) return null;
  return id;
}
