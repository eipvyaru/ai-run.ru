import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SafeLegalMarkdown } from "../src/components/legal-document";

type Registry = { status: string; documents: Array<{ id: string; version: string; source_sha256: string; canonical_url: string; status: string }> };

const files: Record<string, string> = {
  operator: "01_SELF_EMPLOYED_OPERATOR_DETAILS.md",
  offer: "02_PUBLIC_OFFER.md",
  privacy: "03_PERSONAL_DATA_POLICY.md",
  "personal-data-consent": "04_PERSONAL_DATA_CONSENT.md",
  cookies: "05_COOKIE_POLICY.md",
  "third-party-data": "06_THIRD_PARTY_DATA_RULES.md",
  "data-security": "07_PERSONAL_DATA_SECURITY_INFORMATION.md",
};

describe("legal A–F package", () => {
  it("registry matches the exact seven Markdown sources", () => {
    const registry = JSON.parse(readFileSync(resolve("docs/LEGAL_REGISTRY_2026-10-22.json"), "utf8")) as Registry;
    expect(registry.status).toBe("DRAFT_REVIEW");
    expect(registry.documents).toHaveLength(7);
    expect(new Set(registry.documents.map((item) => item.id)).size).toBe(7);
    for (const item of registry.documents) {
      const file = files[item.id];
      expect(file).toBeDefined();
      const source = readFileSync(resolve("legal", file));
      expect(item.source_sha256).toBe(createHash("sha256").update(source).digest("hex"));
      expect(item.version).toBe("1.2.1");
      expect(item.status).toBe(registry.status);
      expect(item.canonical_url).toMatch(/^https:\/\/ai-run\.ru\/(legal\/[a-z-]+|cookies)$/);
      expect(source.toString("utf8")).not.toMatch(/\{[^}]+\}/);
    }
  });

  it("does not render raw HTML or dangerous links", () => {
    const html = renderToStaticMarkup(<SafeLegalMarkdown markdown={'<script>alert(1)</script>\n\n[bad](javascript:alert(1)) [also bad](//evil.test) [safe](https://ai-run.ru/legal/privacy)'} />);
    expect(html).not.toContain("<script>");
    expect(html).not.toContain('href="javascript:');
    expect(html).not.toContain('href="//evil.test');
    expect(html).toContain('href="https://ai-run.ru/legal/privacy"');
  });
});
