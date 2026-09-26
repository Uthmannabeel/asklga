import { listAssets, listProfile, listProjects, listServices, listDocuments, type Scope } from "./queries";

/**
 * Renders the LGA's approved registers as a compact text block for the answer engine.
 * The block is the second system prompt segment and is cached by the API, so it must be
 * deterministic: same records in, same bytes out.
 */

export function formatNaira(n: number | null | undefined): string {
  if (n == null) return "not published";
  return "N" + n.toLocaleString("en-NG");
}

export type CitationRef = { type: "project" | "service" | "asset" | "profile" | "document"; id: string };

export async function buildRegister(lgaId: string, scope: Scope): Promise<{ text: string; ids: Map<string, string>; recordText: Map<string, string> }> {
  const [projects, services, assets, profile, documents] = await Promise.all([
    listProjects(lgaId),
    listServices(lgaId),
    listAssets(lgaId),
    listProfile(lgaId),
    listDocuments(lgaId, scope),
  ]);

  const ids = new Map<string, string>(); // id -> label
  const recordText = new Map<string, string>(); // id -> rendered text, used for the figure check
  const lines: string[] = [];

  lines.push("## PROJECTS REGISTER (capital projects and their status)");
  for (const p of projects) {
    const t = [
      `[${p.id}] ${p.name}`,
      `type: ${p.type}; ward: ${p.ward ?? "not recorded"}; sponsor: ${p.sponsor}; budget year: ${p.budgetYear ?? "not recorded"}; budget line: ${p.budgetLine ?? "not published"}`,
      `amount: ${formatNaira(p.amountNgn)}${p.amountNgn != null ? ` (${p.amountNgn})` : ""}; contractor: ${p.contractor ?? "not published"}; start: ${p.startDate ?? "not recorded"}; expected completion: ${p.expectedCompletion ?? "not recorded"}`,
      `status: ${p.status}${p.statusNote ? `; note: ${p.statusNote}` : ""}; last verified: ${p.lastVerified ?? "never"}; evidence items: ${p.evidence.length}`,
    ].join("\n");
    lines.push(t);
    ids.set(p.id, p.name);
    recordText.set(p.id, t);
  }

  lines.push("\n## PUBLIC ASSETS INVENTORY");
  for (const a of assets) {
    const t = `[${a.id}] ${a.name}\ntype: ${a.type}; ward: ${a.ward ?? "not recorded"}; condition: ${a.condition ?? "unknown"}; last inspected: ${a.lastInspected ?? "never"}${a.notes ? `; notes: ${a.notes}` : ""}`;
    lines.push(t);
    ids.set(a.id, a.name);
    recordText.set(a.id, t);
  }

  lines.push("\n## SERVICE DIRECTORY");
  for (const sv of services) {
    const t = [
      `[${sv.id}] ${sv.name} (${sv.category})`,
      sv.summary ? `what: ${sv.summary}` : "",
      sv.eligibility ? `who: ${sv.eligibility}` : "",
      sv.documents.length ? `documents: ${sv.documents.join("; ")}` : "documents: none required",
      sv.steps.length ? `steps: ${sv.steps.map((x, i) => `${i + 1}. ${x}`).join(" ")}` : "",
      `office: ${sv.office ?? "not recorded"}; responsible: ${sv.role ?? "not recorded"}; contact: ${sv.contact ?? "not recorded"}; turnaround: ${sv.turnaround ?? "not recorded"}`,
    ]
      .filter(Boolean)
      .join("\n");
    lines.push(t);
    ids.set(sv.id, sv.name);
    recordText.set(sv.id, t);
  }

  lines.push("\n## INVESTMENT PROFILE");
  for (const sec of profile) {
    const t = `[${sec.id}] ${sec.title}\n${sec.body}`;
    lines.push(t);
    ids.set(sec.id, sec.title);
    recordText.set(sec.id, t);
  }

  lines.push("\n## DOCUMENT LIBRARY (titles; relevant passages are supplied separately per question)");
  for (const d of documents) {
    lines.push(`[${d.id}] ${d.title} (${d.kind}${d.visibility === "internal" ? ", internal" : ""})`);
    ids.set(d.id, d.title);
    recordText.set(d.id, d.body);
  }

  return { text: lines.join("\n"), ids, recordText };
}
