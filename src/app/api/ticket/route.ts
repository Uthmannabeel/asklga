import { NextResponse } from "next/server";
import { getDb, schema as s } from "@/db";
import { getLga } from "@/lib/queries";
import { allow, clientIp, intOrNull, readJson, TOO_MANY } from "@/lib/ratelimit";
import { notify } from "@/lib/notify";

/** "Talk to a person": creates a ticket for a named officer. The contact number is stored, never sent to a model. */
export async function POST(req: Request) {
  if (!allow(`ticket:${clientIp(req)}`, 5, 60_000)) return TOO_MANY();
  const body = await readJson<{ lgaId?: unknown; questionId?: unknown; summary?: unknown; contact?: unknown }>(req, 8 * 1024);
  const lgaId = typeof body?.lgaId === "string" ? body.lgaId.slice(0, 60) : "";
  const summary = typeof body?.summary === "string" ? body.summary.trim().slice(0, 1000) : "";
  if (!body || !lgaId || !summary) return NextResponse.json({ error: "lgaId and summary required" }, { status: 400 });
  if (!(await getLga(lgaId))) return NextResponse.json({ error: "Unknown LGA" }, { status: 404 });
  const contact = typeof body.contact === "string" ? body.contact.replace(/[^\d+\s()-]/g, "").trim().slice(0, 40) || null : null;
  const db = await getDb();
  const [row] = await db
    .insert(s.tickets)
    .values({ lgaId, questionId: intOrNull(body.questionId), summary, contact })
    .returning({ id: s.tickets.id });
  notify({ kind: "ticket", lgaId, title: `New ticket #${row.id}`, body: `${summary.slice(0, 160)}${contact ? " (phone left)" : " (no phone)"}`, link: `/admin/${lgaId}/tickets` });
  return NextResponse.json({ ok: true, ticketId: row.id });
}
