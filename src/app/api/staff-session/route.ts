import { NextResponse } from "next/server";
import { signIn } from "@/lib/auth";
import { allow, clientIp, readJson, TOO_MANY } from "@/lib/ratelimit";

/** JSON sign-in for scripts (the eval harness). The browser uses the form on /admin. */
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!allow(`signin:${ip}`, 5, 60_000)) return TOO_MANY(60);
  const body = await readJson<{ name?: unknown; passcode?: unknown }>(req, 2 * 1024);
  const name = typeof body?.name === "string" ? body.name : "";
  const passcode = typeof body?.passcode === "string" ? body.passcode : "";
  const ok = await signIn(name, passcode);
  if (!ok) {
    console.warn(`[auth] failed sign-in from ${ip}`);
    return NextResponse.json({ error: "Sign-in failed" }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
