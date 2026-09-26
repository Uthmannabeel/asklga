import { NextResponse } from "next/server";
import { getDb, schema as s } from "@/db";
import { getProject } from "@/lib/queries";

/** Resident photo/site report against a project. Moderated by the data owner before it shows as evidence. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { projectId?: string; note?: string; imageUrl?: string };
  const projectId = String(body.projectId ?? "");
  const note = String(body.note ?? "").trim().slice(0, 600);
  if (!projectId || !note) return NextResponse.json({ error: "projectId and note required" }, { status: 400 });
  const project = await getProject(projectId);
  if (!project) return NextResponse.json({ error: "Unknown project" }, { status: 404 });
  const db = await getDb();
  await db.insert(s.photoReports).values({ projectId, lgaId: project.lgaId, note, imageUrl: body.imageUrl ? String(body.imageUrl).slice(0, 500) : null });
  return NextResponse.json({ ok: true });
}
