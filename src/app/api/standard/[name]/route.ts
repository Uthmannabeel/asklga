import { NextResponse } from "next/server";

/** JSON Schema (draft 2020-12) for each register of the LGA Record Standard. GET /api/standard/projects.schema.json */
const common = {
  id: { type: "string", pattern: "^[A-Z0-9]{2,5}-[A-Z]-[A-Za-z0-9-]+$", description: "Stable public identifier" },
  lgaId: { type: "string", description: "LGA slug on the national directory" },
  source: { type: "string" },
  sourceUrl: { type: ["string", "null"], format: "uri" },
  approval: { type: "string", enum: ["draft", "approved"] },
  lastVerified: { type: ["string", "null"], format: "date" },
  updatedAt: { type: "string", format: "date-time" },
};
const schemas: Record<string, object> = {
  projects: {
    title: "LGA Record Standard: project",
    type: "object",
    required: ["id", "lgaId", "name", "type", "sponsor", "status", "source", "approval"],
    properties: {
      ...common,
      name: { type: "string" },
      type: { type: "string", enum: ["road", "health", "education", "water", "market", "drainage", "power", "building", "other"] },
      ward: { type: ["string", "null"] },
      lat: { type: ["number", "null"] },
      lng: { type: ["number", "null"] },
      sponsor: { type: "string", enum: ["LGA", "State", "Federal", "NDDC", "Constituency", "Donor", "Other"] },
      budgetYear: { type: ["integer", "null"] },
      budgetLine: { type: ["string", "null"] },
      amountNgn: { type: ["integer", "null"], minimum: 0 },
      contractor: { type: ["string", "null"] },
      startDate: { type: ["string", "null"] },
      expectedCompletion: { type: ["string", "null"] },
      status: { type: "string", enum: ["planned", "ongoing", "completed", "stalled", "abandoned", "unknown"] },
      statusNote: { type: ["string", "null"] },
      evidence: { type: "array", items: { type: "object", required: ["caption", "date"], properties: { url: { type: "string" }, caption: { type: "string" }, date: { type: "string", format: "date" } } } },
    },
  },
  assets: {
    title: "LGA Record Standard: public asset",
    type: "object",
    required: ["id", "lgaId", "name", "type", "source", "approval"],
    properties: {
      ...common,
      name: { type: "string" },
      type: { type: "string" },
      ward: { type: ["string", "null"] },
      lat: { type: ["number", "null"] },
      lng: { type: ["number", "null"] },
      condition: { type: ["string", "null"], enum: ["good", "fair", "poor", "unknown", null] },
      lastInspected: { type: ["string", "null"], format: "date" },
      notes: { type: ["string", "null"] },
    },
  },
  services: {
    title: "LGA Record Standard: service",
    type: "object",
    required: ["id", "lgaId", "name", "category", "documents", "steps", "source", "approval"],
    properties: {
      ...common,
      name: { type: "string" },
      category: { type: "string" },
      summary: { type: ["string", "null"] },
      eligibility: { type: ["string", "null"] },
      documents: { type: "array", items: { type: "string" } },
      steps: { type: "array", items: { type: "string" } },
      office: { type: ["string", "null"] },
      role: { type: ["string", "null"] },
      contact: { type: ["string", "null"], description: "An office or desk, never a personal phone number" },
      turnaround: { type: ["string", "null"] },
    },
  },
  investment: {
    title: "LGA Record Standard: investment profile section",
    type: "object",
    required: ["id", "lgaId", "section", "title", "body", "source", "approval"],
    properties: {
      ...common,
      section: { type: "string", enum: ["location", "land", "markets", "infrastructure", "approvals", "incentives", "contacts", "other"] },
      title: { type: "string" },
      body: { type: "string" },
      ord: { type: "integer" },
    },
  },
  documents: {
    title: "LGA Record Standard: document",
    type: "object",
    required: ["id", "lgaId", "title", "kind", "visibility", "body", "source", "approval"],
    properties: {
      id: common.id,
      lgaId: common.lgaId,
      source: common.source,
      sourceUrl: common.sourceUrl,
      approval: common.approval,
      title: { type: "string" },
      kind: { type: "string", enum: ["minutes", "budget", "circular", "memo", "project_file", "notice", "web"] },
      visibility: { type: "string", enum: ["public", "internal"] },
      body: { type: "string" },
      reviewBy: { type: ["string", "null"], format: "date" },
      fetchedAt: { type: ["string", "null"], format: "date-time" },
      contentHash: { type: ["string", "null"] },
    },
  },
  allocations: {
    title: "LGA Record Standard: federation allocation",
    type: "object",
    required: ["lgaId", "period", "source"],
    properties: {
      lgaId: common.lgaId,
      period: { type: "string", pattern: "^\\d{4}-\\d{2}$" },
      grossNgn: { type: ["integer", "null"], minimum: 0 },
      deductionsNgn: { type: ["integer", "null"], minimum: 0 },
      netNgn: { type: ["integer", "null"], minimum: 0 },
      source: { type: "string" },
      sourceUrl: { type: ["string", "null"], format: "uri" },
    },
  },
};

export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  const key = name.replace(/\.schema\.json$/, "").replace(/\.json$/, "");
  const schema = schemas[key];
  if (!schema) return NextResponse.json({ error: "Unknown schema" }, { status: 404 });
  return NextResponse.json(
    { $schema: "https://json-schema.org/draft/2020-12/schema", $id: `/api/standard/${key}.schema.json`, ...schema },
    { headers: { "Cache-Control": "public, max-age=3600", "Access-Control-Allow-Origin": "*" } },
  );
}
