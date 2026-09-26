import { NextResponse } from "next/server";
import { getDb, schema as s } from "@/db";
import { getLga } from "@/lib/queries";

/** Investor enquiry: logged for the Planning unit to route to the right agency. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { lgaId?: string; organisation?: string; sector?: string; summary?: string; contact?: string };
  const lgaId = String(body.lgaId ?? "");
  const sector = String(body.sector ?? "").trim().slice(0, 80);
  const summary = String(body.summary ?? "").trim().slice(0, 1500);
  if (!lgaId || !sector || !summary) return NextResponse.json({ error: "lgaId, sector and summary required" }, { status: 400 });
  if (!(await getLga(lgaId))) return NextResponse.json({ error: "Unknown LGA" }, { status: 404 });
  const db = await getDb();
  const [row] = await db
    .insert(s.investorEnquiries)
    .values({ lgaId, sector, summary, organisation: body.organisation ? String(body.organisation).slice(0, 120) : null, contact: body.contact ? String(body.contact).slice(0, 120) : null })
    .returning({ id: s.investorEnquiries.id });
  return NextResponse.json({ ok: true, enquiryId: row.id });
}
