import { NextResponse } from "next/server";
import { signIn } from "@/lib/auth";

/** JSON sign-in for scripts (the eval harness). The browser uses the form on /admin. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { name?: string; passcode?: string };
  const ok = await signIn(String(body.name ?? ""), String(body.passcode ?? ""));
  if (!ok) return NextResponse.json({ error: "Sign-in failed" }, { status: 401 });
  return NextResponse.json({ ok: true });
}
