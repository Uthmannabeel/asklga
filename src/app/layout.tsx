import type { Metadata, Viewport } from "next";
import "./globals.css";
import { HTML_LANG, uiLang } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  openGraph: { siteName: "AskLGA", locale: "en_NG", type: "website" },
  twitter: { card: "summary_large_image" },
  title: { default: "AskLGA", template: "%s | AskLGA" },
  description: "Ask your local government about services, projects, public assets and investment, in your language, and get the official answer with its source.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0c2a1c" };

// Atkinson Hyperlegible Next carries everything; its Mono sibling carries record IDs and figures.
// Loaded as a stylesheet with font-display swap so text renders before the fonts arrive.
const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:ital,wght@0,400;0,700;0,800;1,400&family=Atkinson+Hyperlegible+Mono:wght@400;500;700&display=swap";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await uiLang();
  return (
    <html lang={HTML_LANG[lang]}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONTS_HREF} />
      </head>
      <body>{children}</body>
    </html>
  );
}
