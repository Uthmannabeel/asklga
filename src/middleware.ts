import { NextResponse, type NextRequest } from "next/server";

/**
 * Gate for the staff workspace. Runs on every request to /admin/<lga>/..., including the
 * client-side navigations that skip layout re-renders, so an expired or missing session can
 * never show a workspace page. Server actions and staff APIs keep their own checks.
 * Token format matches src/lib/auth.ts: "<name>.<issuedAtMs>.<hex hmac-sha256(secret, name|iat)>".
 */
const COOKIE = "asklga_staff";
const SESSION_MS = 12 * 3600 * 1000;
const WEAK = new Set(["change-me", "changeme", "password", "admin", "asklga"]);

async function verify(token: string | undefined): Promise<boolean> {
  const passcode = (process.env.ADMIN_PASSCODE ?? "").trim();
  if (!token || !passcode || WEAK.has(passcode.toLowerCase())) return false;
  const secret = process.env.SESSION_SECRET?.trim() || passcode;
  const parts = token.split(".");
  if (parts.length < 3) return false;
  const given = parts.pop() as string;
  const iat = Number(parts.pop());
  const name = parts.join(".");
  if (!name || !Number.isFinite(iat) || Date.now() - iat > SESSION_MS) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${name}|${iat}`)));
  const expected = Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
  if (expected.length !== given.length) return false;
  let diff = 0;
  for (let k = 0; k < expected.length; k++) diff |= expected.charCodeAt(k) ^ given.charCodeAt(k);
  return diff === 0;
}

export async function middleware(req: NextRequest) {
  if (await verify(req.cookies.get(COOKIE)?.value)) return NextResponse.next();
  const signIn = new URL("/admin", req.url);
  signIn.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(signIn);
}

export const config = {
  // Everything under /admin except the sign-in page itself.
  matcher: ["/admin/:lga/:path*"],
};
