import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AsrErrorJournal } from "@/components/asr-error-journal";
import { requireAdmin } from "@/server/auth/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Журнал ошибок распознавания — AI-Run", robots: { index: false, follow: false } };

export default async function AsrErrorsPage() {
  if (!(await requireAdmin())) redirect("/admin");
  return <main className="admin-shell admin-journal">
    <header>
      <Image src="/logo.svg" width={150} height={45} alt="AI-Run" />
      <Link href="/admin">← К настройкам</Link>
    </header>
    <section>
      <p className="section-index">ГОЛОСОВОЙ ВВОД</p>
      <h1>Журнал ошибок распознавания</h1>
      <p className="admin-card-note">Хранятся последние 1000 технических событий. Аудио, транскрипты, персональные данные и сырые сообщения ошибок не записываются.</p>
      <AsrErrorJournal />
    </section>
  </main>;
}
