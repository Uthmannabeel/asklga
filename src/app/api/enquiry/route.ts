import { NextResponse } from "next/server";
import { getDb, schema as s } from "@/db";
import { getLga } from "@/lib/queries";
import { allow, clientIp, readJson, TOO_MANY } from "@/lib/ratelimit";
import { notify } from "@/lib/notify";

/** Investor enquiry: logged for the Planning unit to route to the right agency. */
export async function POST(req: Request) {
  if (!allow(`enquiry:${clientIp(req)}`, 5, 60_000)) return TOO_MANY();
  const body = await readJson<{ lgaId?: unknown; organisation?: unknown; sector?: unknown; summary?: unknown; contact?: unknown }>(req, 8 * 1024);
  const lgaId = typeof body?.lgaId === "string" ? body.lgaId.slice(0, 60) : "";
  const sector = typeof body?.sector === "string" ? body.sector.trim().slice(0, 80) : "";
  const summary = typeof body?.summary === "string" ? body.summary.trim().slice(0, 1500) : "";
  if (!body || !lgaId || !sector || !summary) return NextResponse.json({ error: "lgaId, sector and summary required" }, { status: 400 });
  if (!(await getLga(lgaId))) return NextResponse.json({ error: "Unknown LGA" }, { status: 404 });
  const db = await getDb();
  const [row] = await db
    .insert(s.investorEnquiries)
    .values({
      lgaId,
      sector,
      summary,
      organisation: typeof body.organisation === "string" ? body.organisation.trim().slice(0, 120) || null : null,
      contact: typeof body.contact === "string" ? body.contact.trim().slice(0, 120) || null : null,
    })
    .returning({ id: s.investorEnquiries.id });
  notify({ kind: "enquiry", lgaId, title: `New investor enquiry #${row.id} (${sector})`, body: summary.slice(0, 160), link: `/admin/${lgaId}/enquiries` });
  return NextResponse.json({ ok: true, enquiryId: row.id });
}
