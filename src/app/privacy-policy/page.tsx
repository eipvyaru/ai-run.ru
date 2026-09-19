import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const metadata: Metadata = { title: "Политика обработки персональных данных — AI-Run", description: "Политика обработки персональных данных сайта AI-Run.", alternates: { canonical: "/privacy-policy" } };

export default function PrivacyPolicy() {
  const policy=readFileSync(resolve("public/privacy-policy.txt"),"utf8");
  return <main className="policy-page"><header><Link href="/"><Image src="/logo.svg" width={150} height={47} alt="AI-Run"/></Link><Link href="/">← На главную</Link></header>
    <p className="section-index">ЮРИДИЧЕСКИЕ ДОКУМЕНТЫ</p><h1>Политика обработки персональных данных</h1>
    <p className="policy-note">Актуальная редакция для сайта https://ai-run.ru/. По вопросам обработки данных: <a href="mailto:info@ai-run.ru">info@ai-run.ru</a>.</p>
    <article className="policy-text">{policy.split(/\n{2,}/).filter(Boolean).map((block,index)=>/^\d+\.\s/.test(block.trim())?<h2 key={index}>{block.trim()}</h2>:<p key={index}>{block.trim()}</p>)}</article>
  </main>;
}
