import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  doublePrecision,
  jsonb,
  bigint,
} from "drizzle-orm/pg-core";

/**
 * Every register table carries:
 *  - approval: "draft" | "approved"  (only approved records reach the answer engine and public pages)
 *  - source / source_url: where the record came from (shown on the source stamp)
 *  - last_verified: date the LGA data owner last confirmed it
 */

export const lgas = pgTable("lgas", {
  id: text("id").primaryKey(), // slug, e.g. "obio-akpor"
  name: text("name").notNull(),
  state: text("state").notNull(),
  headquarters: text("headquarters"),
  population: integer("population"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  intro: text("intro"),
  demo: boolean("demo").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const services = pgTable("services", {
  id: text("id").primaryKey(), // e.g. OBA-S-0001
  lgaId: text("lga_id").notNull().references(() => lgas.id),
  name: text("name").notNull(),
  category: text("category").notNull(),
  summary: text("summary"),
  eligibility: text("eligibility"),
  documents: jsonb("documents").$type<string[]>().notNull().default([]),
  steps: jsonb("steps").$type<string[]>().notNull().default([]),
  office: text("office"),
  role: text("role"),
  contact: text("contact"),
  turnaround: text("turnaround"),
  source: text("source").notNull(),
  sourceUrl: text("source_url"),
  approval: text("approval").notNull().default("draft"),
  lastVerified: text("last_verified"), // ISO date string
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ProjectStatus =
  | "planned"
  | "ongoing"
  | "completed"
  | "stalled"
  | "abandoned"
  | "unknown";

export const projects = pgTable("projects", {
  id: text("id").primaryKey(), // e.g. OBA-P-0001
  lgaId: text("lga_id").notNull().references(() => lgas.id),
  name: text("name").notNull(),
  type: text("type").notNull(), // road, health, education, water, market, power, drainage, other
  ward: text("ward"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  sponsor: text("sponsor").notNull(), // LGA, State, Federal, NDDC, Constituency, Other
  budgetYear: integer("budget_year"),
  budgetLine: text("budget_line"),
  amountNgn: bigint("amount_ngn", { mode: "number" }),
  contractor: text("contractor"),
  startDate: text("start_date"),
  expectedCompletion: text("expected_completion"),
  status: text("status").$type<ProjectStatus>().notNull().default("unknown"),
  statusNote: text("status_note"),
  evidence: jsonb("evidence").$type<{ url: string; caption: string; date: string }[]>().notNull().default([]),
  source: text("source").notNull(),
  sourceUrl: text("source_url"),
  approval: text("approval").notNull().default("draft"),
  lastVerified: text("last_verified"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const statusUpdates = pgTable("status_updates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  projectId: text("project_id").notNull().references(() => projects.id),
  oldStatus: text("old_status"),
  newStatus: text("new_status").notNull(),
  note: text("note"),
  by: text("by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const photoReports = pgTable("photo_reports", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  projectId: text("project_id").notNull().references(() => projects.id),
  lgaId: text("lga_id").notNull(),
  note: text("note").notNull(),
  imageUrl: text("image_url"),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const assets = pgTable("assets", {
  id: text("id").primaryKey(), // e.g. OBA-A-0001
  lgaId: text("lga_id").notNull().references(() => lgas.id),
  name: text("name").notNull(),
  type: text("type").notNull(), // road, health, school, water, market, power, other
  ward: text("ward"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  condition: text("condition"), // good | fair | poor | unknown
  lastInspected: text("last_inspected"),
  notes: text("notes"),
  source: text("source").notNull(),
  sourceUrl: text("source_url"),
  approval: text("approval").notNull().default("draft"),
  lastVerified: text("last_verified"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const profileSections = pgTable("profile_sections", {
  id: text("id").primaryKey(), // e.g. OBA-I-location
  lgaId: text("lga_id").notNull().references(() => lgas.id),
  section: text("section").notNull(), // location | land | markets | infrastructure | approvals | incentives | contacts
  title: text("title").notNull(),
  body: text("body").notNull(),
  ord: integer("ord").notNull().default(0),
  source: text("source").notNull(),
  sourceUrl: text("source_url"),
  approval: text("approval").notNull().default("draft"),
  lastVerified: text("last_verified"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const documents = pgTable("documents", {
  id: text("id").primaryKey(), // e.g. OBA-D-0001
  lgaId: text("lga_id").notNull().references(() => lgas.id),
  title: text("title").notNull(),
  kind: text("kind").notNull(), // minutes | budget | circular | memo | project_file | notice | web
  visibility: text("visibility").notNull().default("public"), // public | internal
  body: text("body").notNull(),
  source: text("source").notNull(),
  sourceUrl: text("source_url"),
  approval: text("approval").notNull().default("draft"),
  reviewBy: text("review_by"), // ISO date after which the record counts as stale
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chunks = pgTable("chunks", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  documentId: text("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  lgaId: text("lga_id").notNull(),
  visibility: text("visibility").notNull(),
  ord: integer("ord").notNull(),
  text: text("text").notNull(),
  // tsv is a generated tsvector column created in the SQL migration; it is queried with raw SQL.
});

export const questions = pgTable("questions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  lgaId: text("lga_id").notNull(),
  audience: text("audience").notNull().default("resident"), // resident | investor | staff
  scope: text("scope").notNull().default("public"), // public | internal
  language: text("language"),
  question: text("question").notNull(), // PII-scrubbed
  answer: text("answer"),
  citations: jsonb("citations").$type<{ type: string; id: string; label: string }[]>().notNull().default([]),
  answered: boolean("answered").notNull().default(false),
  escalated: boolean("escalated").notNull().default(false),
  latencyMs: integer("latency_ms"),
  feedback: text("feedback"), // up | down | null
  flagged: boolean("flagged").notNull().default(false),
  flagNote: text("flag_note"),
  flagResolved: boolean("flag_resolved").notNull().default(false),
  gapStatus: text("gap_status"), // null | open | resolved  (set when answered = false)
  gapResolution: text("gap_resolution"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tickets = pgTable("tickets", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  lgaId: text("lga_id").notNull(),
  questionId: integer("question_id"),
  summary: text("summary").notNull(),
  contact: text("contact"), // phone number left by the resident (stored, never sent to a model)
  assignedTo: text("assigned_to"),
  status: text("status").notNull().default("open"), // open | assigned | closed
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const investorEnquiries = pgTable("investor_enquiries", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  lgaId: text("lga_id").notNull(),
  organisation: text("organisation"),
  sector: text("sector").notNull(),
  summary: text("summary").notNull(),
  contact: text("contact"),
  routedTo: text("routed_to"),
  status: text("status").notNull().default("new"), // new | routed | closed
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
