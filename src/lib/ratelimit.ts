import { NextResponse } from "next/server";
import { clientIpFrom } from "./clientIp";

export { clientIpFrom };

/**
 * In-memory rate limiting for the public endpoints. Good for a single server (the pilot);
 * a multi-instance deployment should move the buckets to Postgres or Redis. Buckets are keyed
 * by client IP (from the proxy headers) and, for the answer engine, by LGA per day so one
 * scripted client cannot spend an LGA's whole model quota.
 */

type Bucket = { tokens: number; updated: number };
const buckets = new Map<string, Bucket>();
const daily = new Map<string, { count: number; day: string }>();

function sweep() {
  if (buckets.size < 5000) return;
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [k, b] of buckets) if (b.updated < cutoff) buckets.delete(k);
}

/** Token bucket: `limit` requests per `windowMs`, refilled continuously. */
export function allow(key: string, limit: number, windowMs: number): boolean {
  sweep();
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: limit, updated: now };
  b.tokens = Math.min(limit, b.tokens + ((now - b.updated) / windowMs) * limit);
  b.updated = now;
  if (b.tokens < 1) {
    buckets.set(key, b);
    return false;
  }
  b.tokens -= 1;
  buckets.set(key, b);
  return true;
}

/** Fixed daily counter, e.g. answers per LGA per day. */
export function allowDaily(key: string, limit: number): boolean {
  const day = new Date().toISOString().slice(0, 10);
  const d = daily.get(key);
  if (!d || d.day !== day) {
    daily.set(key, { count: 1, day });
    return true;
  }
  if (d.count >= limit) return false;
  d.count += 1;
  return true;
}

export function clientIp(req: Request): string {
  return clientIpFrom(req.headers);
}

export const TOO_MANY = (retryAfterSec = 60) =>
  NextResponse.json(
    { error: "Too many requests from this connection. Wait a minute and try again." },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
  );

/** Reads a JSON body with a size cap; returns null when missing, malformed or too large. */
export async function readJson<T>(req: Request, maxBytes = 8 * 1024): Promise<T | null> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > maxBytes) return null;
  const text = await req.text().catch(() => "");
  if (text.length > maxBytes) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/** Positive safe integer or null. */
export function intOrNull(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** Accepts only http(s) URLs; everything else becomes null. */
export function safeUrl(v: unknown, max = 500): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  if (!t) return null;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}
