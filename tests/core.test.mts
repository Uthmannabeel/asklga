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
