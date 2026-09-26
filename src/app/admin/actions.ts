"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { signIn, signOut, staffName } from "@/lib/auth";
import { lgaCodeFor, nextId } from "@/lib/ids";
import { chunkText } from "@/db/seed";
import { getProject } from "@/lib/queries";

async function requireStaff(): Promise<string> {
  const name = await staffName();
  if (!name) redirect("/admin");
  return name;
}

function str(fd: FormData, key: string, max = 2000): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t ? t : null;
}
function num(fd: FormData, key: string): number | null {
  const v = str(fd, key, 40);
  if (v == null) return null;
  const n = Number(v.replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}
function lines(fd: FormData, key: string): string[] {
  return (str(fd, key, 5000) ?? "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
}

export async function signInAction(fd: FormData) {
  const ok = await signIn(String(fd.get("name") ?? ""), String(fd.get("passcode") ?? ""));
  if (!ok) redirect("/admin?error=1");
  redirect("/admin");
}

export async function signOutAction() {
  await signOut();
  redirect("/admin");
}

/* ---------- Projects ---------- */

export async function saveProject(fd: FormData) {
  const by = await requireStaff();
  const db = await getDb();
  const lgaId = str(fd, "lgaId", 60)!;
  let id = str(fd, "id", 40);
  const values = {
    lgaId,
    name: str(fd, "name", 200) ?? "Untitled project",
    type: str(fd, "type", 40) ?? "other",
    ward: str(fd, "ward", 80),
    lat: num(fd, "lat"),
    lng: num(fd, "lng"),
    sponsor: str(fd, "sponsor", 40) ?? "LGA",
    budgetYear: num(fd, "budgetYear"),
    budgetLine: str(fd, "budgetLine", 200),
    amountNgn: num(fd, "amountNgn"),
    contractor: str(fd, "contractor", 200),
    startDate: str(fd, "startDate", 20),
    expectedCompletion: str(fd, "expectedCompletion", 20),
    statusNote: str(fd, "statusNote", 600),
    source: str(fd, "source", 300) ?? "Entered by LGA staff",
    sourceUrl: str(fd, "sourceUrl", 500),
    approval: str(fd, "approval", 20) === "approved" ? "approved" : "draft",
    lastVerified: str(fd, "lastVerified", 20),
    updatedAt: new Date(),
  };
  const newStatus = (str(fd, "status", 20) ?? "unknown") as s.ProjectStatus;
  if (id) {
    const existing = await getProject(id);
    await db.update(s.projects).set({ ...values, status: newStatus }).where(eq(s.projects.id, id));
    if (existing && existing.status !== newStatus) {
      await db.insert(s.statusUpdates).values({ projectId: id, oldStatus: existing.status, newStatus, note: str(fd, "statusNote", 600), by });
    }
  } else {
    id = await nextId(db, "projects", lgaId, "P");
    await db.insert(s.projects).values({ id, ...values, status: newStatus });
    await db.insert(s.statusUpdates).values({ projectId: id, oldStatus: null, newStatus, note: "Record created", by });
  }
  revalidatePath(`/${lgaId}/projects`);
  redirect(`/admin/${lgaId}/projects/${id}`);
}

export async function updateProjectStatus(fd: FormData) {
  const by = await requireStaff();
  const db = await getDb();
  const id = str(fd, "id", 40)!;
  const existing = await getProject(id);
  if (!existing) redirect("/admin");
  const newStatus = (str(fd, "status", 20) ?? existing.status) as s.ProjectStatus;
  const note = str(fd, "note", 600);
  const evidenceCaption = str(fd, "evidenceCaption", 200);
  const evidenceUrl = str(fd, "evidenceUrl", 500);
  const evidence = evidenceCaption ? [...existing.evidence, { url: evidenceUrl ?? "", caption: evidenceCaption, date: new Date().toISOString().slice(0, 10) }] : existing.evidence;
  await db
    .update(s.projects)
    .set({ status: newStatus, statusNote: note ?? existing.statusNote, evidence, lastVerified: new Date().toISOString().slice(0, 10), updatedAt: new Date() })
    .where(eq(s.projects.id, id));
  await db.insert(s.statusUpdates).values({ projectId: id, oldStatus: existing.status, newStatus, note, by });
  revalidatePath(`/${existing.lgaId}/projects/${id}`);
  redirect(`/admin/${existing.lgaId}/projects/${id}`);
}

export async function moderateReport(fd: FormData) {
  await requireStaff();
  const db = await getDb();
  const id = Number(fd.get("id"));
  const status = str(fd, "status", 20) === "approved" ? "approved" : "rejected";
  const [r] = await db.update(s.photoReports).set({ status }).where(eq(s.photoReports.id, id)).returning({ projectId: s.photoReports.projectId, lgaId: s.photoReports.lgaId });
  if (r) {
    revalidatePath(`/${r.lgaId}/projects/${r.projectId}`);
    redirect(`/admin/${r.lgaId}/projects/${r.projectId}`);
  }
  redirect("/admin");
}

/* ---------- Services ---------- */

export async function saveService(fd: FormData) {
  await requireStaff();
  const db = await getDb();
  const lgaId = str(fd, "lgaId", 60)!;
  let id = str(fd, "id", 40);
  const values = {
    lgaId,
    name: str(fd, "name", 200) ?? "Untitled service",
    category: str(fd, "category", 80) ?? "General",
    summary: str(fd, "summary", 600),
    eligibility: str(fd, "eligibility", 600),
    documents: lines(fd, "documents"),
    steps: lines(fd, "steps"),
    office: str(fd, "office", 200),
    role: str(fd, "role", 120),
    contact: str(fd, "contact", 200),
    turnaround: str(fd, "turnaround", 120),
    source: str(fd, "source", 300) ?? "Entered by LGA staff",
    sourceUrl: str(fd, "sourceUrl", 500),
    approval: str(fd, "approval", 20) === "approved" ? "approved" : "draft",
    lastVerified: str(fd, "lastVerified", 20),
    updatedAt: new Date(),
  };
  if (id) await db.update(s.services).set(values).where(eq(s.services.id, id));
  else {
    id = await nextId(db, "services", lgaId, "S");
    await db.insert(s.services).values({ id, ...values });
  }
  revalidatePath(`/${lgaId}/services`);
  redirect(`/admin/${lgaId}/services`);
}

/* ---------- Assets ---------- */

export async function saveAsset(fd: FormData) {
  await requireStaff();
  const db = await getDb();
  const lgaId = str(fd, "lgaId", 60)!;
  let id = str(fd, "id", 40);
  const values = {
    lgaId,
    name: str(fd, "name", 200) ?? "Untitled asset",
    type: str(fd, "type", 40) ?? "other",
    ward: str(fd, "ward", 80),
    lat: num(fd, "lat"),
    lng: num(fd, "lng"),
    condition: str(fd, "condition", 20),
    lastInspected: str(fd, "lastInspected", 20),
    notes: str(fd, "notes", 600),
    source: str(fd, "source", 300) ?? "Entered by LGA staff",
    sourceUrl: str(fd, "sourceUrl", 500),
    approval: str(fd, "approval", 20) === "approved" ? "approved" : "draft",
    lastVerified: str(fd, "lastVerified", 20),
    updatedAt: new Date(),
  };
  if (id) await db.update(s.assets).set(values).where(eq(s.assets.id, id));
  else {
    id = await nextId(db, "assets", lgaId, "A");
    await db.insert(s.assets).values({ id, ...values });
  }
  revalidatePath(`/${lgaId}/assets`);
  redirect(`/admin/${lgaId}/assets`);
}

/* ---------- Investment profile ---------- */

export async function saveProfileSection(fd: FormData) {
  await requireStaff();
  const db = await getDb();
  const lgaId = str(fd, "lgaId", 60)!;
  const section = (str(fd, "section", 40) ?? "other").toLowerCase().replace(/[^a-z]+/g, "-");
  const id = str(fd, "id", 60) ?? `${await lgaCodeFor(db, lgaId)}-I-${section}`;
  const values = {
    lgaId,
    section,
    title: str(fd, "title", 200) ?? section,
    body: str(fd, "body", 8000) ?? "",
    ord: num(fd, "ord") ?? 99,
    source: str(fd, "source", 300) ?? "Entered by LGA staff",
    sourceUrl: str(fd, "sourceUrl", 500),
    approval: str(fd, "approval", 20) === "approved" ? "approved" : "draft",
    lastVerified: str(fd, "lastVerified", 20),
    updatedAt: new Date(),
  };
  const exists = await db.select({ id: s.profileSections.id }).from(s.profileSections).where(eq(s.profileSections.id, id)).limit(1);
  if (exists.length) await db.update(s.profileSections).set(values).where(eq(s.profileSections.id, id));
  else await db.insert(s.profileSections).values({ id, ...values });
  revalidatePath(`/${lgaId}/investment`);
  redirect(`/admin/${lgaId}/investment`);
}

/* ---------- Documents ---------- */

export async function saveDocument(fd: FormData) {
  await requireStaff();
  const db = await getDb();
  const lgaId = str(fd, "lgaId", 60)!;
  let id = str(fd, "id", 40);
  const body = str(fd, "body", 200000) ?? "";
  const visibility = str(fd, "visibility", 20) === "internal" ? "internal" : "public";
  const values = {
    lgaId,
    title: str(fd, "title", 300) ?? "Untitled document",
    kind: str(fd, "kind", 40) ?? "notice",
    visibility,
    body,
    source: str(fd, "source", 300) ?? "Entered by LGA staff",
    sourceUrl: str(fd, "sourceUrl", 500),
    approval: str(fd, "approval", 20) === "approved" ? "approved" : "draft",
    reviewBy: str(fd, "reviewBy", 20),
  };
  if (id) {
    await db.update(s.documents).set(values).where(eq(s.documents.id, id));
    await db.delete(s.chunks).where(eq(s.chunks.documentId, id));
  } else {
    id = await nextId(db, "documents", lgaId, "D");
    await db.insert(s.documents).values({ id, ...values });
  }
  const parts = chunkText(body);
  if (parts.length) await db.insert(s.chunks).values(parts.map((text, ord) => ({ documentId: id!, lgaId, visibility, ord, text })));
  revalidatePath(`/${lgaId}/documents`);
  redirect(`/admin/${lgaId}/documents`);
}

/* ---------- Questions: gaps, flags, tickets, enquiries ---------- */

export async function resolveGap(fd: FormData) {
  await requireStaff();
  const db = await getDb();
  const id = Number(fd.get("id"));
  const lgaId = str(fd, "lgaId", 60)!;
  await db.update(s.questions).set({ gapStatus: "resolved", gapResolution: str(fd, "resolution", 600) }).where(eq(s.questions.id, id));
  redirect(`/admin/${lgaId}/gaps`);
}

export async function resolveFlag(fd: FormData) {
  await requireStaff();
  const db = await getDb();
  const id = Number(fd.get("id"));
  const lgaId = str(fd, "lgaId", 60)!;
  await db.update(s.questions).set({ flagResolved: true, flagNote: str(fd, "resolution", 600) }).where(eq(s.questions.id, id));
  redirect(`/admin/${lgaId}/flags`);
}

export async function updateTicket(fd: FormData) {
  await requireStaff();
  const db = await getDb();
  const id = Number(fd.get("id"));
  const lgaId = str(fd, "lgaId", 60)!;
  const status = str(fd, "status", 20) ?? "open";
  await db.update(s.tickets).set({ status, assignedTo: str(fd, "assignedTo", 120), notes: str(fd, "notes", 1000) }).where(eq(s.tickets.id, id));
  redirect(`/admin/${lgaId}/tickets`);
}

export async function updateEnquiry(fd: FormData) {
  await requireStaff();
  const db = await getDb();
  const id = Number(fd.get("id"));
  const lgaId = str(fd, "lgaId", 60)!;
  await db.update(s.investorEnquiries).set({ status: str(fd, "status", 20) ?? "new", routedTo: str(fd, "routedTo", 200) }).where(eq(s.investorEnquiries.id, id));
  redirect(`/admin/${lgaId}/enquiries`);
}
