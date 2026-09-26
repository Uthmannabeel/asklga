import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Staff sign-in for the agency workspace. Prototype-grade: one shared passcode per deployment
 * (ADMIN_PASSCODE) exchanged for an HMAC cookie. A real deployment replaces this with
 * per-officer accounts and roles; the rest of the app only calls isStaff() / requireStaff().
 */
const COOKIE = "asklga_staff";

function secret(): string {
  return process.env.ADMIN_PASSCODE ?? "";
}

export function tokenFor(name: string): string {
  return name + "." + createHmac("sha256", secret()).update(name).digest("hex");
}

export function verifyToken(token: string | undefined): string | null {
  if (!token || !secret()) return null;
  const i = token.lastIndexOf(".");
  if (i < 1) return null;
  const name = token.slice(0, i);
  const expected = tokenFor(name);
  if (expected.length !== token.length) return null;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(token)) ? name : null;
}

export async function staffName(): Promise<string | null> {
  const jar = await cookies();
  return verifyToken(jar.get(COOKIE)?.value);
}

export async function isStaff(): Promise<boolean> {
  return (await staffName()) !== null;
}

export async function signIn(name: string, passcode: string): Promise<boolean> {
  if (!secret() || passcode !== secret() || !name.trim()) return false;
  const jar = await cookies();
  jar.set(COOKIE, tokenFor(name.trim()), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 12 });
  return true;
}

export async function signOut() {
  const jar = await cookies();
  jar.delete(COOKIE);
}
