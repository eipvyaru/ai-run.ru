"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type ScheduleWindow = { weekday: number; enabled: number; start_time: string; end_time: string };
type AdminData = { settings: Record<string, string>; windows: ScheduleWindow[] };
type AsrEngine = "browser" | "sherpa";

const dayNames = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

export function AdminPanel() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [login, setLogin] = useState("eipv@ya.ru");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [windows, setWindows] = useState<ScheduleWindow[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [debug, setDebug] = useState(false);
  const [asrEngine, setAsrEngine] = useState<AsrEngine>("sherpa");
  const [asrReady, setAsrReady] = useState(false);
  const [asrSaved, setAsrSaved] = useState(false);

  async function load() {
    const response = await fetch("/api/admin");
    if (response.status === 401) {
      setAuthenticated(false);
      return;
    }
    if (!response.ok) {
      setError("Не удалось загрузить настройки");
      return;
    }
    const data = await response.json() as AdminData;
    setAuthenticated(true);
    setWindows(data.windows);
    setSettings(data.settings);
    setDebug(data.settings.debug_enabled === "true");
    try {
      const asrResponse = await fetch("/api/admin/asr", { cache: "no-store" });
      if (asrResponse.ok) {
        const asr = await asrResponse.json() as { engine: AsrEngine; modelReady: boolean };
        setAsrEngine(asr.engine);
        setAsrReady(asr.modelReady);
      }
    } catch { setAsrReady(false); }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ login, password }),
    });
    if (!response.ok) {
      setError("Неверный логин или пароль");
      return;
    }
    setPassword("");
    await load();
  }

  async function save() {
    setError("");
    const response = await fetch("/api/admin", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ settings, windows, debug }),
    });
    if (!response.ok) setError("Не удалось сохранить настройки");
    else await load();
  }

  async function clearDebug() {
    if (!confirm("Удалить все записи отладочного лога? Это действие нельзя отменить.")) return;
    const response = await fetch("/api/admin/debug", { method: "DELETE" });
    if (!response.ok) setError("Не удалось очистить лог");
  }

  async function saveAsr() {
    setError("");
    setAsrSaved(false);
    let response: Response;
    try {
      response = await fetch("/api/admin/asr", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ engine: asrEngine }),
      });
    } catch {
      setError("Не удалось сохранить режим распознавания");
      return;
    }
    if (!response.ok) { setError("Не удалось сохранить режим распознавания"); return; }
    const data = await response.json() as { engine: AsrEngine; modelReady: boolean };
    setAsrEngine(data.engine);
    setAsrReady(data.modelReady);
    setAsrSaved(true);
  }

  function updateWindow(weekday: number, changes: Partial<ScheduleWindow>) {
    setWindows(windows.map((window) => window.weekday === weekday ? { ...window, ...changes } : window));
  }

  if (authenticated === null) return <main className="admin-shell"><p>Проверяем доступ…</p></main>;

  if (!authenticated) return (
    <main className="admin-login">
      <form onSubmit={submit}>
        <Image src="/logo.svg" width={150} height={45} alt="AI-Run" />
        <p className="section-index">ЗАКРЫТЫЙ РАЗДЕЛ</p>
        <h1>Вход администратора</h1>
        <label>Логин<input type="email" value={login} onChange={(event) => setLogin(event.target.value)} /></label>
        <label>Пароль<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {error && <p className="admin-error" role="alert">{error}</p>}
        <button className="button">Войти</button>
      </form>
    </main>
  );

  return (
    <main className="admin-shell admin-dashboard">
      <header>
        <Image src="/logo.svg" width={150} height={45} alt="AI-Run" />
        <div><strong>Администрирование</strong><Link href="/">На сайт ↗</Link></div>
      </header>
      {error && <p className="admin-error" role="alert">{error}</p>}
      <div className="admin-dashboard-grid">
        <section className="admin-card admin-schedule-card">
          <p className="section-index">РАСПИСАНИЕ</p>
          <h1>Параметры записи</h1>
          <div className="admin-fields">
            <label>Длительность, минут<input value={settings.meeting_duration_minutes ?? ""} onChange={(event) => setSettings({ ...settings, meeting_duration_minutes: event.target.value })} /></label>
            <label>Минимум, часов<input value={settings.minimum_notice_hours ?? ""} onChange={(event) => setSettings({ ...settings, minimum_notice_hours: event.target.value })} /></label>
            <label>Горизонт, дней<input value={settings.booking_horizon_days ?? ""} onChange={(event) => setSettings({ ...settings, booking_horizon_days: event.target.value })} /></label>
          </div>
          <div className="schedule-list">
            {[...windows].sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7)).map((window) => (
              <div key={window.weekday}>
                <label><input type="checkbox" checked={Boolean(window.enabled)} onChange={(event) => updateWindow(window.weekday, { enabled: event.target.checked ? 1 : 0 })} />{dayNames[window.weekday]}</label>
                <input type="time" aria-label={`${dayNames[window.weekday]}: начало`} value={window.start_time} disabled={!window.enabled} onChange={(event) => updateWindow(window.weekday, { start_time: event.target.value })} />
                <span>—</span>
                <input type="time" aria-label={`${dayNames[window.weekday]}: окончание`} value={window.end_time} disabled={!window.enabled} onChange={(event) => updateWindow(window.weekday, { end_time: event.target.value })} />
              </div>
            ))}
          </div>
          <button className="button" type="button" onClick={save}>Сохранить расписание</button>
        </section>
        <aside className="admin-side">
          <section className="admin-card admin-consent-card">
            <p className="section-index">СОГЛАСИЯ НА ПДН</p>
            <h2><a className="admin-journal-link" href="/admin/consents" target="_blank" rel="noopener noreferrer">Журнал согласий ↗</a></h2>
            <p className="admin-card-note">Откроется в новом окне</p>
          </section>
          <section className="admin-card admin-debug-card">
            <p className="section-index">ОТЛАДКА ПРОМТА</p>
            <h2>Диалоги</h2>
            <label className="admin-switch"><input type="checkbox" checked={debug} onChange={(event) => setDebug(event.target.checked)} /> Режим отладки промта</label>
            <div className="admin-actions">
              <button className="button" type="button" onClick={save}>Сохранить режим</button>
              <a className="button secondary" href="/api/admin/debug">Выгрузить лог</a>
              <button className="button danger" type="button" onClick={clearDebug}>Очистить лог</button>
            </div>
          </section>
          <section className="admin-card admin-asr-card">
            <p className="section-index">ГОЛОСОВОЙ ВВОД</p>
            <h2>Распознавание речи</h2>
            <label className="admin-asr-select">Активный вариант
              <select value={asrEngine} onChange={(event) => { setAsrEngine(event.target.value as AsrEngine); setAsrSaved(false); }}>
                <option value="sherpa">Локальная модель Sherpa</option>
                <option value="browser">Распознавание браузером</option>
              </select>
            </label>
            <p className={`admin-card-note${asrEngine === "sherpa" && !asrReady ? " admin-asr-unavailable" : ""}`}>
              {asrEngine === "sherpa" && (asrReady ? "Модель доступна на сервере" : "Модель сейчас недоступна; посетителю будет предложен fallback или текстовый ввод")}
              {asrEngine === "browser" && "Используется Web Speech API браузера"}
            </p>
            <div className="admin-actions">
              <button className="button" type="button" onClick={saveAsr}>Сохранить режим</button>
              {asrSaved && <span className="admin-card-note" role="status">Сохранено</span>}
              <a className="admin-journal-link admin-asr-errors-link" href="/admin/asr-errors" target="_blank" rel="noopener noreferrer">Журнал ошибок ↗</a>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
