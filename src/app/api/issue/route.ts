import { NextResponse } from "next/server";
import { getLga } from "@/lib/queries";
import { allow, clientIp, readJson, TOO_MANY } from "@/lib/ratelimit";
import { validateIssue } from "@/lib/participationRules";
import { createIssue, supportIssue } from "@/lib/participation";
import { notify } from "@/lib/notify";
import { forget } from "@/lib/memo";

/**
 * POST /api/issue            {lgaId, fn, title, detail, ward?, place?, photoUrl?}  files a problem report
 * POST /api/issue?support=1  {id}                                                 "this affects me too"
 * Reports are public at once, after personal details are stripped. No account, no name, no phone.
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  const url = new URL(req.url);
  if (url.searchParams.get("support")) {
    if (!allow(`support:${ip}`, 20, 60_000)) return TOO_MANY();
    const body = await readJson<{ id?: unknown }>(req, 1024);
    const id = typeof body?.id === "string" ? body.id.slice(0, 40) : "";
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const supports = await supportIssue(id);
    if (supports == null) return NextResponse.json({ error: "Unknown issue" }, { status: 404 });
    forget("issues:");
    return NextResponse.json({ ok: true, supports });
  }

  if (!allow(`issue:${ip}`, 3, 10 * 60_000)) return TOO_MANY(600);
  const body = await readJson<Record<string, unknown>>(req, 16 * 1024);
  const lgaId = typeof body?.lgaId === "string" ? body.lgaId.slice(0, 60) : "";
  if (!body || !lgaId) return NextResponse.json({ error: "lgaId required" }, { status: 400 });
  const lga = await getLga(lgaId);
  if (!lga) return NextResponse.json({ error: "Unknown LGA" }, { status: 404 });
  const checked = validateIssue(body);
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });
  const id = await createIssue(lgaId, checked.value, ip);
  forget("issues:");
  notify({ kind: "issue", lgaId, title: `New problem report ${id}`, body: checked.value.title, link: `/admin/${lgaId}/issues` });
  return NextResponse.json({ ok: true, id, url: `/${lgaId}/issues/${id}` });
}
