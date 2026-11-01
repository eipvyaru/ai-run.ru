"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { recognizeMicrophone, recognizeRecordedBlob, type SpeechRecognition } from "@/client/asr/browser";
import { mergeTranscript } from "@/client/asr/draft";
import { startSherpaRecording, type RecordingHandle, type StopReason } from "@/client/asr/recording";
import type { AsrEngine, AsrErrorCode, AsrStage } from "@/shared/asr";

type Message = { role: "assistant" | "user" | "error"; text: string };
type AsrConfig = { engine: AsrEngine; modelReady: boolean; maxDurationSeconds: number; silenceMs: number; noSpeechMs: number };

const hello = "Здравствуйте! Я AI-секретарь AI-Run. Помогу подобрать время телефонного разговора с руководителем и задам несколько вопросов, чтобы мы могли заранее разобраться в вашей ситуации.\n\nДля продолжения подтвердите согласие с помощью галочки ниже.";
const voiceErrors: Record<string, string> = {
  "audio-capture": "Микрофон не найден или недоступен.",
  network: "Не удалось распознать речь из-за сетевой ошибки.",
  "no-speech": "Речь не распознана. Введите сообщение текстом.",
  "not-allowed": "Доступ к микрофону не предоставлен.",
  "service-not-allowed": "Распознавание речи заблокировано браузером.",
};
const asrErrorCodes = new Set<AsrErrorCode>([
  "audio-capture", "network", "no-speech", "not-allowed", "service-not-allowed", "browser-unsupported",
  "recording-failed", "decode-failed", "timeout", "busy", "server-error", "not-ready", "invalid-audio", "audio-too-long",
]);

function errorCode(error: unknown): AsrErrorCode {
  const raw = error instanceof Error ? error.message : "server-error";
  if (raw === "browser-track-unsupported" || raw === "browser-asr-unsupported") return "browser-unsupported";
  if (raw === "recording-unsupported" || raw === "recording-empty") return "recording-failed";
  if (raw === "AUDIO_INVALID") return "invalid-audio";
  if (raw === "AUDIO_TOO_LONG") return "audio-too-long";
  if (raw === "ASR_BUSY") return "busy";
  if (raw === "ASR_TIMEOUT" || raw === "timeout") return "timeout";
  if (raw === "ASR_NOT_READY" || raw === "ASR_UNAVAILABLE") return "not-ready";
  if (raw === "NO_SPEECH") return "no-speech";
  if (asrErrorCodes.has(raw as AsrErrorCode)) return raw as AsrErrorCode;
  return "server-error";
}

function stopMessage(reason: StopReason) {
  if (reason === "no-speech") return "Речь не обнаружена. Введите сообщение текстом; повторять диктовку не нужно.";
  if (reason === "maximum") return "Достигнут лимит записи 60 секунд. Обрабатываю уже записанный фрагмент.";
  return "Обрабатываю запись…";
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: hello }]);
  const [sessionId, setSessionId] = useState<string>();
  const [consented, setConsented] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [asrBusy, setAsrBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [voiceStatus, setVoiceStatus] = useState("");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [asrConfig, setAsrConfig] = useState<AsrConfig>({ engine: "sherpa", modelReady: false, maxDurationSeconds: 60, silenceMs: 2000, noSpeechMs: 10000 });
  const endRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recordingRef = useRef<RecordingHandle | null>(null);
  const fallbackAbortRef = useRef<AbortController | null>(null);
  const browserTimerRef = useRef<number | undefined>(undefined);
  const asrLockRef = useRef(false);
  const speechBaseRef = useRef("");
  const speechResultRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);
  useEffect(() => {
    aliveRef.current = true;
    void fetch("/api/asr/config", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const data = await response.json() as AsrConfig;
      if (aliveRef.current) setAsrConfig(data);
    }).catch(() => undefined);
    const onPageHide = () => {
      recordingRef.current?.cancel();
      recognitionRef.current?.abort();
      fallbackAbortRef.current?.abort();
      asrLockRef.current = false;
    };
    window.addEventListener("pagehide", onPageHide);
    return () => {
      aliveRef.current = false;
      window.removeEventListener("pagehide", onPageHide);
      if (browserTimerRef.current !== undefined) window.clearTimeout(browserTimerRef.current);
      recordingRef.current?.cancel();
      recognitionRef.current?.abort();
      fallbackAbortRef.current?.abort();
    };
  }, []);

  async function logVoiceError(engine: AsrEngine, stage: AsrStage, error: unknown, durationMs = 0) {
    if (!consented) return;
    const payload = { engine, stage, code: errorCode(error), durationMs: Math.min(60000, Math.max(0, Math.round(durationMs))) };
    try { await fetch("/api/asr/errors", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), keepalive: true }); } catch { /* Logging cannot block text entry. */ }
  }

  async function acceptConsent(checked: boolean) {
    if (!checked) return;
    setBusy(true);
    try {
      const response = await fetch("/api/consent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ consent: true }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Не удалось сохранить согласие");
      setSessionId(data.sessionId); setConsented(true);
      setMessages((current) => [...current, { role: "assistant", text: "Спасибо. Как я могу к вам обращаться?" }]);
    } catch (error) { setMessages((current) => [...current, { role: "error", text: error instanceof Error ? error.message : "Временная ошибка" }]); }
    finally { setBusy(false); }
  }

  function updateDraft(base: string, transcript: string) {
    speechResultRef.current = Boolean(transcript.trim());
    setInput(mergeTranscript(base, transcript));
  }

  function finishAsr(status: string, error = "") {
    asrLockRef.current = false;
    if (!aliveRef.current) return;
    setAsrBusy(false);
    setListening(false);
    setRecordingSeconds(0);
    setVoiceStatus(status);
    if (error) setVoiceError(error);
  }

  async function runRecordedFallback(blob: Blob, base: string, durationMs: number) {
    setVoiceStatus("Локальный распознаватель недоступен. Проверяю, может ли браузер обработать ту же запись…");
    const abort = new AbortController();
    fallbackAbortRef.current = abort;
    try {
      const text = await recognizeRecordedBlob(blob, (partial) => updateDraft(base, partial), abort.signal);
      if (!aliveRef.current || abort.signal.aborted) return;
      updateDraft(base, text);
      finishAsr("Речь распознана браузером из уже записанного аудио. Проверьте и отредактируйте текст перед отправкой.");
    } catch (error) {
      if (abort.signal.aborted || !aliveRef.current) return;
      await logVoiceError("browser", "fallback", error, durationMs);
      const detail = errorCode(error) === "browser-unsupported"
        ? "Этот браузер не умеет распознавать сохранённую запись."
        : "Не удалось распознать сохранённую запись.";
      finishAsr(`${detail} Введите сообщение текстом; повторять диктовку не нужно.`, `${detail} Введите сообщение текстом; повторять диктовку не нужно.`);
    } finally { fallbackAbortRef.current = null; }
  }

  async function processSherpaRecording(blob: Blob, base: string, durationMs: number) {
    if (blob.size > 8 * 1024 * 1024) {
      const error = new Error("AUDIO_TOO_LONG");
      await logVoiceError("sherpa", "recording", error, durationMs);
      finishAsr("Запись больше допустимого размера. Введите сообщение текстом; повторять диктовку не нужно.", "Запись больше допустимого размера.");
      return;
    }
    const body = new FormData();
    body.append("audio", blob, "recording.audio");
    setVoiceStatus("Распознаю запись локальной моделью…");
    let failure = "";
    try {
      const response = await fetch("/api/asr/transcribe", { method: "POST", body, cache: "no-store", signal: AbortSignal.timeout(50000) });
      const data = await response.json() as { text?: string; code?: string; fallback?: boolean };
      if (!response.ok || !data.text) {
        if (data.fallback) {
          await runRecordedFallback(blob, base, durationMs);
          return;
        }
        failure = data.code ?? "ASR_FAILED";
        throw new Error(failure);
      }
      updateDraft(base, data.text);
      finishAsr("Речь распознана локально. Проверьте и отредактируйте текст перед отправкой.");
    } catch (error) {
      failure ||= errorCode(error);
      await logVoiceError("sherpa", "transcribing", error, durationMs);
      if (failure === "CONSENT_REQUIRED" || failure === "INVALID_ORIGIN") {
        finishAsr("Сессия или доступ завершились. Введите сообщение текстом; повторять диктовку не нужно.", "Аудиозапись не была обработана.");
        return;
      }
      await runRecordedFallback(blob, base, durationMs);
    }
  }

  async function startSherpaInput() {
    const base = input.trimEnd();
    speechBaseRef.current = base;
    setVoiceError("");
    setVoiceStatus("Запрашиваю доступ к микрофону…");
    setAsrBusy(true);
    try {
      const handle = await startSherpaRecording({
        silenceMs: asrConfig.silenceMs,
        noSpeechMs: asrConfig.noSpeechMs,
        maxDurationMs: asrConfig.maxDurationSeconds * 1000,
        onTick: setRecordingSeconds,
      });
      recordingRef.current = handle;
      setListening(true);
      setVoiceStatus("Идёт запись. Остановится через 2 секунды тишины или не позднее 60 секунд.");
      const recording = await handle.finished;
      recordingRef.current = null;
      setListening(false);
      if (recording.reason === "no-speech") {
        await logVoiceError("sherpa", "recording", new Error("no-speech"), recording.durationMs);
        finishAsr(stopMessage(recording.reason), "Речь не обнаружена.");
        return;
      }
      setVoiceStatus(stopMessage(recording.reason));
      await processSherpaRecording(recording.blob, base, recording.durationMs);
    } catch (error) {
      recordingRef.current = null;
      if (error instanceof Error && error.message === "recording-cancelled") {
        if (aliveRef.current) finishAsr("Запись отменена.");
        return;
      }
      await logVoiceError("sherpa", "permission", error, 0);
      const code = errorCode(error);
      const message = code === "not-allowed" ? voiceErrors["not-allowed"] : code === "recording-failed" ? "Запись не поддерживается или не запустилась." : "Не удалось получить доступ к микрофону.";
      finishAsr(`${message} Введите сообщение текстом; повторять диктовку не нужно.`, message);
    }
  }

  function startBrowserInput() {
    const base = input.trimEnd();
    speechBaseRef.current = base;
    speechResultRef.current = false;
    setVoiceError("");
    setVoiceStatus("Распознавание выполняет браузер; проверьте текст перед отправкой.");
    setAsrBusy(true);
    asrLockRef.current = true;
    try {
      const recognition = recognizeMicrophone(
        (text) => updateDraft(base, text),
        (event) => {
          if (event.name === "aborted") return;
          const message = voiceErrors[event.name] ?? "Не удалось распознать речь. Введите сообщение текстом.";
          setVoiceError(message);
          void logVoiceError("browser", event.name === "not-allowed" || event.name === "audio-capture" ? "permission" : "transcribing", event.name, 0);
        },
        () => {
          if (browserTimerRef.current !== undefined) window.clearTimeout(browserTimerRef.current);
          recognitionRef.current = null;
          if (!speechResultRef.current && !voiceError) setVoiceStatus("Речь не распознана. Введите сообщение текстом; повторять диктовку не нужно.");
          finishAsr(speechResultRef.current ? "Проверьте и отредактируйте распознанный текст перед отправкой." : "Введите сообщение текстом; повторять диктовку не нужно.");
        },
      );
      recognitionRef.current = recognition as unknown as SpeechRecognition;
      setListening(true);
      browserTimerRef.current = window.setTimeout(() => recognition.stop(), 60000);
    } catch (error) {
      setAsrBusy(false);
      asrLockRef.current = false;
      const message = "Голосовой ввод не поддерживается или не запустился. Введите сообщение текстом.";
      setVoiceError(message);
      setVoiceStatus(message);
      void logVoiceError("browser", "permission", error, 0);
    }
  }

  function stopVoiceInput() {
    if (recordingRef.current) {
      setVoiceStatus("Останавливаю запись и жду последние аудиоданные…");
      recordingRef.current.stop("manual");
      return;
    }
    recognitionRef.current?.stop();
  }

  function toggleVoiceInput() {
    if (listening) { stopVoiceInput(); return; }
    if (!consented || busy || asrLockRef.current) return;
    asrLockRef.current = true;
    if (asrConfig.engine === "browser") startBrowserInput();
    else void startSherpaInput();
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    recognitionRef.current?.abort();
    recordingRef.current?.cancel();
    setListening(false);
    const text = input.trim();
    if (!text || busy || asrBusy || !consented) return;
    setInput(""); setMessages((current) => [...current, { role: "user", text }]); setBusy(true);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId, message: text }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Не удалось получить ответ");
      setSessionId(data.sessionId); setMessages((current) => [...current, { role: "assistant", text: data.message }]);
    } catch (error) { setInput(text); setMessages((current) => [...current, { role: "error", text: error instanceof Error ? error.message : "Временная ошибка. Повторите сообщение." }]); }
    finally { setBusy(false); }
  }

  return <section className="chat-card" aria-label="AI-секретарь">
    <div className="chat-head"><div className="chat-person"><span className="chat-avatar">AI</span><div><strong>AI-секретарь</strong><small>Поможет назначить разговор</small></div></div><span className="online" aria-label="Онлайн" /></div>
    <div className="chat-messages" aria-live="polite">{messages.map((message, index) => <div className={`bubble ${message.role}`} key={index}>{message.text}</div>)}{busy && <div className="bubble assistant typing">Печатает…</div>}<div ref={endRef}/></div>
    <form className="chat-form" onSubmit={send}>
      <div className="chat-compose">
        <textarea aria-label="Сообщение" rows={2} value={input} onChange={(event) => setInput(event.target.value)} placeholder={consented ? "Напишите сообщение…" : "Сначала подтвердите согласие"} disabled={!consented || busy || (asrBusy && !listening)} readOnly={listening} maxLength={2000}/>
        <button className={`voice-button${listening ? " listening" : ""}`} type="button" disabled={!consented || busy || (asrBusy && !listening)} onClick={toggleVoiceInput} aria-label={listening ? "Остановить голосовой ввод" : "Начать голосовой ввод"} aria-pressed={listening} title={listening ? "Остановить голосовой ввод" : "Голосовой ввод"}>
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V22h2v-3.08A7 7 0 0 0 19 12h-2Z"/></svg>
        </button>
        <button className="send-button" type="submit" disabled={!consented || busy || asrBusy || !input.trim()} aria-label="Отправить">↑</button>
      </div>
      {listening && asrConfig.engine === "sherpa" && <button className="asr-stop-button" type="button" onClick={stopVoiceInput}>Остановить · {recordingSeconds} сек.</button>}
      {consented && <p className="asr-privacy-note">{asrConfig.engine === "sherpa" ? "Основное распознавание выполняется локальной моделью. При её сбое браузер может обработать уже записанное аудио. Новая запись автоматически не запускается." : "Выбрано браузерное распознавание. Браузер может передавать аудио своему сервису распознавания."}</p>}
      {(asrBusy || voiceError || voiceStatus) && <p className={`voice-status${voiceError ? " error" : ""}`} aria-live="polite">{voiceError && <span>{voiceError} </span>}{voiceStatus && voiceStatus !== voiceError && <span>{voiceStatus}</span>}</p>}
    </form>
    {!consented && <label className="consent"><input type="checkbox" checked={false} disabled={busy} onChange={(event) => acceptConsent(event.target.checked)}/><span>Я даю согласие на обработку моих персональных данных в соответствии с <Link href="/legal/privacy" target="_blank" rel="noreferrer">Политикой обработки персональных данных</Link>. Я обязуюсь здесь не указывать никакие свои персональные данные кроме имени и телефона.</span></label>}
  </section>;
}
