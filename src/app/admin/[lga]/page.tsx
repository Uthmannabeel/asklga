import Link from "next/link";
import { adminStats, recentQuestions, topQuestions } from "@/lib/queries";
import { formatNaira } from "@/lib/register";

export const dynamic = "force-dynamic";

const LANG: Record<string, string> = { en: "English", pcm: "Pidgin", ha: "Hausa", yo: "Yoruba", ig: "Igbo", other: "Other" };

export default async function Overview({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  const [st, recent, top] = await Promise.all([adminStats(lga), recentQuestions(lga, 20), topQuestions(lga, 10)]);
  const q = st.questions;
  const pct = (a: number, b: number) => (Number(b) ? Math.round((Number(a) / Number(b)) * 100) + "%" : "n/a");
  return (
    <>
      <section className="grid gap-2">
        <h1>Overview</h1>
        <div className="grid gap-6 md:grid-cols-3">
          <table>
            <caption className="text-left font-bold pb-1">Questions</caption>
            <tbody>
              <tr><th>Asked</th><td>{q.total}</td></tr>
              <tr><th>Answered from records</th><td>{q.answered} ({pct(q.answered, q.total)})</td></tr>
              <tr><th>Escalated</th><td>{q.escalated}</td></tr>
              <tr><th>Useful / not useful</th><td>{q.up} / {q.down}</td></tr>
              <tr><th>Open gaps</th><td><Link href={`/admin/${lga}/gaps`}>{q.gaps}</Link></td></tr>
              <tr><th>Open flags</th><td><Link href={`/admin/${lga}/flags`}>{q.flagged}</Link></td></tr>
              <tr><th>By staff / investors</th><td>{q.staff} / {q.investors}</td></tr>
            </tbody>
          </table>
          <table>
            <caption className="text-left font-bold pb-1">Registers</caption>
            <tbody>
              <tr><th>Projects approved</th><td>{st.projects.total}</td></tr>
              <tr><th>With verification date</th><td>{st.projects.verified}</td></tr>
              <tr><th>With evidence</th><td>{st.projects.withEvidence}</td></tr>
              <tr><th>Budget covered</th><td>{formatNaira(Number(st.projects.amount))}</td></tr>
              <tr><th>Documents (internal)</th><td>{st.documents.total} ({st.documents.internal})</td></tr>
              <tr><th>Documents past review date</th><td>{st.documents.stale}</td></tr>
              <tr><th>Open tickets</th><td><Link href={`/admin/${lga}/tickets`}>{st.tickets.open}</Link></td></tr>
            </tbody>
          </table>
          <table>
            <caption className="text-left font-bold pb-1">By language</caption>
            <tbody>
              {st.byLang.length === 0 ? <tr><td className="muted">No questions yet.</td></tr> : null}
              {st.byLang.map((l) => (
                <tr key={l.language ?? "none"}><th>{LANG[l.language ?? "other"] ?? l.language}</th><td>{l.n} asked, {pct(l.answered, l.n)} answered</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-2">
        <h2>Most asked</h2>
        {top.length === 0 ? <p className="muted">Nothing yet. Questions from the public portal appear here.</p> : null}
        <ul className="register">
          {top.map((t) => (
            <li key={t.question} className="register-row">
              <span>{t.question}</span>
              <span className="small muted">Asked {t.n} time{Number(t.n) === 1 ? "" : "s"}, answered {t.answered}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-2">
        <h2>Recent questions</h2>
        <ul className="register">
          {recent.map((r) => (
            <li key={r.id} className="register-row">
              <span>{r.question}</span>
              <span className="small muted">
                {r.createdAt.toISOString().slice(0, 16).replace("T", " ")}, {LANG[r.language ?? "other"] ?? r.language}, {r.audience}, {r.answered ? "answered" : "not answered"}
                {r.feedback ? `, rated ${r.feedback}` : ""}{r.flagged ? ", flagged" : ""}{r.latencyMs ? `, ${(r.latencyMs / 1000).toFixed(1)}s` : ""}
              </span>
              {r.answer ? <span className="small">{r.answer}</span> : null}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
