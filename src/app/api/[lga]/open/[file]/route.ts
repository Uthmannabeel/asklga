import { NextResponse } from "next/server";
import { getLga, listAssets, listProfile, listProjects, listServices } from "@/lib/queries";
import { allocationsFor } from "@/lib/national";

/**
 * Open data. GET /api/{lga}/open/projects.json | projects.csv | assets.json | assets.csv |
 * services.json | investment.json. Approved records only, with source and last-verified fields.
 */
const LICENCE = "CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Attribute the LGA and this portal.";
const ALLOCATIONS_TERMS = "Official statistics from the Office of the Accountant-General of the Federation, published via the National Bureau of Statistics. No open licence identified; cite OAGF and NBS. See /about#sources.";

function toCsv(rows: Record<string, unknown>[], fallbackCols: string[]): string {
  const cols = rows.length ? Object.keys(rows[0]) : fallbackCols;
  const esc = (v: unknown) => {
    let t =
      v == null ? "" : v instanceof Date ? v.toISOString() : typeof v === "object" ? JSON.stringify(v) : String(v);
    // A cell starting with = + - @ would run as a formula in Excel; neutralise it.
    if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
    return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\r\n") + "\r\n";
}

const COLUMNS: Record<string, string[]> = {
  projects: ["id", "lgaId", "name", "type", "ward", "lat", "lng", "sponsor", "budgetYear", "budgetLine", "amountNgn", "contractor", "startDate", "expectedCompletion", "status", "statusNote", "lastVerified", "source", "sourceUrl", "evidence", "updatedAt"],
  assets: ["id", "lgaId", "name", "type", "ward", "lat", "lng", "condition", "lastInspected", "notes", "lastVerified", "source", "sourceUrl", "updatedAt"],
  services: ["id", "lgaId", "name", "category", "summary", "eligibility", "documents", "steps", "office", "role", "contact", "turnaround", "lastVerified", "source", "sourceUrl", "updatedAt"],
  investment: ["id", "lgaId", "section", "title", "body", "lastVerified", "source", "sourceUrl", "updatedAt"],
  allocations: ["lgaId", "period", "grossNgn", "deductionsNgn", "netNgn", "source", "sourceUrl"],
};

/** Drops the internal approval flag; every row served here is approved by definition. */
function publicRows<T extends { approval: string }>(rows: T[]): Record<string, unknown>[] {
  return rows.map((row) => {
    const copy: Record<string, unknown> = { ...row };
    delete copy.approval;
    return copy;
  });
}

export async function GET(_req: Request, ctx: { params: Promise<{ lga: string; file: string }> }) {
  const { lga, file } = await ctx.params;
  if (!(await getLga(lga))) return NextResponse.json({ error: "Unknown LGA" }, { status: 404 });
  const m = /^([a-z]+)\.(json|csv)$/.exec(file);
  if (!m) return NextResponse.json({ error: "Unknown dataset. Use <name>.json or <name>.csv." }, { status: 404 });
  const [, name, ext] = m;
  let rows: Record<string, unknown>[];
  switch (name) {
    case "projects":
      rows = publicRows(await listProjects(lga));
      break;
    case "assets":
      rows = publicRows(await listAssets(lga));
      break;
    case "services":
      rows = publicRows(await listServices(lga));
      break;
    case "investment":
      rows = publicRows(await listProfile(lga));
      break;
    case "allocations":
      rows = (await allocationsFor(lga, 1000)).map((r) => ({ lgaId: r.lgaId, period: r.period, grossNgn: r.grossNgn, deductionsNgn: r.deductionsNgn, netNgn: r.netNgn, source: r.source, sourceUrl: r.sourceUrl }));
      break;
    default:
      return NextResponse.json({ error: "Unknown dataset" }, { status: 404 });
  }
  const headers = { "Cache-Control": "public, max-age=300", "Access-Control-Allow-Origin": "*" };
  if (ext === "csv") {
    return new NextResponse(toCsv(rows, COLUMNS[name] ?? []), { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${lga}-${name}.csv"` } });
  }
  // FAAC rows are OAGF statistics republished via NBS with no open licence identified; they keep
  // the publisher's terms rather than the CC BY 4.0 that covers the council registers.
  const licence = name === "allocations" ? ALLOCATIONS_TERMS : LICENCE;
  return NextResponse.json({ lga, dataset: name, generated: new Date().toISOString(), licence, rows }, { headers });
}
