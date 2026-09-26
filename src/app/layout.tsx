import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "AskLGA", template: "%s | AskLGA" },
  description: "Ask your local government about services, projects, public assets and investment, in your language, and get the official answer with its source.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1e6b3c" };

// Newsreader carries titles and answers; Atkinson Hyperlegible carries the interface.
// Loaded as a stylesheet with font-display swap so text renders before the fonts arrive.
const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&display=swap";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONTS_HREF} />
      </head>
      <body>{children}</body>
    </html>
  );
}
