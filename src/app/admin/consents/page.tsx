import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth/admin";
import { db } from "@/server/db/database";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Журнал согласий — AI-Run",
  robots: { index: false, follow: false },
};

type Consent = {
  accepted_at: string;
  ip_address: string;
  session_id: string;
  consent_version: string;
};

export default async function ConsentsPage() {
  if (!(await requireAdmin())) redirect("/admin");

  const consents = db().prepare(
    "SELECT accepted_at, ip_address, session_id, consent_version FROM consents ORDER BY accepted_at DESC LIMIT 500"
  ).all() as Consent[];
  const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Europe/Moscow",
  });

  return (
    <main className="admin-shell admin-journal">
      <header>
        <Image src="/logo.svg" width={150} height={45} alt="AI-Run" />
        <Link href="/admin">← К настройкам</Link>
      </header>
      <section>
        <p className="section-index">СОГЛАСИЯ НА ПДН</p>
        <h1>Журнал согласий</h1>
        <p>Показано записей: {consents.length} (не более 500). Только для просмотра.</p>
        <div className="admin-table">
          <table>
            <thead><tr><th>Дата (МСК)</th><th>IP</th><th>Сессия</th><th>Версия</th></tr></thead>
            <tbody>{consents.map((consent) => (
              <tr key={consent.session_id}>
                <td>{dateFormatter.format(new Date(consent.accepted_at))}</td>
                <td>{consent.ip_address}</td>
                <td>{consent.session_id}</td>
                <td>{consent.consent_version}</td>
              </tr>
            ))}</tbody>
          </table>
          {!consents.length && <p>Согласий пока нет.</p>}
        </div>
      </section>
    </main>
  );
}
