/**
 * Evaluation harness. Sends eval/questions.json to a running AskLGA server and scores each
 * answer against the six-point rubric from the build plan (src/lib/evalScore.mjs, shared with
 * the server, which rescores the stored answers itself before publishing a run):
 *   correct  (answered when it should be, refused when it should be)
 *   cited    (expected record IDs present)
 *   complete (expected figures present)
 *   language (answer language matches the question language)
 *   plain    (under 140 words)
 *   safe     (no PII echoed, out-of-scope refused)
 *
 * Usage:  npm run dev   (in another terminal, with GEMINI_API_KEY or ANTHROPIC_API_KEY set)
 *         node scripts/eval.mjs [baseUrl] [staffName] [passcode]
 * Pass the workspace name and passcode: the staff session enables the internal-scope case and
 * exempts the harness from the per-connection rate limit on /api/ask.
 */
import fs from "node:fs";
import path from "node:path";
import { scoreCase } from "../src/lib/evalScore.mjs";

const base = process.argv[2] ?? "http://localhost:3000";
const staffName = process.argv[3];
const passcode = process.argv[4];

async function staffCookie() {
  if (!staffName || !passcode) return null;
  // The sign-in form is a server action; use the plain API-less route by posting the form.
  const res = await fetch(`${base}/api/staff-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: staffName, passcode }),
    redirect: "manual",
  });
  const cookie = res.headers.get("set-cookie");
  return cookie ? cookie.split(";")[0] : null;
}

async function main() {
  const cases = JSON.parse(fs.readFileSync(path.join(process.cwd(), "eval", "questions.json"), "utf8"));
  const cookie = await staffCookie();
  const rows = [];
  let pass = 0;
  let figureFailures = 0;
  // Without a staff session the public limit applies (6 questions a minute per connection), so
  // EVAL_PACE_MS spaces the requests out, e.g. EVAL_PACE_MS=11000 for a run against production.
  const pace = Number(process.env.EVAL_PACE_MS ?? 0);
  for (const c of cases) {
    if (pace && rows.length) await new Promise((r) => setTimeout(r, pace));
    const started = Date.now();
    // The staff cookie is sent on every request: it lifts the per-connection rate limit for the
    // harness, and the server still forces public scope unless the case asks for internal.
    const res = await fetch(`${base}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
      body: JSON.stringify({ lgaId: "obio-akpor", question: c.question, audience: c.audience, scope: c.scope ?? "public" }),
    });
    const r = await res.json();
    if (!res.ok) {
      console.log(`ERROR ${c.id}: ${r.error}`);
      rows.push({ id: c.id, ok: false, error: r.error });
      continue;
    }
    const { ok, checks, cited } = scoreCase(c, r);
    if (ok) pass += 1;
    if (r.figureCheck === "failed") figureFailures += 1;
    rows.push({ id: c.id, questionId: r.questionId, ok, ...checks, answered: r.answered, language: r.language, cited: cited.join(" "), ms: Date.now() - started, answer: r.answer.slice(0, 200) });
    console.log(`${ok ? "PASS" : "FAIL"} ${c.id} ${Object.entries(checks).filter(([, v]) => !v).map(([k]) => k).join(",") || "all checks"} lang=${r.language} cited=${cited.join(",")}`);
    if (!ok) console.log("    ", r.answer);
  }
  const summary = { cases: cases.length, pass, accuracy: Math.round((pass / cases.length) * 100), figureCheckFailures: figureFailures, ranAt: new Date().toISOString() };
  console.log(JSON.stringify(summary, null, 2));
  fs.mkdirSync("eval/results", { recursive: true });
  fs.writeFileSync(`eval/results/${summary.ranAt.slice(0, 19).replace(/[:T]/g, "-")}.json`, JSON.stringify({ summary, rows }, null, 2));
  // Publish the run on the LGA's scoreboard when signed in.
  if (cookie) {
    const res = await fetch(`${base}/api/eval-result`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      // Only which stored answer belongs to which case: the server rescores them itself.
      body: JSON.stringify({ lgaId: "obio-akpor", results: rows.map((x) => ({ caseId: x.id, questionId: x.questionId ?? null })), note: `eval/questions.json, ${cases.length} cases` }),
    });
    const out = await res.json().catch(() => ({}));
    console.log(res.ok ? `Published to the scoreboard: server scored ${out.pass}/${out.cases} (run ${out.runId}).` : `Scoreboard publish failed: ${res.status} ${out.error ?? ""}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
