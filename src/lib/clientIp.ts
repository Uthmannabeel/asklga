/**
 * The client address used for rate limits. Forwarded headers are only trusted where something
 * we control wrote them: on Vercel the platform sets x-vercel-forwarded-for; behind your own
 * proxy set TRUST_PROXY_HOPS (1 for one nginx/Caddy in front) and the address that proxy saw is
 * read from the right-hand end of X-Forwarded-For, which a client cannot forge. With neither,
 * every caller shares one bucket: do not expose the app directly to the internet.
 */
export function clientIpFrom(h: Headers): string {
  if (process.env.VERCEL) {
    const v = h.get("x-vercel-forwarded-for") ?? h.get("x-real-ip");
    if (v) return v.split(",")[0].trim();
  }
  const hops = Number(process.env.TRUST_PROXY_HOPS ?? 0);
  if (Number.isInteger(hops) && hops > 0) {
    const chain = (h.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const ip = chain[chain.length - hops];
    if (ip) return ip;
  }
  return "direct";
}
