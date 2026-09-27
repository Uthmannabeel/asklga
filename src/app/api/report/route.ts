import { NextResponse } from "next/server";
import { getDb, schema as s } from "@/db";
import { getProject } from "@/lib/queries";
import { allow, clientIp, readJson, safeUrl, TOO_MANY } from "@/lib/ratelimit";

/** Resident photo/site report against a published project. Moderated by the data owner before it shows as evidence. */
export async function POST(req: Request) {
  if (!allow(`report:${clientIp(req)}`, 5, 60_000)) return TOO_MANY();
  const body = await readJson<{ projectId?: unknown; note?: unknown; imageUrl?: unknown }>(req, 8 * 1024);
  const projectId = typeof body?.projectId === "string" ? body.projectId.slice(0, 40) : "";
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 600) : "";
  if (!body || !projectId || !note) return NextResponse.json({ error: "projectId and note required" }, { status: 400 });
  const project = await getProject(projectId);
  if (!project || project.approval !== "approved") return NextResponse.json({ error: "Unknown project" }, { status: 404 });
  const imageUrl = safeUrl(body.imageUrl);
  if (body.imageUrl && !imageUrl) return NextResponse.json({ error: "The photo link must start with http:// or https://" }, { status: 400 });
  const db = await getDb();
  await db.insert(s.photoReports).values({ projectId, lgaId: project.lgaId, note, imageUrl });
  return NextResponse.json({ ok: true });
}
