import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalDocument } from "@/components/legal-document";
import { legalDocument, legalDocuments } from "@/server/legal/documents";

export const dynamicParams = false;
export function generateStaticParams() { return legalDocuments().filter((item) => item.slug !== "cookies").map(({ slug }) => ({ slug })); }

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const document = legalDocument((await params).slug);
  if (!document || document.slug === "cookies") return {};
  return { title: `${document.markdown.split("\n")[0].replace(/^#\s*/, "")} — AI-Run`, alternates: { canonical: document.url }, robots: { index: false, follow: false }, other: { "legal-status": document.status, "legal-version": document.version } };
}

export default async function Page({ params }: Props) {
  const document = legalDocument((await params).slug);
  if (!document || document.slug === "cookies") notFound();
  return <LegalDocument document={document} />;
}
