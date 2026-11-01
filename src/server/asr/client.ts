import { randomUUID } from "node:crypto";
import { env } from "@/server/config/env";

const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

export type AsrGatewayResult = { ok: true; requestId: string; text: string } | { ok: false; requestId: string; code: string; status: number };

export function isAllowedAsrEndpoint(endpoint: URL): boolean {
  const isLoopback = endpoint.hostname === "127.0.0.1" || endpoint.hostname === "localhost" || endpoint.hostname === "[::1]" || endpoint.hostname === "::1";
  const isComposeAsr = endpoint.hostname === "asr" && endpoint.protocol === "http:" && endpoint.port === "8796";
  return (isLoopback || isComposeAsr) && !endpoint.username && !endpoint.password;
}

function internalEndpoint(): URL {
  const endpoint = new URL(env().ASR_SERVICE_URL);
  if (!isAllowedAsrEndpoint(endpoint)) throw new Error("ASR service must use loopback or the private Docker ASR service");
  endpoint.pathname = `${endpoint.pathname.replace(/\/$/, "")}/transcribe`;
  endpoint.search = "";
  endpoint.hash = "";
  return endpoint;
}

export async function asrServiceReady(): Promise<boolean> {
  if (env().ASR_SERVICE_TOKEN.length < 32) return false;
  try {
    const endpoint = internalEndpoint();
    endpoint.pathname = endpoint.pathname.replace(/\/transcribe\/?$/, "/ready");
    const response = await fetch(endpoint, { cache: "no-store", signal: AbortSignal.timeout(1000) });
    return response.ok;
  } catch { return false; }
}

export async function transcribeWithSherpa(audio: File): Promise<AsrGatewayResult> {
  const requestId = randomUUID();
  if (audio.size <= 0 || audio.size > MAX_AUDIO_BYTES) return { ok: false, requestId, code: "AUDIO_TOO_LONG", status: 413 };
  const token = env().ASR_SERVICE_TOKEN;
  if (token.length < 32) return { ok: false, requestId, code: "ASR_NOT_READY", status: 503 };
  const form = new FormData();
  form.append("audio", audio, "recording.audio");
  try {
    const response = await fetch(internalEndpoint(), {
      method: "POST",
      headers: { "x-asr-token": token, "x-request-id": requestId },
      body: form,
      cache: "no-store",
      signal: AbortSignal.timeout(env().ASR_REQUEST_TIMEOUT_MS),
    });
    const body: unknown = await response.json().catch(() => null);
    if (response.ok && typeof body === "object" && body !== null && "text" in body && typeof body.text === "string" && body.text.length <= 4000) {
      return { ok: true, requestId, text: body.text };
    }
    const code = typeof body === "object" && body !== null && "code" in body && typeof body.code === "string" ? body.code : "ASR_FAILED";
    return { ok: false, requestId, code, status: response.status };
  } catch {
    return { ok: false, requestId, code: "ASR_UNAVAILABLE", status: 503 };
  }
}

export function publicAsrErrorCode(code: string): "not-ready" | "busy" | "timeout" | "invalid-audio" | "audio-too-long" | "no-speech" | "server-error" {
  switch (code) {
    case "ASR_NOT_READY": case "ASR_UNAVAILABLE": return "not-ready";
    case "ASR_BUSY": return "busy";
    case "ASR_TIMEOUT": return "timeout";
    case "AUDIO_INVALID": return "invalid-audio";
    case "AUDIO_TOO_LONG": return "audio-too-long";
    case "NO_SPEECH": return "no-speech";
    default: return "server-error";
  }
}

export function asrErrorStatus(code: string): number {
  switch (code) {
    case "ASR_BUSY": return 503;
    case "ASR_TIMEOUT": return 504;
    case "AUDIO_TOO_LONG": return 413;
    case "AUDIO_INVALID": return 400;
    case "NO_SPEECH": return 422;
    default: return 503;
  }
}
