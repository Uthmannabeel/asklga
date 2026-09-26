import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";

/** Thumbs up/down on an answer, or a flag from staff or residents that an answer is wrong. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { questionId?: number; feedback?: string; flag?: string };
  const id = Number(body.questionId);
  if (!id) return NextResponse.json({ error: "questionId required" }, { status: 400 });
  const db = await getDb();
  if (body.feedback === "up" || body.feedback === "down") {
    await db.update(s.questions).set({ feedback: body.feedback }).where(eq(s.questions.id, id));
  }
  if (typeof body.flag === "string" && body.flag.trim()) {
    await db.update(s.questions).set({ flagged: true, flagNote: body.flag.trim().slice(0, 500), flagResolved: false }).where(eq(s.questions.id, id));
  }
  return NextResponse.json({ ok: true });
}
