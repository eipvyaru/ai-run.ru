import "server-only";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const LEGAL_STATUS = "APPROVED_AWAITING_PUBLICATION" as const;
export const LEGAL_VERSION = "1.0.0";
export const PLANNED_EFFECTIVE_DATE = "2026-11-01";

const documents = [
  { id: "operator", slug: "operator", file: "01_SELF_EMPLOYED_OPERATOR_DETAILS.md", url: "/legal/operator" },
  { id: "offer", slug: "offer", file: "02_PUBLIC_OFFER.md", url: "/legal/offer" },
  { id: "privacy", slug: "privacy", file: "03_PERSONAL_DATA_POLICY.md", url: "/legal/privacy" },
  { id: "personal-data-consent", slug: "personal-data-consent", file: "04_PERSONAL_DATA_CONSENT.md", url: "/legal/personal-data-consent" },
  { id: "cookies", slug: "cookies", file: "05_COOKIE_POLICY.md", url: "/cookies" },
  { id: "third-party-data", slug: "third-party-data", file: "06_THIRD_PARTY_DATA_RULES.md", url: "/legal/third-party-data" },
  { id: "data-security", slug: "data-security", file: "07_PERSONAL_DATA_SECURITY_INFORMATION.md", url: "/legal/data-security" },
] as const;

export function legalDocuments() { return documents; }

export function legalDocument(slug: string) {
  const document = documents.find((item) => item.slug === slug);
  if (!document) return null;
  const source = readFileSync(resolve(process.cwd(), "legal", document.file));
  return {
    ...document,
    markdown: source.toString("utf8"),
    version: LEGAL_VERSION,
    source_sha256: createHash("sha256").update(source).digest("hex"),
    planned_effective_date: PLANNED_EFFECTIVE_DATE,
    canonical_url: `https://ai-run.ru${document.url}`,
    status: LEGAL_STATUS,
  };
}

export function legalRegistry() {
  return documents.map(({ slug }) => {
    const document = legalDocument(slug)!;
    const { id, version, source_sha256, planned_effective_date, canonical_url, status } = document;
    return { id, version, source_sha256, planned_effective_date, canonical_url, status };
  });
}
