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
  id: text("id").primaryKey(), // slug, e.g. "obio-akpor"; state-qualified when two states share a name
  name: text("name").notNull(),
  state: text("state").notNull(),
  zone: text("zone"), // geopolitical zone
  headquarters: text("headquarters"),
  population: integer("population"),
  populationYear: integer("population_year"),
  populationSource: text("population_source"),
  wards: jsonb("wards").$type<string[]>().notNull().default([]),
  areaKm2: doublePrecision("area_km2"),
  createdYear: integer("created_year"),
  senatorialDistrict: text("senatorial_district"),
  factSources: jsonb("fact_sources").$type<Record<string, string>>().notNull().default({}),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  intro: text("intro"),
  demo: boolean("demo").notNull().default(false),
  compiled: boolean("compiled").notNull().default(false), // records from published sources, not yet council-confirmed
  joinedAt: timestamp("joined_at", { withTimezone: true }), // when the LGA's data owner first approved a record
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Federation Account (FAAC) allocation to an LGA for one month, from the published tables. */
export const allocations = pgTable("allocations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  lgaId: text("lga_id").notNull().references(() => lgas.id),
  period: text("period").notNull(), // YYYY-MM
  grossNgn: bigint("gross_ngn", { mode: "number" }),
  deductionsNgn: bigint("deductions_ngn", { mode: "number" }),
  netNgn: bigint("net_ngn", { mode: "number" }),
  lines: jsonb("lines").$type<Record<string, number>>(), // every published component, e.g. statutory, vat, netEcology
  revenueMonth: text("revenue_month"), // YYYY-MM of the revenue shared in `period`
  source: text("source").notNull(),
  sourceUrl: text("source_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Published accuracy runs, one per eval per LGA; the public scoreboard shows the latest. */
export const evalRuns = pgTable("eval_runs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  lgaId: text("lga_id").notNull().references(() => lgas.id),
  ranAt: timestamp("ran_at", { withTimezone: true }).notNull().defaultNow(),
  cases: integer("cases").notNull(),
  pass: integer("pass").notNull(),
  accuracy: integer("accuracy").notNull(),
  figureFailures: integer("figure_failures").notNull().default(0),
  model: text("model"),
  note: text("note"),
  testSet: text("test_set"), // sha256 of JSON.stringify(parsed eval/questions.json)
  verified: boolean("verified").notNull().default(false), // scored by the server from stored answers
  results: jsonb("results").$type<{ caseId: string; questionId: number | null; ok: boolean; failed: string[] }[]>(),
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
  // Connected sources: when the body was imported from source_url, and a hash to detect change.
  fetchedAt: timestamp("fetched_at", { withTimezone: true }),
  contentHash: text("content_hash"),
  fetchNote: text("fetch_note"),
});

export type StaffRole = "admin" | "editor" | "viewer";

/** Per-officer accounts. lga_id NULL means every LGA on the server (a server administrator). */
export const staffUsers = pgTable("staff_users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").$type<StaffRole>().notNull().default("editor"),
  lgaId: text("lga_id").references(() => lgas.id),
  passwordHash: text("password_hash").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSignIn: timestamp("last_sign_in", { withTimezone: true }),
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
  flagFault: text("flag_fault"), // record | retrieval | wording | not_wrong
  flagResolvedAt: timestamp("flag_resolved_at", { withTimezone: true }),
  gapStatus: text("gap_status"), // null | open | assigned | duplicate | resolved  (set when answered = false)
  gapOwner: text("gap_owner"),
  gapResolution: text("gap_resolution"),
  gapResolvedAt: timestamp("gap_resolved_at", { withTimezone: true }),
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

export type IssueStatus = "received" | "acknowledged" | "in_progress" | "resolved" | "not_council" | "closed";

/**
 * A problem a resident reported against one of the council's constitutional functions.
 * Public from the moment it is filed (after PII scrubbing), with every status change on a
 * public timeline, so residents can see how long the council takes to respond.
 */
export const issues = pgTable("issues", {
  id: text("id").primaryKey(), // e.g. OBA-R-0001
  lgaId: text("lga_id").notNull().references(() => lgas.id),
  fn: text("fn").notNull(), // FnKey from src/lib/functions.ts
  title: text("title").notNull(),
  detail: text("detail").notNull(), // PII-scrubbed
  ward: text("ward"),
  place: text("place"), // landmark or street, PII-scrubbed
  photoUrl: text("photo_url"),
  status: text("status").$type<IssueStatus>().notNull().default("received"),
  response: text("response"), // the council's latest public response
  respondedAt: timestamp("responded_at", { withTimezone: true }), // first staff response
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  hidden: boolean("hidden").notNull().default(false), // taken off the public register by staff
  hideReason: text("hide_reason"),
  supports: integer("supports").notNull().default(0), // residents who said "this affects me too"
  ipHash: text("ip_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const issueUpdates = pgTable("issue_updates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  issueId: text("issue_id").notNull().references(() => issues.id, { onDelete: "cascade" }),
  oldStatus: text("old_status"),
  newStatus: text("new_status").notNull(),
  note: text("note"),
  by: text("by").notNull(), // "Resident" or the officer's name
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * A resident's monthly score of the council on the nine constitutional functions, 1 to 5 each,
 * any subset. One per email address per council per month; the address is stored only as a
 * keyed hash. Scores are published only once enough residents have rated (see participation.ts).
 */
export const ratings = pgTable("ratings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  lgaId: text("lga_id").notNull().references(() => lgas.id),
  month: text("month").notNull(), // YYYY-MM
  emailHash: text("email_hash").notNull(),
  scores: jsonb("scores").$type<Partial<Record<string, number>>>().notNull(),
  comment: text("comment"), // PII-scrubbed, staff only
  ipHash: text("ip_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type OfficialRole = "chairman" | "vice_chairman" | "leader" | "secretary" | "hlga" | "treasurer" | "councillor" | "other";

/** Who holds office at the council, with the source each name was taken from. */
export const officials = pgTable("officials", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  lgaId: text("lga_id").notNull().references(() => lgas.id),
  role: text("role").$type<OfficialRole>().notNull(),
  name: text("name").notNull(),
  title: text("title"), // as styled locally, e.g. "Executive Chairman"
  ward: text("ward"), // councillors
  since: text("since"), // ISO date
  until: text("until"),
  ord: integer("ord").notNull().default(0),
  source: text("source").notNull(),
  sourceUrl: text("source_url"),
  approval: text("approval").notNull().default("draft"),
  lastVerified: text("last_verified"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
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
