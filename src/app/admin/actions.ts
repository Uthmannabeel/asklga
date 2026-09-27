"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { signIn, signOut, staffName } from "@/lib/auth";
import { lgaCodeFor, nextId } from "@/lib/ids";
import { chunkText } from "@/db/seed";
import { getProject } from "@/lib/queries";
import { safeUrl } from "@/lib/ratelimit";
import { isoDateLagos } from "@/lib/format";

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
/** Positive integer id from a hidden field, or a redirect back to the workspace. */
function intId(fd: FormData, lgaId: string): number {
  const n = Number(fd.get("id"));
  if (!Number.isSafeInteger(n) || n <= 0) redirect(`/admin/${lgaId}`);
  return n;
}
/** Keeps enum-like fields to their known values so nothing odd reaches public pages or CSS classes. */
function oneOf<T extends string>(fd: FormData, key: string, allowed: readonly T[], fallback: T): T {
  const v = str(fd, key, 40);
  return (allowed as readonly string[]).includes(v ?? "") ? (v as T) : fallback;
}
const PROJECT_STATUS = ["planned", "ongoing", "completed", "stalled", "abandoned", "unknown"] as const;
const PROJECT_TYPE = ["road", "health", "education", "water", "market", "drainage", "power", "building", "other"] as const;
const SPONSOR = ["LGA", "State", "Federal", "NDDC", "Constituency", "Donor", "Other"] as const;
const CONDITION = ["good", "fair", "poor", "unknown"] as const;
const TICKET_STATUS = ["open", "in-progress", "closed"] as const;
const ENQUIRY_STATUS = ["new", "routed", "closed"] as const;
/** Ensures a record belongs to the LGA named in the form, so one LGA's staff cannot edit another's. */
async function ownedBy<T extends { lgaId: string }>(row: T | undefined | null, lgaId: string): Promise<T> {
  if (!row || row.lgaId !== lgaId) redirect(`/admin/${lgaId}`);
  return row;
}

export async function signInAction(fd: FormData) {
  const ok = await signIn(String(fd.get("name") ?? ""), String(fd.get("passcode") ?? ""));
  if (!ok) redirect("/admin?error=1");
  // Only same-site workspace paths may be used as the return destination.
  const next = String(fd.get("next") ?? "");
  redirect(/^\/admin\/[a-z0-9-]+(\/[a-z0-9\-/?=&]*)?$/i.test(next) ? next : "/admin");
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
    type: oneOf(fd, "type", PROJECT_TYPE, "other"),
    ward: str(fd, "ward", 80),
    lat: num(fd, "lat"),
    lng: num(fd, "lng"),
    sponsor: oneOf(fd, "sponsor", SPONSOR, "LGA"),
    budgetYear: num(fd, "budgetYear"),
    budgetLine: str(fd, "budgetLine", 200),
    amountNgn: num(fd, "amountNgn"),
    contractor: str(fd, "contractor", 200),
    startDate: str(fd, "startDate", 20),
    expectedCompletion: str(fd, "expectedCompletion", 20),
    statusNote: str(fd, "statusNote", 600),
    source: str(fd, "source", 300) ?? "Entered by LGA staff",
    sourceUrl: safeUrl(fd.get("sourceUrl")),
    approval: str(fd, "approval", 20) === "approved" ? "approved" : "draft",
    lastVerified: str(fd, "lastVerified", 20),
    updatedAt: new Date(),
  };
  const newStatus = oneOf(fd, "status", PROJECT_STATUS, "unknown") as s.ProjectStatus;
  if (id) {
    const existing = await ownedBy(await getProject(id), lgaId);
    await db.update(s.projects).set({ ...values, status: newStatus }).where(eq(s.projects.id, id));
    if (existing.status !== newStatus) {
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
  const newStatus = oneOf(fd, "status", PROJECT_STATUS, existing.status as s.ProjectStatus) as s.ProjectStatus;
  const note = str(fd, "note", 600);
  const evidenceCaption = str(fd, "evidenceCaption", 200);
  const evidenceUrl = safeUrl(fd.get("evidenceUrl"));
  const today = isoDateLagos(new Date());
  const evidence = evidenceCaption ? [...existing.evidence, { url: evidenceUrl ?? "", caption: evidenceCaption, date: today }] : existing.evidence;
  const changed = newStatus !== existing.status || Boolean(note) || Boolean(evidenceCaption);
  if (!changed) redirect(`/admin/${existing.lgaId}/projects/${id}`);
  await db
    .update(s.projects)
    .set({
      status: newStatus,
      statusNote: note ?? existing.statusNote,
      evidence,
      // A field update counts as verification only when it carries evidence.
      lastVerified: evidenceCaption ? today : existing.lastVerified,
      updatedAt: new Date(),
    })
    .where(eq(s.projects.id, id));
  await db.insert(s.statusUpdates).values({ projectId: id, oldStatus: existing.status, newStatus, note, by });
  revalidatePath(`/${existing.lgaId}/projects/${id}`);
  redirect(`/admin/${existing.lgaId}/projects/${id}`);
}

export async function moderateReport(fd: FormData) {
  await requireStaff();
  const db = await getDb();
  const id = intId(fd, "");
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
    sourceUrl: safeUrl(fd.get("sourceUrl")),
    approval: str(fd, "approval", 20) === "approved" ? "approved" : "draft",
    lastVerified: str(fd, "lastVerified", 20),
    updatedAt: new Date(),
  };
  if (id) {
    await ownedBy((await db.select({ lgaId: s.services.lgaId }).from(s.services).where(eq(s.services.id, id)).limit(1))[0], lgaId);
    await db.update(s.services).set(values).where(eq(s.services.id, id));
  }
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
    condition: oneOf(fd, "condition", CONDITION, "unknown"),
    lastInspected: str(fd, "lastInspected", 20),
    notes: str(fd, "notes", 600),
    source: str(fd, "source", 300) ?? "Entered by LGA staff",
    sourceUrl: safeUrl(fd.get("sourceUrl")),
    approval: str(fd, "approval", 20) === "approved" ? "approved" : "draft",
    lastVerified: str(fd, "lastVerified", 20),
    updatedAt: new Date(),
  };
  if (id) {
    await ownedBy((await db.select({ lgaId: s.assets.lgaId }).from(s.assets).where(eq(s.assets.id, id)).limit(1))[0], lgaId);
    await db.update(s.assets).set(values).where(eq(s.assets.id, id));
  }
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
    sourceUrl: safeUrl(fd.get("sourceUrl")),
    approval: str(fd, "approval", 20) === "approved" ? "approved" : "draft",
    lastVerified: str(fd, "lastVerified", 20),
    updatedAt: new Date(),
  };
  const exists = await db.select({ id: s.profileSections.id, lgaId: s.profileSections.lgaId }).from(s.profileSections).where(eq(s.profileSections.id, id)).limit(1);
  if (exists.length) {
    await ownedBy(exists[0], lgaId);
    await db.update(s.profileSections).set(values).where(eq(s.profileSections.id, id));
  }
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
    sourceUrl: safeUrl(fd.get("sourceUrl")),
    approval: str(fd, "approval", 20) === "approved" ? "approved" : "draft",
    reviewBy: str(fd, "reviewBy", 20),
  };
  if (id) {
    await ownedBy((await db.select({ lgaId: s.documents.lgaId }).from(s.documents).where(eq(s.documents.id, id)).limit(1))[0], lgaId);
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
  const by = await requireStaff();
  const db = await getDb();
  const lgaId = str(fd, "lgaId", 60)!;
  const id = intId(fd, lgaId);
  const resolution = str(fd, "resolution", 600);
  // Duplicates of the same question are closed together so the queue stays honest.
  const [q] = await db.select({ question: s.questions.question }).from(s.questions).where(and(eq(s.questions.id, id), eq(s.questions.lgaId, lgaId))).limit(1);
  if (!q) redirect(`/admin/${lgaId}/gaps`);
  await db
    .update(s.questions)
    .set({ gapStatus: "resolved", gapResolution: `${resolution ?? "Resolved"} (${by}, ${isoDateLagos(new Date())})` })
    .where(and(eq(s.questions.lgaId, lgaId), sql`lower(${s.questions.question}) = lower(${q.question})`, sql`${s.questions.gapStatus} in ('open', 'duplicate')`));
  redirect(`/admin/${lgaId}/gaps`);
}

export async function resolveFlag(fd: FormData) {
  const by = await requireStaff();
  const db = await getDb();
  const lgaId = str(fd, "lgaId", 60)!;
  const id = intId(fd, lgaId);
  const resolution = str(fd, "resolution", 600) ?? "Resolved";
  // The resident's note is kept; the resolution is appended with who closed it and when.
  await db
    .update(s.questions)
    .set({ flagResolved: true, flagNote: sql`coalesce(${s.questions.flagNote}, '') || ${`\n\nResolution (${by}, ${isoDateLagos(new Date())}): ${resolution}`}` })
    .where(and(eq(s.questions.id, id), eq(s.questions.lgaId, lgaId)));
  redirect(`/admin/${lgaId}/flags`);
}

export async function updateTicket(fd: FormData) {
  await requireStaff();
  const db = await getDb();
  const lgaId = str(fd, "lgaId", 60)!;
  const id = intId(fd, lgaId);
  const status = oneOf(fd, "status", TICKET_STATUS, "open");
  await db
    .update(s.tickets)
    .set({ status, assignedTo: str(fd, "assignedTo", 120), notes: str(fd, "notes", 1000) })
    .where(and(eq(s.tickets.id, id), eq(s.tickets.lgaId, lgaId)));
  redirect(`/admin/${lgaId}/tickets`);
}

export async function updateEnquiry(fd: FormData) {
  await requireStaff();
  const db = await getDb();
  const lgaId = str(fd, "lgaId", 60)!;
  const id = intId(fd, lgaId);
  await db
    .update(s.investorEnquiries)
    .set({ status: oneOf(fd, "status", ENQUIRY_STATUS, "new"), routedTo: str(fd, "routedTo", 200) })
    .where(and(eq(s.investorEnquiries.id, id), eq(s.investorEnquiries.lgaId, lgaId)));
  redirect(`/admin/${lgaId}/enquiries`);
}
