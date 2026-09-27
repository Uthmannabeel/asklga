/**
 * Connected sources, first step: fetch a published web page and reduce it to plain text that
 * the document library can chunk and search. HTML and plain text only (PDF extraction needs a
 * parser and is a later step). Guards: http(s) only, no private or loopback hosts, 15 s
 * timeout, 3 MB cap, and the LGA's data owner still approves the result before it is public.
 */
const MAX_BYTES = 3 * 1024 * 1024;

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(h);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)) return true;
  }
  if (h.startsWith("[") || h.includes(":")) return true; // IPv6 literals are refused outright
  return false;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“" };

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

/** Strips scripts, styles, navigation and tags; keeps paragraph breaks so chunking stays sensible. */
export function htmlToText(html: string): { title: string | null; text: string } {
  const title = decodeEntities(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "").replace(/\s+/g, " ").trim() || null;
  let body = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template|iframe)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(nav|header|footer|aside|form)[^>]*>[\s\S]*?<\/\1>/gi, " ");
  const main = /<main[^>]*>([\s\S]*?)<\/main>/i.exec(body)?.[1] ?? /<article[^>]*>([\s\S]*?)<\/article>/i.exec(body)?.[1];
  if (main && main.replace(/<[^>]+>/g, "").trim().length > 400) body = main;
  body = body
    .replace(/<(br|hr)\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6]|blockquote|section|table|dd|dt|pre)>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, " ");
  const text = decodeEntities(body)
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { title, text };
}

export type FetchResult = { ok: true; title: string | null; text: string; contentType: string } | { ok: false; error: string };

export async function fetchDocumentText(url: string): Promise<FetchResult> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { ok: false, error: "That is not a valid web address." };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return { ok: false, error: "Only http and https addresses can be imported." };
  if (isPrivateHost(u.hostname)) return { ok: false, error: "Addresses inside private networks cannot be imported." };
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 15000);
  try {
    const res = await fetch(u.href, {
      signal: c.signal,
      redirect: "follow",
      headers: { "User-Agent": "AskLGA-importer/1.0 (+public-interest LGA portal)", Accept: "text/html, text/plain;q=0.9, */*;q=0.1" },
    });
    if (!res.ok) return { ok: false, error: `The site answered ${res.status}.` };
    const finalHost = new URL(res.url).hostname;
    if (isPrivateHost(finalHost)) return { ok: false, error: "The address redirected into a private network." };
    const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
    if (!/text\/html|text\/plain|application\/xhtml/.test(contentType)) {
      return { ok: false, error: `That address returned ${contentType.split(";")[0] || "an unknown type"}, not a web page. PDF import is not available yet; paste the text instead.` };
    }
    const len = Number(res.headers.get("content-length") ?? 0);
    if (len > MAX_BYTES) return { ok: false, error: "That page is larger than 3 MB." };
    const raw = await res.text();
    if (raw.length > MAX_BYTES) return { ok: false, error: "That page is larger than 3 MB." };
    const { title, text } = contentType.includes("html") ? htmlToText(raw) : { title: null, text: raw.trim() };
    if (text.length < 80) return { ok: false, error: "The page had almost no readable text. Paste the text instead." };
    return { ok: true, title, text: text.slice(0, 200000), contentType };
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.name === "AbortError" ? "The site did not answer within 15 seconds." : "The page could not be fetched." };
  } finally {
    clearTimeout(t);
  }
}
