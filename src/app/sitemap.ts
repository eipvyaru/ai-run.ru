import type { MetadataRoute } from "next";
import { legalDocuments } from "@/server/legal/documents";
export default function sitemap(): MetadataRoute.Sitemap { return [{ url: "https://ai-run.ru", priority: 1 }, ...legalDocuments().map(({ url }) => ({ url: `https://ai-run.ru${url}`, priority: 0.4 }))]; }
