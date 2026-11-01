"use client";

import { useCallback, useEffect, useState } from "react";

type Entry = { id: number; createdAt: string; requestId: string; engine: string; stage: string; code: string; durationMs: number; httpStatus: number | null; eventBytes: number };
type Result = { rows: Entry[]; total: number; page: number; pageSize: number };

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "medium", timeZone: "Europe/Moscow" }).format(new Date(value));
}

export function AsrErrorJournal() {
  const [result, setResult] = useState<Result>({ rows: [], total: 0, page: 1, pageSize: 50 });
  const [page, setPage] = useState(1);
  const [engine, setEngine] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), pageSize: "50" });
    if (engine) params.set("engine", engine);
    if (code) params.set("code", code);
    try {
      const response = await fetch(`/api/admin/asr/errors?${params}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Не удалось загрузить журнал");
      setResult(await response.json() as Result);
    } catch { setError("Не удалось загрузить журнал ошибок."); }
    finally { setLoading(false); }
  }, [page, engine, code]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function clear() {
    if (!confirm("Удалить все записи журнала ошибок распознавания? Это действие нельзя отменить.")) return;
    setError("");
    try {
      const response = await fetch("/api/admin/asr/errors", { method: "DELETE", headers: { "x-confirm-clear-asr-log": "yes" } });
      if (!response.ok) throw new Error("clear failed");
      setPage(1);
      setResult({ rows: [], total: 0, page: 1, pageSize: 50 });
    } catch { setError("Не удалось очистить журнал."); }
  }

  const exportParams = new URLSearchParams({ format: "csv" });
  if (engine) exportParams.set("engine", engine);
  if (code) exportParams.set("code", code);
  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));

  return <>
    <div className="admin-asr-journal-controls">
      <label>Движок<select value={engine} onChange={(event) => { setPage(1); setEngine(event.target.value); }}><option value="">Все</option><option value="sherpa">Sherpa</option><option value="browser">Браузер</option><option value="fallback">Fallback</option></select></label>
      <label>Код ошибки<select value={code} onChange={(event) => { setPage(1); setCode(event.target.value); }}><option value="">Все</option>{["audio-capture", "network", "no-speech", "not-allowed", "service-not-allowed", "browser-unsupported", "recording-failed", "decode-failed", "timeout", "busy", "server-error", "not-ready", "invalid-audio", "audio-too-long"].map((item) => <option key={item}>{item}</option>)}</select></label>
      <a className="button secondary" href={`/api/admin/asr/errors?${exportParams}`}>Выгрузить CSV</a>
      <button className="button danger" type="button" onClick={clear} disabled={result.total === 0}>Очистить журнал</button>
      <span className="admin-card-note">Записей: {result.total} / 1000</span>
    </div>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {loading ? <p>Загрузка журнала…</p> : <div className="admin-table admin-asr-error-table">
      <table>
        <thead><tr><th>Дата (МСК)</th><th>Движок</th><th>Этап</th><th>Код</th><th>Время, мс</th><th>HTTP</th><th>Размер, байт</th><th>ID запроса</th></tr></thead>
        <tbody>{result.rows.map((row) => <tr key={row.id}><td>{formatTime(row.createdAt)}</td><td>{row.engine}</td><td>{row.stage}</td><td><code>{row.code}</code></td><td>{row.durationMs}</td><td>{row.httpStatus ?? "—"}</td><td>{row.eventBytes}</td><td><code>{row.requestId}</code></td></tr>)}</tbody>
      </table>
      {result.rows.length === 0 && <p className="admin-card-note">Ошибок по выбранным фильтрам нет.</p>}
    </div>}
    <div className="admin-asr-pagination">
      <button className="button secondary" type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>← Назад</button>
      <span>Страница {page} из {pageCount}</span>
      <button className="button secondary" type="button" disabled={page >= pageCount || loading} onClick={() => setPage((value) => value + 1)}>Дальше →</button>
    </div>
  </>;
}
