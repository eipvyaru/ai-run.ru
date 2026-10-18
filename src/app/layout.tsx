import type { Metadata } from "next";
import "./globals.css";
import "./visual-refresh.css";
import "./legal.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ai-run.ru"),
  title: "AI-Run — AI-агенты для бизнеса",
  description: "Разрабатываем AI-агентов для незакрытых функций бизнес-процессов: заявки, продажи, внутренние знания и повторяющиеся операции.",
  icons: {
    icon: [
      { url: "/favicon.ico?v=20261018", type: "image/x-icon", sizes: "any" },
      { url: "/favicon.svg?v=20261018", type: "image/svg+xml", sizes: "any" }
    ],
    shortcut: "/favicon.ico?v=20261018"
  },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    title: "AI-Run — AI-агенты для бизнеса",
    description: "Разберём, где ваш бизнес теряет заявки и время, и определим функцию для AI-агента."
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
