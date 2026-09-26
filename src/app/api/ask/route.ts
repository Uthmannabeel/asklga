import { NextResponse } from "next/server";
import { ask } from "@/lib/ask";
import { getLga } from "@/lib/queries";
import { isStaff } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { lgaId?: string; question?: string; scope?: string; audience?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Send JSON with lgaId and question." }, { status: 400 });
  }
  const lgaId = String(body.lgaId ?? "");
  const question = String(body.question ?? "").trim();
  if (!lgaId || !question) return NextResponse.json({ error: "lgaId and question are required." }, { status: 400 });
  if (question.length > 1000) return NextResponse.json({ error: "Keep the question under 1000 characters." }, { status: 400 });
  if (!(await getLga(lgaId))) return NextResponse.json({ error: "Unknown LGA." }, { status: 404 });

  // Internal scope (private documents) is only for signed-in staff.
  const wantsInternal = body.scope === "internal";
  const staff = await isStaff();
  const scope = wantsInternal && staff ? "internal" : "public";
  const audience = staff && wantsInternal ? "staff" : body.audience === "investor" ? "investor" : "resident";

  try {
    const result = await ask({ lgaId, question, scope, audience });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
