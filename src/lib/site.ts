/** Public origin for absolute links (sitemap, share cards). Falls back to the Vercel demo URL. */
export const SITE_URL = (process.env.NEXT_PUBLIC_BASE_URL || "https://asklga.vercel.app").replace(/\/$/, "");
