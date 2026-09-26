import { NextResponse } from "next/server";
import { getLga, listAssets, listProfile, listProjects, listServices } from "@/lib/queries";

/**
 * Open data. GET /api/{lga}/open/projects.json | projects.csv | assets.json | assets.csv |
 * services.json | investment.json. Approved records only, with source and last-verified fields.
 */
function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const t = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

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
  const [name, ext] = file.split(".");
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
    default:
      return NextResponse.json({ error: "Unknown dataset" }, { status: 404 });
  }
  const headers = { "Cache-Control": "public, max-age=300", "Access-Control-Allow-Origin": "*" };
  if (ext === "csv") {
    return new NextResponse(toCsv(rows), { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${lga}-${name}.csv"` } });
  }
  return NextResponse.json({ lga, dataset: name, generated: new Date().toISOString(), licence: "Open data. Attribute the LGA and this portal.", rows }, { headers });
}
