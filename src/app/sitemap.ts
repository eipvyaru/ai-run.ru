import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap { return [{ url: "https://ai-run.ru", priority: 1 }, { url: "https://ai-run.ru/privacy-policy", priority: 0.4 }]; }
