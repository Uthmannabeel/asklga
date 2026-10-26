import { NextResponse } from "next/server";
import { ask, AnswerServiceOffline, AnswerServiceBusy, sanitizeHistory } from "@/lib/ask";
import { getLga } from "@/lib/queries";
import { isStaff, questionToken } from "@/lib/auth";
import { allow, allowDaily, clientIp, readJson, TOO_MANY } from "@/lib/ratelimit";

export const runtime = "nodejs";

/** Per-connection and per-LGA budgets. Override for a paid model key. */
const PER_IP_PER_MIN = Number(process.env.ASK_RATE_PER_MIN ?? 6);
const PER_IP_PER_DAY = Number(process.env.ASK_RATE_PER_DAY ?? 60);
const PER_LGA_PER_DAY = Number(process.env.ASK_LGA_PER_DAY ?? 2000);

export async function POST(req: Request) {
  const ip = clientIp(req);
  // Signed-in staff (and the eval harness) are not subject to the per-connection budget; the
  // per-LGA daily budget still applies to everyone.
  const staff = await isStaff();
  if (!staff && (!allow(`ask:${ip}`, PER_IP_PER_MIN, 60_000) || !allowDaily(`ask-day:${ip}`, PER_IP_PER_DAY))) return TOO_MANY();

  const body = await readJson<{ lgaId?: unknown; question?: unknown; scope?: unknown; audience?: unknown; history?: unknown; spoken?: unknown }>(req, 16 * 1024);
  if (!body) return NextResponse.json({ error: "Send JSON with lgaId and question." }, { status: 400 });
  const lgaId = typeof body.lgaId === "string" ? body.lgaId.slice(0, 60) : "";
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!lgaId || !question) return NextResponse.json({ error: "lgaId and question are required." }, { status: 400 });
  if (question.length > 1000) return NextResponse.json({ error: "Keep the question under 1000 characters." }, { status: 400 });
  if (!(await getLga(lgaId))) return NextResponse.json({ error: "Unknown LGA." }, { status: 404 });

  if (!allowDaily(`ask-lga:${lgaId}`, PER_LGA_PER_DAY)) {
    return NextResponse.json(
      { error: "The answer service has reached its limit for today. Try again tomorrow, or ask a person at the secretariat.", offline: true },
      { status: 503 },
    );
  }

  // Internal scope (private documents) is only for signed-in staff.
  const wantsInternal = body.scope === "internal";
  const scope = wantsInternal && staff ? "internal" : "public";
  const audience = staff && wantsInternal ? "staff" : body.audience === "investor" ? "investor" : "resident";

  try {
    const result = await ask({ lgaId, question, scope, audience, history: sanitizeHistory(body.history), spoken: body.spoken === true });
    return NextResponse.json({ ...result, token: questionToken(result.questionId) });
  } catch (e) {
    if (e instanceof AnswerServiceOffline) {
      return NextResponse.json({ error: e.message, offline: true }, { status: 503 });
    }
    if (e instanceof AnswerServiceBusy) {
      return NextResponse.json({ error: e.message, busy: true }, { status: 503, headers: { "Retry-After": "60" } });
    }
    console.error("[ask] unexpected error", e);
    return NextResponse.json({ error: "The answer service had a problem. Try again in a moment, or use the pages above." }, { status: 502 });
  }
}
