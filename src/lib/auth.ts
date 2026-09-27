import { cookies } from "next/headers";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Staff sign-in for the agency workspace. Prototype-grade: one shared passcode per deployment
 * (ADMIN_PASSCODE) exchanged for a signed, expiring cookie. A real deployment replaces this with
 * per-officer accounts and roles; the rest of the app only calls isStaff() / requireStaff().
 *
 * Token format (also verified by src/middleware.ts): "<name>.<issuedAtMs>.<hex hmac>" where the
 * HMAC covers "<name>|<issuedAtMs>" and is keyed by SESSION_SECRET (or, failing that, the
 * passcode). Sessions last SESSION_HOURS regardless of what the browser does with the cookie.
 */
export const COOKIE = "asklga_staff";
export const SESSION_HOURS = 12;
const WEAK = new Set(["change-me", "changeme", "password", "admin", "asklga"]);

export function passcode(): string {
  return (process.env.ADMIN_PASSCODE ?? "").trim();
}

let warnedShort = false;
/** True when a usable passcode is configured. Placeholder or blank values do not count. */
export function passcodeConfigured(): boolean {
  const p = passcode();
  if (!p || WEAK.has(p.toLowerCase())) return false;
  if (p.length < 12 && !warnedShort) {
    warnedShort = true;
    console.warn("[auth] ADMIN_PASSCODE is shorter than 12 characters; use a longer one before any real deployment.");
  }
  return true;
}

/**
 * The cookie is marked Secure when the portal is served over HTTPS (NEXT_PUBLIC_BASE_URL). Keying
 * it off the build mode would break sign-in over plain HTTP on a LAN or a pilot without TLS.
 */
export function cookieSecure(): boolean {
  return (process.env.NEXT_PUBLIC_BASE_URL ?? "").toLowerCase().startsWith("https://");
}

export function sessionSecret(): string {
  return process.env.SESSION_SECRET?.trim() || passcode();
}

function sign(name: string, iat: number): string {
  return createHmac("sha256", sessionSecret()).update(`${name}|${iat}`).digest("hex");
}

export function tokenFor(name: string, iat = Date.now()): string {
  return `${name}.${iat}.${sign(name, iat)}`;
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function verifyToken(token: string | undefined): string | null {
  if (!token || !passcodeConfigured()) return null;
  const parts = token.split(".");
  if (parts.length < 3) return null;
  const sig = parts.pop() as string;
  const iat = Number(parts.pop());
  const name = parts.join(".");
  if (!name || !Number.isFinite(iat)) return null;
  if (Date.now() - iat > SESSION_HOURS * 3600 * 1000) return null;
  return safeEqual(sign(name, iat), sig) ? name : null;
}

export async function staffName(): Promise<string | null> {
  const jar = await cookies();
  return verifyToken(jar.get(COOKIE)?.value);
}

export async function isStaff(): Promise<boolean> {
  return (await staffName()) !== null;
}

/** Name rules: 2 to 80 visible characters, letters/digits/space/.'- only, so it is safe in a cookie and on public pages. */
export function cleanStaffName(raw: string): string | null {
  const t = raw.normalize("NFC").replace(/[^\p{L}\p{N} .'\-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 80);
  return t.length >= 2 ? t : null;
}

export async function signIn(name: string, given: string): Promise<boolean> {
  if (!passcodeConfigured()) return false;
  const cleaned = cleanStaffName(name);
  if (!cleaned) return false;
  // Compare digests so the comparison is constant-time regardless of length.
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(passcode()).digest();
  if (!timingSafeEqual(a, b)) return false;
  const jar = await cookies();
  jar.set(COOKIE, tokenFor(cleaned), {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    maxAge: 60 * 60 * SESSION_HOURS,
  });
  return true;
}

export async function signOut() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** Short HMAC that lets a resident rate or flag only the answer they actually received. */
export function questionToken(questionId: number): string {
  return createHmac("sha256", sessionSecret()).update(`q|${questionId}`).digest("hex").slice(0, 32);
}

export function verifyQuestionToken(questionId: number, token: unknown): boolean {
  if (typeof token !== "string" || token.length !== 32) return false;
  return safeEqual(questionToken(questionId), token);
}
