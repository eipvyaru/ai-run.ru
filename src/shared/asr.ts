import { z } from "zod";

export const asrEngineSchema = z.enum(["browser", "sherpa"]);
export type AsrEngine = z.infer<typeof asrEngineSchema>;

export const asrStageSchema = z.enum(["permission", "recording", "transcribing", "fallback", "request"]);
export type AsrStage = z.infer<typeof asrStageSchema>;

export const asrErrorCodeSchema = z.enum([
  "audio-capture", "network", "no-speech", "not-allowed", "service-not-allowed",
  "browser-unsupported", "recording-failed", "decode-failed", "timeout", "busy",
  "server-error", "not-ready", "invalid-audio", "audio-too-long",
]);
export type AsrErrorCode = z.infer<typeof asrErrorCodeSchema>;
