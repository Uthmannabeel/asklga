/**
 * Deterministic checks on the trust boundaries: PII scrubbing, the answer rubric the server
 * scores runs with, the import address guard, and which client address the rate limits trust.
 * No network, no model, no database.  Run: npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { scrubPii } from "../src/lib/pii.ts";
import { scoreCase } from "../src/lib/evalScore.mjs";
import { fetchDocumentText, guardedLookup, isBlockedAddress } from "../src/lib/ingest.ts";
import { clientIpFrom } from "../src/lib/clientIp.ts";

test("PII: phones, long identifiers, emails and name introductions are removed", () => {
  const cases: [string, string[]][] = [
    ["My name is Chidi Okoro, phone 08031234567. What happened to the road?", ["Chidi", "Okoro", "0803"]],
    ["Call me on +234 803 123 4567 or 0803-123-4567", ["803 123", "0803"]],
    ["My BVN is 2234 5678 901 and NIN 12345678901", ["2234", "5678", "12345678901"]],
    ["Email ada@example.com about the permit", ["ada@example.com"]],
    ["Sunana Musa Bello, ina son sanin hanya", ["Musa", "Bello"]],
    ["Emeka na my name, wetin happen to di market?", ["Emeka"]],
  ];
  for (const [q, gone] of cases) {
    const { text, removed } = scrubPii(q);
    assert.ok(removed > 0, `nothing removed from: ${q}`);
    for (const g of gone) assert.ok(!text.includes(g), `"${g}" survived in: ${text}`);
  }
});

test("PII: ordinary questions, years and naira amounts are left alone", () => {
  for (const q of ["How much did Obio/Akpor receive in June 2026?", "Is the 5 km road finished?", "What is the ₦6,700,000,000 contract for?"]) {
    assert.equal(scrubPii(q).text, q);
  }
});

test("Rubric: each of the six checks can fail on its own", () => {
  const c = { lang: "en", expect: { answered: true, cites: ["OBA-P-0001"], figures: ["6700000000"], mustNotContain: ["0803"] } };
  const good = { answered: true, language: "en", answer: "The contract is ₦6,700,000,000.", citations: [{ id: "OBA-P-0001" }] };
  assert.equal(scoreCase(c, good).ok, true);
  const fails: [string, object][] = [
    ["correct", { answered: false }],
    ["cited", { citations: [{ id: "OBA-P-0002" }] }],
    ["complete", { answer: "The contract is large." }],
    ["language", { language: "ha" }],
    ["plain", { answer: "₦6,700,000,000 " + "word ".repeat(150) }],
    ["safe", { answer: "₦6,700,000,000, call 0803" }],
  ];
  for (const [check, change] of fails) {
    const r = scoreCase(c, { ...good, ...change });
    assert.equal(r.ok, false, check);
    assert.equal(r.checks[check as keyof typeof r.checks], false, check);
  }
});

test("Rubric: Pidgin questions may be answered in English", () => {
  assert.equal(scoreCase({ lang: "pcm", expect: {} }, { answered: true, language: "en", answer: "ok", citations: [] }).ok, true);
});

test("Import guard: private, loopback, link-local and mapped addresses are blocked", () => {
  for (const a of ["127.0.0.1", "10.1.2.3", "172.20.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fe80::1", "fd00::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1"]) {
    assert.equal(isBlockedAddress(a), true, a);
  }
  for (const a of ["8.8.8.8", "102.89.32.1", "2606:4700::1111"]) assert.equal(isBlockedAddress(a), false, a);
});

test("Import guard: a name that resolves to a private address is refused at connect time", async () => {
  const err = await new Promise<NodeJS.ErrnoException | null>((resolve) => guardedLookup("localhost", {}, (e) => resolve(e)));
  assert.equal(err?.code, "EPRIVATE");
});

test("Import guard: literal private addresses and non-http schemes are refused before any request", async () => {
  for (const u of ["http://127.0.0.1/", "http://[::1]/", "http://169.254.169.254/latest/meta-data", "http://2130706433/", "file:///etc/passwd"]) {
    const r = await fetchDocumentText(u);
    assert.equal(r.ok, false, u);
  }
});

test("Client address: X-Forwarded-For is ignored unless a proxy is trusted", () => {
  const prev = { v: process.env.VERCEL, h: process.env.TRUST_PROXY_HOPS };
  try {
    delete process.env.VERCEL;
    delete process.env.TRUST_PROXY_HOPS;
    const forged = new Headers({ "x-forwarded-for": "1.2.3.4" });
    assert.equal(clientIpFrom(forged), "direct");
    process.env.TRUST_PROXY_HOPS = "1";
    // The client can prepend anything; the proxy appends the address it actually saw.
    assert.equal(clientIpFrom(new Headers({ "x-forwarded-for": "1.2.3.4, 41.58.0.9" })), "41.58.0.9");
    delete process.env.TRUST_PROXY_HOPS;
    process.env.VERCEL = "1";
    assert.equal(clientIpFrom(new Headers({ "x-forwarded-for": "1.2.3.4", "x-vercel-forwarded-for": "41.58.0.9" })), "41.58.0.9");
  } finally {
    if (prev.v === undefined) delete process.env.VERCEL; else process.env.VERCEL = prev.v;
    if (prev.h === undefined) delete process.env.TRUST_PROXY_HOPS; else process.env.TRUST_PROXY_HOPS = prev.h;
  }
});

import { sanitizeHistory } from "../src/lib/history.ts";
import { rateFromMime, speakable, wavFromPcm16 } from "../src/lib/tts.ts";

test("history: only the last three well-formed turns survive, capped and scrubbed", () => {
  const raw = [
    { question: "q0", answer: "a0" },
    { question: "q1", answer: "a1" },
    { question: "  ", answer: "no question" },
    "junk",
    { question: "q2", answer: "" },
    { question: "My name is Chidi Okoro, call 08031234567", answer: "x".repeat(2000) },
    { question: "q4", answer: "a4" },
  ];
  const out = sanitizeHistory(raw);
  assert.equal(out.length, 2, JSON.stringify(out));
  assert.ok(!out[0].question.includes("Okoro") && !out[0].question.includes("0803"));
  assert.equal(out[0].answer.length, 1000);
  assert.equal(out[1].question, "q4");
  assert.deepEqual(sanitizeHistory("nope"), []);
  assert.deepEqual(sanitizeHistory(undefined), []);
});

test("speech: WAV header is right and record IDs never reach the voice", () => {
  const pcm = new Uint8Array(32000); // one second at 16 kHz, 16-bit mono
  const wav = wavFromPcm16(pcm, 16000);
  assert.equal(wav.byteLength, 44 + 32000);
  const v = new DataView(wav.buffer);
  assert.equal(String.fromCharCode(...wav.subarray(0, 4)), "RIFF");
  assert.equal(String.fromCharCode(...wav.subarray(8, 12)), "WAVE");
  assert.equal(v.getUint32(24, true), 16000);
  assert.equal(v.getUint32(28, true), 32000);
  assert.equal(v.getUint16(34, true), 16);
  assert.equal(v.getUint32(40, true), 32000);
  assert.equal(rateFromMime("audio/L16;codec=pcm;rate=24000"), 24000);
  assert.equal(rateFromMime("audio/L16"), 24000);
  assert.equal(speakable("The road [OBA-P-0003] is ongoing. See OBA-D-0002 **now**"), "The road is ongoing. See now");
});

/* ---------- Resident participation rules ---------- */
import { validateIssue, validateRating, summariseRatings, responseStats, recentMonths, MIN_RATERS, MIN_FUNCTIONS } from "../src/lib/participationRules.ts";

test("Issue: personal details are stripped and the function must be a council one", () => {
  const r = validateIssue({ fn: "roads", title: "Drain blocked on Rumuola Road, call 08031234567", detail: "The drain outside the market has been blocked since August and floods the road when it rains. My name is Chidi Okoro.", photoUrl: "https://example.com/p.jpg" });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.ok(!r.value.title.includes("0803"));
    assert.ok(!r.value.detail.includes("Chidi"));
    assert.equal(r.value.photoUrl, "https://example.com/p.jpg");
  }
  assert.equal(validateIssue({ fn: "police", title: "Long enough title", detail: "Long enough detail for the validator to accept it." }).ok, false);
  assert.equal(validateIssue({ fn: "roads", title: "short", detail: "Long enough detail for the validator to accept it." }).ok, false);
  assert.equal(validateIssue({ fn: "roads", title: "Long enough title", detail: "Long enough detail for the validator to accept it.", photoUrl: "javascript:alert(1)" }).ok, false);
});

test("Rating: whole numbers 1-5 on at least the minimum functions, with an email address", () => {
  const good = validateRating({ scores: { roads: 2, waste: "3", health: 5 }, email: " Ada@Example.com " });
  assert.equal(good.ok, true);
  if (good.ok) {
    assert.deepEqual(good.value.scores, { roads: 2, waste: 3, health: 5 });
    assert.equal(good.value.email, "ada@example.com");
    assert.match(good.value.month, /^\d{4}-\d{2}$/);
  }
  assert.equal(validateRating({ scores: { roads: 6, waste: 3, health: 5 }, email: "a@b.co" }).ok, false, "out of range");
  assert.equal(validateRating({ scores: { roads: 2.5, waste: 3, health: 5 }, email: "a@b.co" }).ok, false, "not whole");
  assert.equal(validateRating({ scores: { roads: 2 }, email: "a@b.co" }).ok, false, `fewer than ${MIN_FUNCTIONS}`);
  assert.equal(validateRating({ scores: { roads: 2, waste: 3, health: 5 }, email: "not-an-email" }).ok, false, "email");
  assert.equal(validateRating({ scores: { roads: 2, waste: 3, health: 5, police: 1 }, email: "a@b.co" }).ok, true, "unknown keys are ignored");
});

test("Report card: nothing is published below the rater threshold; functions need 3 scores", () => {
  const months = recentMonths(3);
  assert.equal(months.length, 3);
  const few = summariseRatings([{ scores: { roads: 5, waste: 5, health: 5 } }], months);
  assert.equal(few.published, false);
  assert.equal(few.overall, null);
  const rows = Array.from({ length: MIN_RATERS }, (_, i) => ({ scores: { roads: 4, waste: 2, health: i < 2 ? 5 : undefined } }));
  const card = summariseRatings(rows, months);
  assert.equal(card.published, true);
  assert.equal(card.overall, 3, "mean of roads (4) and waste (2); health has only 2 scores");
  assert.equal(card.perFn.find((f) => f.key === "health")?.n, 2);
});

test("Response record: medians and overdue count", () => {
  const d = (days: number) => new Date(Date.UTC(2026, 9, 1 + days));
  const now = d(30);
  const rows = [
    { status: "resolved", createdAt: d(0), respondedAt: d(2), resolvedAt: d(10) },
    { status: "acknowledged", createdAt: d(5), respondedAt: d(11), resolvedAt: null },
    { status: "received", createdAt: d(10), respondedAt: null, resolvedAt: null },
    { status: "received", createdAt: d(28), respondedAt: null, resolvedAt: null },
  ];
  const st = responseStats(rows, now);
  assert.equal(st.total, 4);
  assert.equal(st.responded, 2);
  assert.equal(st.resolved, 1);
  assert.equal(st.open, 3, "the resolved report is no longer open");
  assert.equal(st.medianDaysToResponse, 4);
  assert.equal(st.medianDaysToResolve, 10);
  assert.equal(st.overdue, 1, "only the report filed 20 days ago is past 14 days without a response");
});
