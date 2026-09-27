import { cookies } from "next/headers";
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import type { StaffRole } from "@/db/schema";

/**
 * Staff sign-in for the agency workspace.
 *
 * Normal mode: per-officer accounts in staff_users (email + password, scrypt-hashed), each with
 * a role (admin | editor | viewer) and an LGA (or every LGA for a server administrator).
 *
 * Bootstrap mode: while no active account exists, the shared ADMIN_PASSCODE signs in as a
 * temporary server administrator so the first real accounts can be created. Once one account
 * exists the passcode no longer signs anyone in.
 *
 * Token format (also verified by src/middleware.ts): "<subject>.<issuedAtMs>.<hex hmac>" where
 * subject is "u<id>" or "boot", the HMAC covers "<subject>|<issuedAtMs>" and is keyed by
 * SESSION_SECRET (or, failing that, the passcode). Sessions last SESSION_HOURS server-side.
 */
export const COOKIE = "asklga_staff";
export const SESSION_HOURS = 12;
const WEAK = new Set(["change-me", "changeme", "password", "admin", "asklga"]);
const ROLE_RANK: Record<StaffRole, number> = { viewer: 1, editor: 2, admin: 3 };

export type Session = {
  userId: number | null; // null in bootstrap mode
  name: string;
  email: string | null;
  role: StaffRole;
  lgaId: string | null; // null = every LGA
  bootstrap: boolean;
};

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

export function sessionSecret(): string {
  return process.env.SESSION_SECRET?.trim() || passcode();
}

/** The cookie is marked Secure when the portal is served over HTTPS (NEXT_PUBLIC_BASE_URL). */
export function cookieSecure(): boolean {
  return (process.env.NEXT_PUBLIC_BASE_URL ?? "").toLowerCase().startsWith("https://");
}

function sign(subject: string, iat: number): string {
  return createHmac("sha256", sessionSecret()).update(`${subject}|${iat}`).digest("hex");
}

export function tokenFor(subject: string, iat = Date.now()): string {
  return `${subject}.${iat}.${sign(subject, iat)}`;
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Returns the token subject when the signature and age are valid. */
export function verifyToken(token: string | undefined): string | null {
  if (!token || !sessionSecret()) return null;
  const parts = token.split(".");
  if (parts.length < 3) return null;
  const sig = parts.pop() as string;
  const iat = Number(parts.pop());
  const subject = parts.join(".");
  if (!subject || !Number.isFinite(iat)) return null;
  if (Date.now() - iat > SESSION_HOURS * 3600 * 1000) return null;
  return safeEqual(sign(subject, iat), sig) ? subject : null;
}

/* ---------- passwords ---------- */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password.normalize("NFC"), salt, 64, { N: 16384, r: 8, p: 1 }).toString("hex");
  return `scrypt$16384$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [algo, n, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const test = scryptSync(password.normalize("NFC"), salt, 64, { N: Number(n) || 16384, r: 8, p: 1 });
  const want = Buffer.from(hash, "hex");
  return test.length === want.length && timingSafeEqual(test, want);
}

export function passwordProblem(pw: string): string | null {
  if (pw.length < 10) return "Use at least 10 characters.";
  if (WEAK.has(pw.toLowerCase()) || /^(password|12345|qwerty)/i.test(pw)) return "That password is too common.";
  return null;
}

/* ---------- sessions ---------- */

export async function activeUserCount(): Promise<number> {
  const db = await getDb();
  const [r] = await db.select({ n: sql<number>`count(*)` }).from(s.staffUsers).where(eq(s.staffUsers.active, true));
  return Number(r?.n ?? 0);
}

export async function currentStaff(): Promise<Session | null> {
  const jar = await cookies();
  const subject = verifyToken(jar.get(COOKIE)?.value);
  if (!subject) return null;
  if (subject === "boot") {
    // Bootstrap sessions are only honoured while no account exists.
    if (!passcodeConfigured() || (await activeUserCount()) > 0) return null;
    return { userId: null, name: "Setup administrator", email: null, role: "admin", lgaId: null, bootstrap: true };
  }
  const id = Number(subject.replace(/^u/, ""));
  if (!Number.isSafeInteger(id)) return null;
  const db = await getDb();
  const [u] = await db.select().from(s.staffUsers).where(and(eq(s.staffUsers.id, id), eq(s.staffUsers.active, true))).limit(1);
  if (!u) return null;
  return { userId: u.id, name: u.name, email: u.email, role: u.role, lgaId: u.lgaId, bootstrap: false };
}

/** Kept for existing call sites: the signed-in officer's display name. */
export async function staffName(): Promise<string | null> {
  return (await currentStaff())?.name ?? null;
}

export async function isStaff(): Promise<boolean> {
  return (await currentStaff()) !== null;
}

export function roleAtLeast(role: StaffRole, min: StaffRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

export function canAccessLga(session: Session, lgaId: string): boolean {
  return session.lgaId === null || session.lgaId === lgaId;
}

/** Name rules: 2 to 80 visible characters, letters/digits/space/.'- only, so it is safe in a cookie and on public pages. */
export function cleanStaffName(raw: string): string | null {
  const t = raw.normalize("NFC").replace(/[^\p{L}\p{N} .'\-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 80);
  return t.length >= 2 ? t : null;
}

export function cleanEmail(raw: string): string | null {
  const t = raw.trim().toLowerCase().slice(0, 120);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) ? t : null;
}

async function setSessionCookie(subject: string) {
  const jar = await cookies();
  jar.set(COOKIE, tokenFor(subject), {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    maxAge: 60 * 60 * SESSION_HOURS,
  });
}

/** Email + password sign-in against staff_users. */
export async function signInWithPassword(emailRaw: string, password: string): Promise<boolean> {
  const email = cleanEmail(emailRaw);
  if (!email || !password) return false;
  const db = await getDb();
  const [u] = await db.select().from(s.staffUsers).where(and(eq(s.staffUsers.email, email), eq(s.staffUsers.active, true))).limit(1);
  // Always run one hash comparison so a missing account takes as long as a wrong password.
  const ok = u ? verifyPassword(password, u.passwordHash) : verifyPassword(password, hashPassword("x")) && false;
  if (!u || !ok) return false;
  await db.update(s.staffUsers).set({ lastSignIn: new Date() }).where(eq(s.staffUsers.id, u.id));
  await setSessionCookie(`u${u.id}`);
  return true;
}

/** Bootstrap sign-in with the shared passcode; only works while no account exists. */
export async function signInBootstrap(name: string, given: string): Promise<boolean> {
  if (!passcodeConfigured() || !cleanStaffName(name)) return false;
  if ((await activeUserCount()) > 0) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(passcode()).digest();
  if (!timingSafeEqual(a, b)) return false;
  await setSessionCookie("boot");
  return true;
}

/** Either form, chosen by whether an email was given. Used by the form and the JSON route. */
export async function signIn(identity: string, secret: string): Promise<boolean> {
  return identity.includes("@") ? signInWithPassword(identity, secret) : signInBootstrap(identity, secret);
}

export async function signOut() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/* ---------- feedback tokens ---------- */

/** Short HMAC that lets a resident rate or flag only the answer they actually received. */
export function questionToken(questionId: number): string {
  return createHmac("sha256", sessionSecret()).update(`q|${questionId}`).digest("hex").slice(0, 32);
}

export function verifyQuestionToken(questionId: number, token: unknown): boolean {
  if (typeof token !== "string" || token.length !== 32) return false;
  return safeEqual(questionToken(questionId), token);
}
