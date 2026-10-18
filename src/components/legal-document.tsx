import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { legalDocument } from "@/server/legal/documents";

type Document = NonNullable<ReturnType<typeof legalDocument>>;

export function SafeLegalMarkdown({ markdown }: { markdown: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{
    a: ({ href, children }) => {
      if (!href || !/^(https:\/\/|mailto:|\/(?!\/))/i.test(href)) return <span>{children}</span>;
      return <a href={href} rel="noopener noreferrer">{children}</a>;
    },
  }}>{markdown}</ReactMarkdown>;
}

export function LegalDocument({ document }: { document: Document }) {
  return <main className="policy-page legal-page">
    <header><Link href="/"><Image src="/logo.svg" width={150} height={47} alt="AI-Run" /></Link><Link href="/">← На главную</Link></header>
    <p className="section-index">ЮРИДИЧЕСКИЕ ДОКУМЕНТЫ · УТВЕРЖДЕНО ВЛАДЕЛЬЦЕМ</p>
    <p className="policy-note">Редакция {document.version} утверждена 18.10.2026. Дата применения в документе — 01.11.2026; до публикации и наступления этой даты документ не действует.</p>
    <article className="policy-text"><SafeLegalMarkdown markdown={document.markdown} /></article>
  </main>;
}
