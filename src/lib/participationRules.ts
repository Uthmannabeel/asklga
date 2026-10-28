import { createHash } from "node:crypto";
import { FN_KEYS, isFnKey, type FnKey } from "./functions.ts";
import { scrubPii } from "./pii.ts";

/**
 * Pure rules for resident participation: what a valid problem report and a valid monthly score
 * look like, how scores are summarised, and how a council's response record is measured.
 * No database, no framework, so tests can run them directly.
 */

export const ISSUE_STATUSES = ["received", "acknowledged", "in_progress", "resolved", "not_council", "closed"] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const ISSUE_STATUS_LABEL: Record<IssueStatus, string> = {
  received: "Received",
  acknowledged: "Acknowledged",
  in_progress: "In progress",
  resolved: "Resolved",
  not_council: "Not a council matter",
  closed: "Closed",
};

/** Statuses that count as the council having responded. */
export const RESPONDED: IssueStatus[] = ["acknowledged", "in_progress", "resolved", "not_council", "closed"];
export const OPEN: IssueStatus[] = ["received", "acknowledged", "in_progress"];

/** Scores are published for a council only from this many residents in the window. */
export const MIN_RATERS = 5;
/** A council enters the national comparison only from this many residents. */
export const MIN_RATERS_RANK = 10;
/** Months of ratings that count, including the current month. */
export const RATING_WINDOW_MONTHS = 3;
/** Functions a resident must score for the rating to count. */
export const MIN_FUNCTIONS = 3;

export type IssueInput = { fn: FnKey; title: string; detail: string; ward: string | null; place: string | null; photoUrl: string | null };
export type RatingInput = { month: string; scores: Partial<Record<FnKey, number>>; email: string; comment: string | null };

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function text(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

export function httpUrl(v: unknown, max = 500): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  if (!t) return null;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

/** Checks a problem report and strips personal details from every free-text field. */
export function validateIssue(body: unknown): Result<IssueInput> {
  const b = (body ?? {}) as Record<string, unknown>;
  if (!isFnKey(b.fn)) return { ok: false, error: "Choose which council function the problem falls under." };
  const title = scrubPii(text(b.title, 120)).text;
  const detail = scrubPii(text(b.detail, 1200)).text;
  if (title.length < 8) return { ok: false, error: "Give the problem a short title of at least 8 characters." };
  if (detail.length < 20) return { ok: false, error: "Describe the problem in at least 20 characters: what, where and since when." };
  const ward = scrubPii(text(b.ward, 80)).text || null;
  const place = scrubPii(text(b.place, 160)).text || null;
  if (b.photoUrl && !httpUrl(b.photoUrl)) return { ok: false, error: "The photo link must start with http:// or https://." };
  return { ok: true, value: { fn: b.fn, title, detail, ward, place, photoUrl: httpUrl(b.photoUrl) } };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** YYYY-MM of a moment in Africa/Lagos. */
export function lagosMonth(d = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit" }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}`;
}

/** The last `n` months ending with the current one, oldest first. */
export function recentMonths(n = RATING_WINDOW_MONTHS, now = new Date()): string[] {
  const [y, m] = lagosMonth(now).split("-").map(Number);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

/** Checks a monthly score: whole numbers 1 to 5 on at least MIN_FUNCTIONS functions, a plausible email address. */
export function validateRating(body: unknown, now = new Date()): Result<RatingInput> {
  const b = (body ?? {}) as Record<string, unknown>;
  const raw = (b.scores ?? {}) as Record<string, unknown>;
  const scores: Partial<Record<FnKey, number>> = {};
  for (const k of FN_KEYS) {
    const v = raw[k];
    if (v == null || v === "") continue;
    const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
    if (!Number.isInteger(n) || n < 1 || n > 5) return { ok: false, error: "Each score must be a whole number from 1 to 5." };
    scores[k] = n;
  }
  if (Object.keys(scores).length < MIN_FUNCTIONS) return { ok: false, error: `Score at least ${MIN_FUNCTIONS} of the council's functions. Skip the ones you have no view on.` };
  const email = text(b.email, 254).toLowerCase();
  if (!EMAIL.test(email)) return { ok: false, error: "Enter an email address. It is stored only as a one-way hash, to keep it to one score a month." };
  const comment = scrubPii(text(b.comment, 300)).text || null;
  return { ok: true, value: { month: lagosMonth(now), scores, email, comment } };
}

/** One-way, keyed hash so an address can be matched for the monthly limit but never read back. */
export function keyedHash(value: string, secret: string): string {
  return createHash("sha256").update(`${secret}\n${value.trim().toLowerCase()}`).digest("hex").slice(0, 40);
}

export type FnSummary = { key: FnKey; avg: number | null; n: number };
export type CardSummary = {
  raters: number;
  months: string[];
  perFn: FnSummary[];
  /** Mean of the function averages that have at least 3 scores; null until MIN_RATERS residents have rated. */
  overall: number | null;
  published: boolean;
};

/** Summarises ratings into a report card. Each function carries equal weight whatever its number of scores. */
export function summariseRatings(rows: { scores: Partial<Record<string, number>> }[], months: string[]): CardSummary {
  const perFn: FnSummary[] = FN_KEYS.map((key) => {
    const vals = rows.map((r) => r.scores[key]).filter((v): v is number => typeof v === "number");
    return { key, n: vals.length, avg: vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null };
  });
  const raters = rows.length;
  const published = raters >= MIN_RATERS;
  const usable = perFn.filter((f) => f.avg != null && f.n >= 3);
  const overall = published && usable.length ? Math.round((usable.reduce((a, f) => a + (f.avg as number), 0) / usable.length) * 10) / 10 : null;
  return { raters, months, perFn, overall, published };
}

export type ResponseStats = {
  total: number;
  open: number;
  responded: number;
  resolved: number;
  notCouncil: number;
  /** Median days from filing to the council's first response, over responded issues. */
  medianDaysToResponse: number | null;
  /** Median days from filing to resolution. */
  medianDaysToResolve: number | null;
  /** Issues still waiting for any response after 14 days. */
  overdue: number;
};

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return Math.round((s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2) * 10) / 10;
}

const DAY = 86400000;

/** The council's response record over a set of public issues. */
export function responseStats(rows: { status: string; createdAt: Date; respondedAt: Date | null; resolvedAt: Date | null }[], now = new Date()): ResponseStats {
  const responded = rows.filter((r) => r.respondedAt);
  const resolved = rows.filter((r) => r.status === "resolved" && r.resolvedAt);
  return {
    total: rows.length,
    open: rows.filter((r) => (OPEN as string[]).includes(r.status)).length,
    responded: responded.length,
    resolved: resolved.length,
    notCouncil: rows.filter((r) => r.status === "not_council").length,
    medianDaysToResponse: median(responded.map((r) => ((r.respondedAt as Date).getTime() - r.createdAt.getTime()) / DAY)),
    medianDaysToResolve: median(resolved.map((r) => ((r.resolvedAt as Date).getTime() - r.createdAt.getTime()) / DAY)),
    overdue: rows.filter((r) => !r.respondedAt && r.status === "received" && now.getTime() - r.createdAt.getTime() > 14 * DAY).length,
  };
}

export function daysOpen(createdAt: Date, until: Date | null, now = new Date()): number {
  return Math.max(0, Math.floor(((until ?? now).getTime() - createdAt.getTime()) / DAY));
}
