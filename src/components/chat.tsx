"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Message = { role: "assistant" | "user" | "error"; text: string };
const hello = "Здравствуйте! Я AI-секретарь AI-Run. Помогу подобрать время телефонного разговора с руководителем и задам несколько вопросов, чтобы мы могли заранее разобраться в вашей ситуации.\n\nДля продолжения подтвердите согласие с помощью галочки ниже.";

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: hello }]);
  const [sessionId, setSessionId] = useState<string>();
  const [consented, setConsented] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

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

  async function send(event: FormEvent) {
    event.preventDefault(); const text = input.trim(); if (!text || busy || !consented) return;
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
    <form className="chat-form" onSubmit={send}><textarea aria-label="Сообщение" rows={2} value={input} onChange={(event)=>setInput(event.target.value)} placeholder={consented ? "Напишите сообщение…" : "Сначала подтвердите согласие"} disabled={!consented || busy} maxLength={2000}/><button type="submit" disabled={!consented || busy || !input.trim()} aria-label="Отправить">↑</button></form>
    {!consented && <label className="consent"><input type="checkbox" checked={false} disabled={busy} onChange={(event) => acceptConsent(event.target.checked)}/><span>Я даю согласие на обработку моих персональных данных в соответствии с <a href="/privacy-policy" target="_blank" rel="noreferrer">Политикой обработки персональных данных</a>. Я обязуюсь здесь не указывать никакие свои персональные данные кроме имени и телефона.</span></label>}
  </section>;
}
