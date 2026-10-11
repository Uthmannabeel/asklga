import { NextResponse } from "next/server";
import { signIn } from "@/lib/auth";
import { readJson, TOO_MANY } from "@/lib/ratelimit";

/**
 * JSON sign-in for scripts (the eval harness). The browser uses the form on /admin; both go
 * through signIn, which holds the throttle.
 * Body: {email, password} for an account, or {name, passcode} during first-run setup.
 */
export async function POST(req: Request) {
  const body = await readJson<{ email?: unknown; password?: unknown; name?: unknown; passcode?: unknown }>(req, 2 * 1024);
  const identity = typeof body?.email === "string" ? body.email : typeof body?.name === "string" ? body.name : "";
  const secret = typeof body?.password === "string" ? body.password : typeof body?.passcode === "string" ? body.passcode : "";
  const result = await signIn(identity, secret);
  if (result === "throttled") return TOO_MANY(60);
  if (result !== "ok") return NextResponse.json({ error: "Sign-in failed" }, { status: 401 });
  return NextResponse.json({ ok: true });
}
