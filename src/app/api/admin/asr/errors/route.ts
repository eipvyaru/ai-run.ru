import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/server/auth/admin";
import { clearAsrErrors, listAsrErrors } from "@/server/asr/errors";
import { isSameOrigin } from "@/server/security/origin";
import { asrEngineSchema, asrErrorCodeSchema } from "@/shared/asr";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const params = request.nextUrl.searchParams;
  const parsed = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(50), engine: asrEngineSchema.or(z.literal("fallback")).optional(), code: asrErrorCodeSchema.optional(), format: z.enum(["json", "csv"]).default("json") }).safeParse(Object.fromEntries(params));
  if (!parsed.success) return NextResponse.json({ error: "Некорректные параметры журнала" }, { status: 400 });
  const { format, ...options } = parsed.data;
  const result = listAsrErrors(options);
  if (format === "csv") {
    const rows = Array.from({ length: Math.ceil(result.total / 100) }, (_, index) => listAsrErrors({ ...options, page: index + 1, pageSize: 100 }).rows).flat();
    const header = "createdAt,requestId,engine,stage,code,durationMs,httpStatus,eventBytes";
    const lines = rows.map((row) => [row.createdAt, row.requestId, row.engine, row.stage, row.code, row.durationMs, row.httpStatus ?? "", row.eventBytes].join(","));
    return new NextResponse([header, ...lines].join("\r\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=ai-run-asr-errors.csv", "Cache-Control": "no-store" } });
  }
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const confirmation = request.headers.get("x-confirm-clear-asr-log");
  if (confirmation !== "yes") return NextResponse.json({ error: "Подтвердите очистку журнала" }, { status: 400 });
  return NextResponse.json({ deleted: clearAsrErrors() }, { headers: { "Cache-Control": "no-store" } });
}
