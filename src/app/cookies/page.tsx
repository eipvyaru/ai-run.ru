import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal-document";
import { legalDocument } from "@/server/legal/documents";

export const metadata: Metadata = { title: "Политика cookie — AI-Run", alternates: { canonical: "/cookies" }, robots: { index: false, follow: false }, other: { "legal-status": "DRAFT_AWAITING_OWNER_APPROVAL", "legal-version": "1.0.0" } };
export default function Page() { return <LegalDocument document={legalDocument("cookies")!} />; }
