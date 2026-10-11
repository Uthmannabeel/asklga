/**
 * Connected sources, first step: fetch a published web page and reduce it to plain text that
 * the document library can chunk and search. HTML and plain text only (PDF extraction needs a
 * parser and is a later step). Guards: http(s) only, no private or loopback hosts, 15 s
 * timeout, 3 MB cap, redirects followed by hand and re-checked, every resolved address
 * checked at connect time (so DNS rebinding cannot reach the private network), and the LGA's
 * data owner still approves the result before it is public.
 */
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";

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

/** Loopback, private, link-local, CGNAT, multicast and reserved ranges, IPv4 and IPv6. */
const BLOCKED = new BlockList();
for (const [net, bits] of [["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["224.0.0.0", 3]] as const) BLOCKED.addSubnet(net, bits, "ipv4");
for (const [net, bits] of [["::", 128], ["::1", 128], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8], ["64:ff9b::", 96], ["2001:db8::", 32]] as const) BLOCKED.addSubnet(net, bits, "ipv6");

export function isBlockedAddress(address: string): boolean {
  const v4mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address)?.[1];
  if (v4mapped) return BLOCKED.check(v4mapped, "ipv4");
  const family = isIP(address);
  if (family === 4) return BLOCKED.check(address, "ipv4");
  if (family === 6) return BLOCKED.check(address, "ipv6");
  return true;
}

/**
 * DNS lookup used for the actual connection: every address the name resolves to is checked,
 * and the socket connects to the address that was checked, so a name cannot pass validation
 * and then rebind to a private address.
 */
export const guardedLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "", 0);
    const list = addresses as LookupAddress[];
    const bad = list.find((a) => isBlockedAddress(a.address));
    if (!list.length || bad) return callback(Object.assign(new Error("private address"), { code: "EPRIVATE" }), "", 0);
    if (options.all) return (callback as unknown as (e: null, a: LookupAddress[]) => void)(null, list);
    callback(null, list[0].address, list[0].family);
  });
};

type RawResponse = { status: number; location: string | null; contentType: string; body: string };

/** One GET with no automatic redirects, the guarded lookup, a byte cap and the caller's deadline. */
function getOnce(u: URL, signal: AbortSignal): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const req = (u.protocol === "https:" ? httpsRequest : httpRequest)(
      u,
      { method: "GET", lookup: guardedLookup, signal, headers: { "User-Agent": "AskLGA-importer/1.0 (+public-interest LGA portal)", Accept: "text/html, text/plain;q=0.9, */*;q=0.1" } },
      (res) => {
        const status = res.statusCode ?? 0;
        const contentType = String(res.headers["content-type"] ?? "").toLowerCase();
        const location = typeof res.headers.location === "string" ? res.headers.location : null;
        if (status >= 300 && status < 400) {
          res.resume();
          return resolve({ status, location, contentType, body: "" });
        }
        if (Number(res.headers["content-length"] ?? 0) > MAX_BYTES) {
          res.destroy();
          return reject(Object.assign(new Error("too large"), { code: "ETOOLARGE" }));
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (c: Buffer) => {
          size += c.length;
          if (size > MAX_BYTES) {
            res.destroy();
            reject(Object.assign(new Error("too large"), { code: "ETOOLARGE" }));
          } else chunks.push(c);
        });
        res.on("end", () => resolve({ status, location, contentType, body: Buffer.concat(chunks).toString("utf8") }));
        res.on("error", reject);
      },
    );
    req.on("error", reject);
    req.end();
  });
}

export async function fetchDocumentText(url: string): Promise<FetchResult> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { ok: false, error: "That is not a valid web address." };
  }
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 15000);
  try {
    // Redirects are followed by hand so every hop gets the same scheme, host and address checks.
    let res: RawResponse | null = null;
    for (let hop = 0; hop <= 5; hop++) {
      if (u.protocol !== "http:" && u.protocol !== "https:") return { ok: false, error: "Only http and https addresses can be imported." };
      // Literal IPs skip DNS, so they are checked here against the same ranges.
      if (isPrivateHost(u.hostname) || (isIP(u.hostname.replace(/^\[|\]$/g, "")) && isBlockedAddress(u.hostname.replace(/^\[|\]$/g, "")))) return { ok: false, error: hop ? "The address redirected into a private network." : "Addresses inside private networks cannot be imported." };
      res = await getOnce(u, c.signal);
      if (res.status >= 300 && res.status < 400 && res.location) {
        u = new URL(res.location, u);
        continue;
      }
      break;
    }
    if (!res || (res.status >= 300 && res.status < 400)) return { ok: false, error: "The address redirected too many times." };
    if (res.status < 200 || res.status >= 300) return { ok: false, error: `The site answered ${res.status}.` };
    const contentType = res.contentType;
    if (!/text\/html|text\/plain|application\/xhtml/.test(contentType)) {
      return { ok: false, error: `That address returned ${contentType.split(";")[0] || "an unknown type"}, not a web page. PDF import is not available yet; paste the text instead.` };
    }
    const raw = res.body;
    const { title, text } = contentType.includes("html") ? htmlToText(raw) : { title: null, text: raw.trim() };
    if (text.length < 80) return { ok: false, error: "The page had almost no readable text. Paste the text instead." };
    return { ok: true, title, text: text.slice(0, 200000), contentType };
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === "EPRIVATE") return { ok: false, error: "Addresses inside private networks cannot be imported." };
    if (code === "ETOOLARGE") return { ok: false, error: "That page is larger than 3 MB." };
    return { ok: false, error: e instanceof Error && (e.name === "AbortError" || code === "ABORT_ERR") ? "The site did not answer within 15 seconds." : "The page could not be fetched." };
  } finally {
    clearTimeout(t);
  }
}
