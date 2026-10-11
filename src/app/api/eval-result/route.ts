import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { and, eq, gte, inArray } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { canAccessLga, currentStaff, roleAtLeast } from "@/lib/auth";
import { MODEL } from "@/lib/ask";
import { scoreCase } from "@/lib/evalScore.mjs";
import { scrubPii } from "@/lib/pii";
import { readJson } from "@/lib/ratelimit";
import { getLga } from "@/lib/queries";
import testSet from "../../../../eval/questions.json";

type Case = { id: string; lang: string; question: string; expect: Parameters<typeof scoreCase>[0]["expect"] };
const CASES = testSet as unknown as Case[];
const TEST_SET_HASH = createHash("sha256").update(JSON.stringify(CASES)).digest("hex");
/** Answers older than this cannot be submitted, so a run reflects the service as it is now. */
const MAX_AGE_MS = 6 * 3600 * 1000;

/**
 * The eval harness posts which stored question answered each test case (staff session
 * required). The server does the scoring: it loads those answers from its own question log,
 * checks each one is the test question for this LGA, asked recently, and scores it with the
 * shared rubric. A submitted pass count is never trusted. Every case must be present once.
 */
export async function POST(req: Request) {
  const me = await currentStaff();
  if (!me || !roleAtLeast(me.role, "editor")) return NextResponse.json({ error: "Staff sign-in required" }, { status: 401 });
  const body = await readJson<{ lgaId?: unknown; results?: unknown; note?: unknown }>(req, 16 * 1024);
  const lgaId = typeof body?.lgaId === "string" ? body.lgaId : "";
  const results = Array.isArray(body?.results) ? (body.results as { caseId?: unknown; questionId?: unknown }[]) : [];
  if (!lgaId || !results.length) return NextResponse.json({ error: "lgaId and results [{caseId, questionId}] required" }, { status: 400 });
  if (!canAccessLga(me, lgaId) || !(await getLga(lgaId))) return NextResponse.json({ error: "Not your LGA" }, { status: 403 });

  // questionId null = the request failed (error, timeout); the case is scored as a fail.
  const byCase = new Map<string, number | null>();
  for (const r of results) {
    if (typeof r?.caseId !== "string" || !(r?.questionId === null || Number.isSafeInteger(r?.questionId))) return NextResponse.json({ error: "Each result needs caseId and questionId (or null)" }, { status: 400 });
    if (byCase.has(r.caseId)) return NextResponse.json({ error: `Case ${r.caseId} appears twice` }, { status: 400 });
    byCase.set(r.caseId, r.questionId as number | null);
  }
  const missing = CASES.filter((c) => !byCase.has(c.id)).map((c) => c.id);
  if (missing.length || byCase.size !== CASES.length) {
    return NextResponse.json({ error: `A run must cover the whole test set (${CASES.length} cases). Missing: ${missing.join(", ") || "none"}; unknown: ${[...byCase.keys()].filter((k) => !CASES.some((c) => c.id === k)).join(", ") || "none"}` }, { status: 400 });
  }
  const ids = [...byCase.values()].filter((v): v is number => v !== null);
  if (new Set(ids).size !== ids.length) return NextResponse.json({ error: "Each stored answer can score one case only" }, { status: 400 });

  const db = await getDb();
  const rows = await db
    .select()
    .from(s.questions)
    .where(and(inArray(s.questions.id, ids), eq(s.questions.lgaId, lgaId), gte(s.questions.createdAt, new Date(Date.now() - MAX_AGE_MS))));
  const stored = new Map(rows.map((r) => [r.id, r]));

  const scored: { caseId: string; questionId: number | null; ok: boolean; failed: string[] }[] = [];
  for (const c of CASES) {
    const qid = byCase.get(c.id) ?? null;
    if (qid === null) {
      scored.push({ caseId: c.id, questionId: null, ok: false, failed: ["no-answer"] });
      continue;
    }
    const row = stored.get(qid);
    // The log holds the PII-scrubbed question, so compare against the scrubbed test question.
    if (!row || row.question !== scrubPii(c.question.trim()).text) {
      scored.push({ caseId: c.id, questionId: qid, ok: false, failed: ["not-found"] });
      continue;
    }
    const { ok, checks } = scoreCase(c, { answered: row.answered, language: row.language, answer: row.answer, citations: row.citations });
    scored.push({ caseId: c.id, questionId: qid, ok, failed: Object.entries(checks).filter(([, v]) => !v).map(([k]) => k) });
  }
  const unmatched = scored.filter((r) => r.failed.includes("not-found")).length;
  if (unmatched) return NextResponse.json({ error: `${unmatched} answers were not found for this LGA in the last 6 hours, or do not match their test question`, results: scored }, { status: 422 });

  const pass = scored.filter((r) => r.ok).length;
  const [run] = await db
    .insert(s.evalRuns)
    .values({
      lgaId,
      cases: CASES.length,
      pass,
      accuracy: Math.round((pass / CASES.length) * 100),
      model: MODEL,
      note: typeof body?.note === "string" ? body.note.slice(0, 200) : `run by ${me.name}`,
      testSet: TEST_SET_HASH,
      verified: true,
      results: scored,
    })
    .returning({ id: s.evalRuns.id });
  return NextResponse.json({ ok: true, runId: run.id, cases: CASES.length, pass, accuracy: Math.round((pass / CASES.length) * 100), testSet: TEST_SET_HASH });
}

/** Any published run, case by case: GET /api/eval-result?run=<id>. */
export async function GET(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("run"));
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: "run=<id> required" }, { status: 400 });
  const db = await getDb();
  const [r] = await db.select().from(s.evalRuns).where(eq(s.evalRuns.id, id)).limit(1);
  if (!r) return NextResponse.json({ error: "No such run" }, { status: 404 });
  return NextResponse.json({
    run: r.id,
    lga: r.lgaId,
    ranAt: r.ranAt,
    model: r.model,
    scoredBy: r.verified ? "server, from stored answers" : "staff-reported summary (before server scoring)",
    testSet: r.testSet ? { sha256: r.testSet, file: "eval/questions.json" } : null,
    cases: r.cases,
    pass: r.pass,
    accuracy: r.accuracy,
    results: r.results ?? null,
  });
}
