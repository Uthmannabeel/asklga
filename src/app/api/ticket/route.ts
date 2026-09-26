import { NextResponse } from "next/server";
import { getDb, schema as s } from "@/db";
import { getLga } from "@/lib/queries";

/** "Talk to a person": creates a ticket for a named officer. The contact number is stored, never sent to a model. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { lgaId?: string; questionId?: number; summary?: string; contact?: string };
  const lgaId = String(body.lgaId ?? "");
  const summary = String(body.summary ?? "").trim().slice(0, 1000);
  if (!lgaId || !summary) return NextResponse.json({ error: "lgaId and summary required" }, { status: 400 });
  if (!(await getLga(lgaId))) return NextResponse.json({ error: "Unknown LGA" }, { status: 404 });
  const db = await getDb();
  const [row] = await db
    .insert(s.tickets)
    .values({ lgaId, questionId: body.questionId ? Number(body.questionId) : null, summary, contact: body.contact ? String(body.contact).slice(0, 40) : null })
    .returning({ id: s.tickets.id });
  return NextResponse.json({ ok: true, ticketId: row.id });
}
