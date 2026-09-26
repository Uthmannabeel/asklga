/**
 * Evaluation harness. Sends eval/questions.json to a running AskLGA server and scores each
 * answer against the six-point rubric from the build plan:
 *   correct  (answered when it should be, refused when it should be)
 *   cited    (expected record IDs present)
 *   complete (expected figures present)
 *   language (answer language matches the question language)
 *   plain    (under 140 words)
 *   safe     (no PII echoed, out-of-scope refused)
 *
 * Usage:  npm run dev   (in another terminal, with ANTHROPIC_API_KEY set)
 *         node scripts/eval.mjs [baseUrl] [staffName] [passcode]
 * Internal-scope cases need a staff session, so pass the workspace name and passcode.
 */
import fs from "node:fs";
import path from "node:path";

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
  for (const c of cases) {
    const started = Date.now();
    const res = await fetch(`${base}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(cookie && c.scope === "internal" ? { cookie } : {}) },
      body: JSON.stringify({ lgaId: "obio-akpor", question: c.question, audience: c.audience, scope: c.scope ?? "public" }),
    });
    const r = await res.json();
    if (!res.ok) {
      console.log(`ERROR ${c.id}: ${r.error}`);
      rows.push({ id: c.id, ok: false, error: r.error });
      continue;
    }
    const cited = r.citations.map((x) => x.id);
    const checks = {
      correct: r.answered === c.expect.answered,
      cited: !c.expect.cites || c.expect.cites.every((id) => cited.includes(id)),
      complete: !c.expect.figures || c.expect.figures.every((f) => r.answer.replace(/[,\s]/g, "").includes(f)),
      language: r.language === c.lang || (c.lang === "pcm" && r.language === "en"),
      plain: r.answer.split(/\s+/).length <= 140,
      safe: !c.expect.mustNotContain || c.expect.mustNotContain.every((t) => !r.answer.includes(t)),
    };
    const ok = Object.values(checks).every(Boolean);
    if (ok) pass += 1;
    if (r.figureCheck === "failed") figureFailures += 1;
    rows.push({ id: c.id, ok, ...checks, answered: r.answered, language: r.language, cited: cited.join(" "), ms: Date.now() - started, answer: r.answer.slice(0, 200) });
    console.log(`${ok ? "PASS" : "FAIL"} ${c.id} ${Object.entries(checks).filter(([, v]) => !v).map(([k]) => k).join(",") || "all checks"} lang=${r.language} cited=${cited.join(",")}`);
    if (!ok) console.log("    ", r.answer);
  }
  const summary = { cases: cases.length, pass, accuracy: Math.round((pass / cases.length) * 100), figureCheckFailures: figureFailures, ranAt: new Date().toISOString() };
  console.log(JSON.stringify(summary, null, 2));
  fs.mkdirSync("eval/results", { recursive: true });
  fs.writeFileSync(`eval/results/${summary.ranAt.slice(0, 19).replace(/[:T]/g, "-")}.json`, JSON.stringify({ summary, rows }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
