"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";

type Message = { role: "assistant" | "user" | "error"; text: string };
type SpeechResult = { readonly isFinal: boolean; readonly 0: { readonly transcript: string } };
type SpeechRecognitionEvent = Event & { readonly results: ArrayLike<SpeechResult> };
type SpeechRecognitionErrorEvent = Event & { readonly error: string };
type SpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionConstructor = new () => SpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const hello = "Здравствуйте! Я AI-секретарь AI-Run. Помогу подобрать время телефонного разговора с руководителем и задам несколько вопросов, чтобы мы могли заранее разобраться в вашей ситуации.\n\nДля продолжения подтвердите согласие с помощью галочки ниже.";
const voiceErrors: Record<string, string> = {
  "audio-capture": "Микрофон не найден или недоступен.",
  "network": "Не удалось распознать речь из-за сетевой ошибки.",
  "no-speech": "Речь не распознана. Попробуйте ещё раз.",
  "not-allowed": "Доступ к микрофону не предоставлен.",
  "service-not-allowed": "Распознавание речи заблокировано браузером.",
};

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: hello }]);
  const [sessionId, setSessionId] = useState<string>();
  const [consented, setConsented] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const speechBaseRef = useRef("");

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);
  useEffect(() => () => recognitionRef.current?.abort(), []);

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

  function stopVoiceInput() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  function toggleVoiceInput() {
    if (listening) {
      stopVoiceInput();
      return;
    }
    if (!consented || busy) return;

    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceError("Голосовой ввод не поддерживается этим браузером.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "ru-RU";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    speechBaseRef.current = input.trimEnd();
    recognitionRef.current = recognition;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = 0; index < event.results.length; index += 1) transcript += event.results[index][0].transcript;
      const separator = speechBaseRef.current && transcript ? " " : "";
      setInput(`${speechBaseRef.current}${separator}${transcript}`.slice(0, 2000));
    };
    recognition.onerror = (event) => {
      if (event.error !== "aborted") setVoiceError(voiceErrors[event.error] ?? "Не удалось распознать речь.");
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
    };

    setVoiceError("");
    setListening(true);
    try { recognition.start(); }
    catch {
      recognitionRef.current = null;
      setListening(false);
      setVoiceError("Не удалось запустить голосовой ввод.");
    }
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    recognitionRef.current?.abort();
    setListening(false);
    const text = input.trim();
    if (!text || busy || !consented) return;
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
        <textarea aria-label="Сообщение" rows={2} value={input} onChange={(event) => setInput(event.target.value)} placeholder={consented ? "Напишите сообщение…" : "Сначала подтвердите согласие"} disabled={!consented || busy} readOnly={listening} maxLength={2000}/>
        <button className={`voice-button${listening ? " listening" : ""}`} type="button" disabled={!consented || busy} onClick={toggleVoiceInput} aria-label={listening ? "Остановить голосовой ввод" : "Начать голосовой ввод"} aria-pressed={listening} title={listening ? "Остановить голосовой ввод" : "Голосовой ввод"}>
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V22h2v-3.08A7 7 0 0 0 19 12h-2Z"/></svg>
        </button>
        <button className="send-button" type="submit" disabled={!consented || busy || listening || !input.trim()} aria-label="Отправить">↑</button>
      </div>
      {(listening || voiceError) && <p className={`voice-status${voiceError ? " error" : ""}`} aria-live="polite">{voiceError || "Слушаю… Речь распознаёт браузер; проверьте текст перед отправкой."}</p>}
    </form>
    {!consented && <label className="consent"><input type="checkbox" checked={false} disabled={busy} onChange={(event) => acceptConsent(event.target.checked)}/><span>Я даю согласие на обработку моих персональных данных в соответствии с <Link href="/legal/privacy" target="_blank" rel="noreferrer">Политикой обработки персональных данных</Link>. Я обязуюсь здесь не указывать никакие свои персональные данные кроме имени и телефона.</span></label>}
  </section>;
}
