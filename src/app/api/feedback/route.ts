import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { verifyQuestionToken } from "@/lib/auth";
import { allow, clientIp, intOrNull, readJson, TOO_MANY } from "@/lib/ratelimit";
import { notify } from "@/lib/notify";

/**
 * Thumbs up/down on an answer, or a flag that an answer is wrong. The caller must present the
 * token that /api/ask returned with that answer, so only the person who received an answer can
 * rate or flag it.
 */
export async function POST(req: Request) {
  if (!allow(`feedback:${clientIp(req)}`, 20, 60_000)) return TOO_MANY();
  const body = await readJson<{ questionId?: unknown; token?: unknown; feedback?: unknown; flag?: unknown }>(req, 4 * 1024);
  const id = intOrNull(body?.questionId);
  if (!body || !id) return NextResponse.json({ error: "questionId required" }, { status: 400 });
  if (!verifyQuestionToken(id, body.token)) return NextResponse.json({ error: "This answer cannot be rated from here." }, { status: 403 });
  const db = await getDb();
  if (body.feedback === "up" || body.feedback === "down") {
    await db.update(s.questions).set({ feedback: body.feedback }).where(eq(s.questions.id, id));
  }
  if (typeof body.flag === "string" && body.flag.trim()) {
    const note = body.flag.trim().slice(0, 500);
    // Keep any earlier note; a new flag on a resolved answer reopens it for review.
    const [q] = await db
      .update(s.questions)
      .set({ flagged: true, flagResolved: false, flagNote: sql`coalesce(${s.questions.flagNote} || E'\n---\n', '') || ${note}` })
      .where(eq(s.questions.id, id))
      .returning({ lgaId: s.questions.lgaId, question: s.questions.question });
    if (q) notify({ kind: "flag", lgaId: q.lgaId, title: `Answer flagged as wrong (question ${id})`, body: `${q.question.slice(0, 120)} — ${note.slice(0, 120)}`, link: `/admin/${q.lgaId}/flags` });
  }
  return NextResponse.json({ ok: true });
}
