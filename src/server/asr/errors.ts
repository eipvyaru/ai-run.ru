import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/server/db/database";
import { asrEngineSchema, asrErrorCodeSchema, asrStageSchema, type AsrEngine, type AsrErrorCode, type AsrStage } from "@/shared/asr";

export const ASR_ERROR_LIMIT = 1000;
export const ASR_EVENT_BYTE_LIMIT = 1024;

export type AsrErrorInput = {
  engine: AsrEngine | "fallback";
  stage: AsrStage;
  code: AsrErrorCode;
  durationMs?: number;
  httpStatus?: number;
};

export type AsrErrorRecord = AsrErrorInput & {
  id: number;
  createdAt: string;
  requestId: string;
  eventBytes: number;
};

export function recordAsrError(input: AsrErrorInput): void {
  const safe = {
    requestId: randomUUID(),
    createdAt: new Date().toISOString(),
    engine: z.enum(["browser", "sherpa", "fallback"]).parse(input.engine),
    stage: asrStageSchema.parse(input.stage),
    code: asrErrorCodeSchema.parse(input.code),
    durationMs: Math.max(0, Math.min(60000, Math.trunc(input.durationMs ?? 0))),
    httpStatus: input.httpStatus && input.httpStatus >= 100 && input.httpStatus <= 599 ? input.httpStatus : null,
  };
  if (safe.engine !== "fallback") asrEngineSchema.parse(safe.engine);
  const eventBytes = Buffer.byteLength(JSON.stringify(safe), "utf8");
  if (eventBytes > ASR_EVENT_BYTE_LIMIT) throw new Error("ASR event exceeds size limit");

  const database = db();
  database.exec("BEGIN IMMEDIATE");
  try {
    database.prepare(
      "INSERT INTO asr_errors(created_at,request_id,engine,stage,code,duration_ms,http_status,event_bytes) VALUES(?,?,?,?,?,?,?,?)",
    ).run(safe.createdAt, safe.requestId, safe.engine, safe.stage, safe.code, safe.durationMs, safe.httpStatus, eventBytes);
    database.prepare("DELETE FROM asr_errors WHERE id NOT IN (SELECT id FROM asr_errors ORDER BY id DESC LIMIT ?)").run(ASR_ERROR_LIMIT);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export function listAsrErrors(options: { page: number; pageSize: number; engine?: AsrEngine | "fallback"; code?: AsrErrorCode }) {
  const predicates: string[] = [];
  const values: (string | number)[] = [];
  if (options.engine) { predicates.push("engine=?"); values.push(options.engine); }
  if (options.code) { predicates.push("code=?"); values.push(options.code); }
  const where = predicates.length ? `WHERE ${predicates.join(" AND ")}` : "";
  const database = db();
  const total = (database.prepare(`SELECT COUNT(*) AS count FROM asr_errors ${where}`).get(...values) as { count: number }).count;
  const rows = database.prepare(
    `SELECT id,created_at AS createdAt,request_id AS requestId,engine,stage,code,duration_ms AS durationMs,http_status AS httpStatus,event_bytes AS eventBytes FROM asr_errors ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
  ).all(...values, options.pageSize, (options.page - 1) * options.pageSize) as AsrErrorRecord[];
  return { rows, total, page: options.page, pageSize: options.pageSize };
}

export function clearAsrErrors(): number {
  return Number(db().prepare("DELETE FROM asr_errors").run().changes);
}
