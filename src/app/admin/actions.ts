"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import {
  canAccessLga,
  cleanEmail,
  cleanStaffName,
  currentStaff,
  hashPassword,
  passwordProblem,
  roleAtLeast,
  signIn,
  signOut,
  verifyPassword,
  type Session,
} from "@/lib/auth";
import type { StaffRole } from "@/db/schema";
import { lgaCodeFor, nextId } from "@/lib/ids";
import { chunkText } from "@/db/seed";
import { getProject } from "@/lib/queries";
import { safeUrl } from "@/lib/ratelimit";
import { isoDateLagos } from "@/lib/format";
import { fetchDocumentText } from "@/lib/ingest";

/**
 * Every mutating action starts with requireStaff(lgaId, minRole): a valid session, access to
 * that LGA, and at least that role. Viewers can read the workspace and use internal search;
 * editors change records and close queues; admins also manage accounts.
 */
async function requireStaff(lgaId?: string, min: StaffRole = "editor"): Promise<Session> {
  const session = await currentStaff();
  if (!session) redirect("/admin");
  if (lgaId && !canAccessLga(session, lgaId)) redirect("/admin?error=lga");
  if (!roleAtLeast(session.role, min)) redirect(lgaId ? `/admin/${lgaId}?error=role` : "/admin?error=role");
  return session;
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
function intId(fd: FormData, lgaId: string, key = "id"): number {
  const n = Number(fd.get(key));
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
const TICKET_STATUS = ["open", "assigned", "in-progress", "closed"] as const;
const ENQUIRY_STATUS = ["new", "routed", "closed"] as const;
const FLAG_FAULT = ["record", "retrieval", "wording", "not_wrong"] as const;
const ROLES = ["admin", "editor", "viewer"] as const;
/** Ensures a record belongs to the LGA named in the form, so one LGA's staff cannot edit another's. */
async function ownedBy<T extends { lgaId: string }>(row: T | undefined | null, lgaId: string): Promise<T> {
  if (!row || row.lgaId !== lgaId) redirect(`/admin/${lgaId}`);
  return row;
}
function stamp(by: string): string {
  return `${by}, ${isoDateLagos(new Date())}`;
}

/* ---------- Sign-in ---------- */

export async function signInAction(fd: FormData) {
  const identity = String(fd.get("identity") ?? fd.get("name") ?? "");
  const secret = String(fd.get("secret") ?? fd.get("passcode") ?? "");
  const ok = await signIn(identity, secret);
  if (!ok) redirect("/admin?error=1");
  // Only same-site workspace paths may be used as the return destination.
  const next = String(fd.get("next") ?? "");
  redirect(/^\/admin(\/[a-z0-9\-/?=&]*)?$/i.test(next) && next !== "/admin" ? next : "/admin");
}

export async function signOutAction() {
  await signOut();
  redirect("/admin");
}

/* ---------- Accounts (admins only) ---------- */

export async function createStaffUser(fd: FormData) {
  const me = await requireStaff(undefined, "admin");
  const db = await getDb();
  const email = cleanEmail(String(fd.get("email") ?? ""));
  const name = cleanStaffName(String(fd.get("name") ?? ""));
  const role = oneOf(fd, "role", ROLES, "editor");
  const lgaRaw = str(fd, "lgaId", 60);
  const lgaId = lgaRaw === "*" ? null : lgaRaw;
  const password = String(fd.get("password") ?? "");
  if (!email || !name) redirect("/admin/users?error=fields");
  const pwProblem = passwordProblem(password);
  if (pwProblem) redirect(`/admin/users?error=${encodeURIComponent(pwProblem)}`);
  // An LGA-bound admin can only create accounts for their own LGA and cannot create server admins.
  if (me.lgaId && (lgaId !== me.lgaId || role === "admin")) redirect("/admin/users?error=scope");
  const exists = await db.select({ id: s.staffUsers.id }).from(s.staffUsers).where(eq(s.staffUsers.email, email)).limit(1);
  if (exists.length) redirect("/admin/users?error=exists");
  await db.insert(s.staffUsers).values({ email, name, role, lgaId, passwordHash: hashPassword(password) });
  redirect("/admin/users?ok=created");
}

export async function updateStaffUser(fd: FormData) {
  const me = await requireStaff(undefined, "admin");
  const db = await getDb();
  const id = intId(fd, "");
  const [target] = await db.select().from(s.staffUsers).where(eq(s.staffUsers.id, id)).limit(1);
  if (!target) redirect("/admin/users");
  if (me.lgaId && target.lgaId !== me.lgaId) redirect("/admin/users?error=scope");
  const role = oneOf(fd, "role", ROLES, target.role);
  const active = str(fd, "active", 5) === "yes";
  if (me.lgaId && role === "admin") redirect("/admin/users?error=scope");
  // Nobody deactivates or demotes themselves; the last active admin is protected below.
  if (me.userId === id && (!active || role !== "admin")) redirect("/admin/users?error=self");
  if (target.role === "admin" && (role !== "admin" || !active)) {
    const [r] = await db.select({ n: sql<number>`count(*)` }).from(s.staffUsers).where(and(eq(s.staffUsers.role, "admin"), eq(s.staffUsers.active, true)));
    if (Number(r.n) <= 1) redirect("/admin/users?error=lastadmin");
  }
  const newPassword = String(fd.get("password") ?? "");
  const patch: Partial<typeof s.staffUsers.$inferInsert> = { role, active };
  if (newPassword) {
    const problem = passwordProblem(newPassword);
    if (problem) redirect(`/admin/users?error=${encodeURIComponent(problem)}`);
    patch.passwordHash = hashPassword(newPassword);
  }
  await db.update(s.staffUsers).set(patch).where(eq(s.staffUsers.id, id));
  redirect("/admin/users?ok=saved");
}

export async function changeOwnPassword(fd: FormData) {
  const me = await requireStaff(undefined, "viewer");
  if (!me.userId) redirect("/admin/account?error=bootstrap");
  const db = await getDb();
  const [u] = await db.select().from(s.staffUsers).where(eq(s.staffUsers.id, me.userId)).limit(1);
  if (!u || !verifyPassword(String(fd.get("current") ?? ""), u.passwordHash)) redirect("/admin/account?error=current");
  const next = String(fd.get("next") ?? "");
  const problem = passwordProblem(next);
  if (problem) redirect(`/admin/account?error=${encodeURIComponent(problem)}`);
  await db.update(s.staffUsers).set({ passwordHash: hashPassword(next) }).where(eq(s.staffUsers.id, me.userId));
  redirect("/admin/account?ok=1");
}

/* ---------- Projects ---------- */

export async function saveProject(fd: FormData) {
  const lgaId = str(fd, "lgaId", 60)!;
  const { name: by } = await requireStaff(lgaId, "editor");
  const db = await getDb();
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
  const id = str(fd, "id", 40)!;
  const existing = await getProject(id);
  if (!existing) redirect("/admin");
  const { name: by } = await requireStaff(existing.lgaId, "editor");
  const db = await getDb();
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
  const db = await getDb();
  const id = intId(fd, "");
  const [rep] = await db.select({ lgaId: s.photoReports.lgaId, projectId: s.photoReports.projectId }).from(s.photoReports).where(eq(s.photoReports.id, id)).limit(1);
  if (!rep) redirect("/admin");
  await requireStaff(rep.lgaId, "editor");
  const status = str(fd, "status", 20) === "approved" ? "approved" : "rejected";
  await db.update(s.photoReports).set({ status }).where(eq(s.photoReports.id, id));
  revalidatePath(`/${rep.lgaId}/projects/${rep.projectId}`);
  redirect(`/admin/${rep.lgaId}/projects/${rep.projectId}`);
}

/* ---------- Services ---------- */

export async function saveService(fd: FormData) {
  const lgaId = str(fd, "lgaId", 60)!;
  await requireStaff(lgaId, "editor");
  const db = await getDb();
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
  } else {
    id = await nextId(db, "services", lgaId, "S");
    await db.insert(s.services).values({ id, ...values });
  }
  revalidatePath(`/${lgaId}/services`);
  redirect(`/admin/${lgaId}/services`);
}

/* ---------- Assets ---------- */

export async function saveAsset(fd: FormData) {
  const lgaId = str(fd, "lgaId", 60)!;
  await requireStaff(lgaId, "editor");
  const db = await getDb();
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
  } else {
    id = await nextId(db, "assets", lgaId, "A");
    await db.insert(s.assets).values({ id, ...values });
  }
  revalidatePath(`/${lgaId}/assets`);
  redirect(`/admin/${lgaId}/assets`);
}

/* ---------- Investment profile ---------- */

export async function saveProfileSection(fd: FormData) {
  const lgaId = str(fd, "lgaId", 60)!;
  await requireStaff(lgaId, "editor");
  const db = await getDb();
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
  } else await db.insert(s.profileSections).values({ id, ...values });
  revalidatePath(`/${lgaId}/investment`);
  redirect(`/admin/${lgaId}/investment`);
}

/* ---------- Documents ---------- */

async function writeChunks(db: Awaited<ReturnType<typeof getDb>>, id: string, lgaId: string, visibility: string, body: string) {
  await db.delete(s.chunks).where(eq(s.chunks.documentId, id));
  const parts = chunkText(body);
  if (parts.length) await db.insert(s.chunks).values(parts.map((text, ord) => ({ documentId: id, lgaId, visibility, ord, text })));
}

export async function saveDocument(fd: FormData) {
  const lgaId = str(fd, "lgaId", 60)!;
  await requireStaff(lgaId, "editor");
  const db = await getDb();
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
  } else {
    id = await nextId(db, "documents", lgaId, "D");
    await db.insert(s.documents).values({ id, ...values });
  }
  await writeChunks(db, id, lgaId, visibility, body);
  revalidatePath(`/${lgaId}/documents`);
  redirect(`/admin/${lgaId}/documents`);
}

/** Connected source, step one: pull a web page's text into a draft document with its URL as source. */
export async function importDocumentFromUrl(fd: FormData) {
  const lgaId = str(fd, "lgaId", 60)!;
  await requireStaff(lgaId, "editor");
  const url = safeUrl(fd.get("url"));
  if (!url) redirect(`/admin/${lgaId}/documents?error=${encodeURIComponent("Enter a full http:// or https:// address.")}`);
  const fetched = await fetchDocumentText(url);
  if (!fetched.ok) redirect(`/admin/${lgaId}/documents?error=${encodeURIComponent(fetched.error)}`);
  const db = await getDb();
  const id = await nextId(db, "documents", lgaId, "D");
  const visibility = str(fd, "visibility", 20) === "internal" ? "internal" : "public";
  await db.insert(s.documents).values({
    id,
    lgaId,
    title: str(fd, "title", 300) ?? fetched.title ?? url,
    kind: str(fd, "kind", 40) ?? "web",
    visibility,
    body: fetched.text,
    source: str(fd, "source", 300) ?? `Imported from ${new URL(url).hostname}`,
    sourceUrl: url,
    approval: "draft",
    reviewBy: str(fd, "reviewBy", 20),
    fetchedAt: new Date(),
    contentHash: createHash("sha256").update(fetched.text).digest("hex"),
    fetchNote: `Imported ${fetched.text.length.toLocaleString()} characters`,
  });
  await writeChunks(db, id, lgaId, visibility, fetched.text);
  redirect(`/admin/${lgaId}/documents?edit=${id}&ok=imported#form`);
}

/** Connected source, step two: re-fetch. A changed page becomes a draft again so the data owner re-approves it. */
export async function refetchDocument(fd: FormData) {
  const lgaId = str(fd, "lgaId", 60)!;
  const { name: by } = await requireStaff(lgaId, "editor");
  const db = await getDb();
  const id = str(fd, "id", 40)!;
  const [doc] = await db.select().from(s.documents).where(eq(s.documents.id, id)).limit(1);
  await ownedBy(doc, lgaId);
  if (!doc.sourceUrl) redirect(`/admin/${lgaId}/documents?error=${encodeURIComponent("This document has no source link to fetch.")}`);
  const fetched = await fetchDocumentText(doc.sourceUrl);
  if (!fetched.ok) {
    await db.update(s.documents).set({ fetchNote: `Fetch failed ${isoDateLagos(new Date())}: ${fetched.error}` }).where(eq(s.documents.id, id));
    redirect(`/admin/${lgaId}/documents?error=${encodeURIComponent(fetched.error)}`);
  }
  const hash = createHash("sha256").update(fetched.text).digest("hex");
  if (hash === doc.contentHash) {
    await db.update(s.documents).set({ fetchedAt: new Date(), fetchNote: `Checked ${isoDateLagos(new Date())}: unchanged` }).where(eq(s.documents.id, id));
    redirect(`/admin/${lgaId}/documents?ok=unchanged`);
  }
  await db
    .update(s.documents)
    .set({ body: fetched.text, fetchedAt: new Date(), contentHash: hash, approval: "draft", fetchNote: `Source changed; re-imported ${stamp(by)}. Needs re-approval.` })
    .where(eq(s.documents.id, id));
  await writeChunks(db, id, lgaId, doc.visibility, fetched.text);
  revalidatePath(`/${lgaId}/documents`);
  redirect(`/admin/${lgaId}/documents?edit=${id}&ok=changed#form`);
}

/* ---------- Questions: gaps, flags, tickets, enquiries ---------- */

export async function assignGap(fd: FormData) {
  const lgaId = str(fd, "lgaId", 60)!;
  const { name: by } = await requireStaff(lgaId, "editor");
  const db = await getDb();
  const id = intId(fd, lgaId);
  const owner = str(fd, "owner", 120) ?? by;
  await db
    .update(s.questions)
    .set({ gapStatus: "assigned", gapOwner: owner })
    .where(and(eq(s.questions.id, id), eq(s.questions.lgaId, lgaId), sql`${s.questions.gapStatus} in ('open', 'assigned')`));
  redirect(`/admin/${lgaId}/gaps`);
}

export async function resolveGap(fd: FormData) {
  const lgaId = str(fd, "lgaId", 60)!;
  const { name: by } = await requireStaff(lgaId, "editor");
  const db = await getDb();
  const id = intId(fd, lgaId);
  const resolution = str(fd, "resolution", 600);
  // Duplicates of the same question are closed together so the queue stays honest.
  const [q] = await db.select({ question: s.questions.question }).from(s.questions).where(and(eq(s.questions.id, id), eq(s.questions.lgaId, lgaId))).limit(1);
  if (!q) redirect(`/admin/${lgaId}/gaps`);
  await db
    .update(s.questions)
    .set({ gapStatus: "resolved", gapResolution: `${resolution ?? "Resolved"} (${stamp(by)})`, gapResolvedAt: new Date(), gapOwner: sql`coalesce(${s.questions.gapOwner}, ${by})` })
    .where(and(eq(s.questions.lgaId, lgaId), sql`lower(${s.questions.question}) = lower(${q.question})`, sql`${s.questions.gapStatus} in ('open', 'assigned', 'duplicate')`));
  redirect(`/admin/${lgaId}/gaps`);
}

export async function resolveFlag(fd: FormData) {
  const lgaId = str(fd, "lgaId", 60)!;
  const { name: by } = await requireStaff(lgaId, "editor");
  const db = await getDb();
  const id = intId(fd, lgaId);
  const resolution = str(fd, "resolution", 600) ?? "Resolved";
  const fault = oneOf(fd, "fault", FLAG_FAULT, "record");
  // The resident's note is kept; the resolution is appended with who closed it and when.
  await db
    .update(s.questions)
    .set({
      flagResolved: true,
      flagFault: fault,
      flagResolvedAt: new Date(),
      flagNote: sql`coalesce(${s.questions.flagNote}, '') || ${`\n\nResolution (${stamp(by)}, fault: ${fault}): ${resolution}`}`,
    })
    .where(and(eq(s.questions.id, id), eq(s.questions.lgaId, lgaId)));
  redirect(`/admin/${lgaId}/flags`);
}

export async function updateTicket(fd: FormData) {
  const lgaId = str(fd, "lgaId", 60)!;
  await requireStaff(lgaId, "editor");
  const db = await getDb();
  const id = intId(fd, lgaId);
  const assignedTo = str(fd, "assignedTo", 120);
  let status = oneOf(fd, "status", TICKET_STATUS, "open");
  if (status === "open" && assignedTo) status = "assigned";
  await db
    .update(s.tickets)
    .set({ status, assignedTo, notes: str(fd, "notes", 1000) })
    .where(and(eq(s.tickets.id, id), eq(s.tickets.lgaId, lgaId)));
  redirect(`/admin/${lgaId}/tickets`);
}

export async function updateEnquiry(fd: FormData) {
  const lgaId = str(fd, "lgaId", 60)!;
  await requireStaff(lgaId, "editor");
  const db = await getDb();
  const id = intId(fd, lgaId);
  await db
    .update(s.investorEnquiries)
    .set({ status: oneOf(fd, "status", ENQUIRY_STATUS, "new"), routedTo: str(fd, "routedTo", 200) })
    .where(and(eq(s.investorEnquiries.id, id), eq(s.investorEnquiries.lgaId, lgaId)));
  redirect(`/admin/${lgaId}/enquiries`);
}
