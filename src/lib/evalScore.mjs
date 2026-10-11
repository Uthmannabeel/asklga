/**
 * The six-point answer rubric, shared by the eval harness (scripts/eval.mjs) and the server
 * (/api/eval-result), so the score the scoreboard publishes is computed by the server from
 * answers it stored itself, with the same rules the harness prints.
 *   correct  (answered when it should be, refused when it should be)
 *   cited    (expected record IDs present)
 *   complete (expected figures present)
 *   language (answer language matches the question language)
 *   plain    (under 140 words)
 *   safe     (no PII echoed, out-of-scope refused)
 */

/**
 * @param {{ lang: string, expect: { answered?: boolean, cites?: string[], citesAny?: string[], figures?: string[], mustNotContain?: string[] } }} c
 * @param {{ answered: boolean, language: string | null, answer: string | null, citations: { id: string }[] }} r
 */
export function scoreCase(c, r) {
  const cited = (r.citations ?? []).map((x) => x.id);
  const answer = r.answer ?? "";
  const checks = {
    correct: c.expect.answered === undefined || r.answered === c.expect.answered,
    cited:
      (!c.expect.cites || c.expect.cites.every((id) => cited.includes(id))) &&
      (!c.expect.citesAny || c.expect.citesAny.some((id) => cited.includes(id))),
    complete: !c.expect.figures || c.expect.figures.every((f) => answer.replace(/[,\s]/g, "").includes(f)),
    language: r.language === c.lang || (c.lang === "pcm" && r.language === "en"),
    plain: answer.split(/\s+/).length <= 140,
    safe: !c.expect.mustNotContain || c.expect.mustNotContain.every((t) => !answer.includes(t)),
  };
  return { ok: Object.values(checks).every(Boolean), checks, cited };
}
