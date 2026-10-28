import Link from "next/link";
import { IssueStatusMark } from "@/components/IssueStatus";
import { issueStats, listIssues, listRatings } from "@/lib/participation";
import { ISSUE_STATUSES, ISSUE_STATUS_LABEL, daysOpen } from "@/lib/participationRules";
import { fnLabel } from "@/lib/functions";
import { formatDate } from "@/lib/format";
import { alertChannels } from "@/lib/notify";
import { hideIssue, respondToIssue } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminIssues({ params, searchParams }: { params: Promise<{ lga: string }>; searchParams: Promise<{ error?: string }> }) {
  const { lga } = await params;
  const { error } = await searchParams;
  const [issues, stats, ratings] = await Promise.all([listIssues(lga, { includeHidden: true }), issueStats(lga), listRatings(lga, 50)]);
  const channels = alertChannels();
  return (
    <>
      <section className="grid gap-3">
        <h1>Problems reported</h1>
        <p className="measure small">Residents&apos; reports against the council&apos;s nine constitutional functions. Each is public from the moment it is filed. Acknowledge it, say what will be done, mark it resolved with a note, or mark it as not the council&apos;s to fix and say whose it is. Every change goes on the public timeline with your name and the date; the days until your first response are on the public record.</p>
        <p className="small muted">
          {channels.length ? `New reports are also sent by ${channels.join(", ")}.` : "No alert channel is configured, so new reports only appear here."}{" "}
          {stats.total} on file, {stats.open} open, {stats.overdue} waiting more than 14 days without a response. <Link href={`/${lga}/issues`}>Public register</Link>.
        </p>
        {error ? <p className="small" style={{ color: "var(--danger)" }}>{error}</p> : null}
        {issues.length === 0 ? <p className="muted">No reports yet.</p> : null}
        <ul className="register">
          {issues.map((i) => (
            <li key={i.id} className="register-row">
              <span className="font-bold"><span className="mono muted">{i.id}</span> {i.title}{i.hidden ? <span className="small" style={{ color: "var(--danger)" }}> (off the register)</span> : null}</span>
              <span className="small muted"><IssueStatusMark status={i.status} /> {fnLabel(i.fn, true)}{i.ward ? `, ${i.ward} ward` : ""}{i.place ? `, ${i.place}` : ""}. Filed {formatDate(i.createdAt)}, {daysOpen(i.createdAt, i.resolvedAt)} days. {i.respondedAt ? `First response ${formatDate(i.respondedAt)}.` : "No response yet."}{i.supports ? ` Affects ${i.supports} other${i.supports === 1 ? "" : "s"}.` : ""}</span>
              <span className="small" style={{ whiteSpace: "pre-line" }}>{i.detail}</span>
              {i.photoUrl ? <span className="small"><a href={i.photoUrl} rel="noopener nofollow">Linked photo or video</a></span> : null}
              {i.response ? <span className="small"><strong>Current response:</strong> {i.response}</span> : null}
              {i.hideReason ? <span className="small muted">Reason off register: {i.hideReason}</span> : null}
              <form action={respondToIssue} className="grid gap-2 md:grid-cols-[12rem_1fr_auto] items-end">
                <input type="hidden" name="id" value={i.id} />
                <input type="hidden" name="lgaId" value={lga} />
                <select name="status" defaultValue={i.status} aria-label={`Status of ${i.id}`}>
                  {ISSUE_STATUSES.map((st) => <option key={st} value={st}>{ISSUE_STATUS_LABEL[st]}</option>)}
                </select>
                <input name="note" placeholder="Public response: what will be done, by whom, by when (or whose job it is)" aria-label={`Response to ${i.id}`} maxLength={1500} />
                <button type="submit" className="btn btn-sm">Save and publish</button>
              </form>
              <form action={hideIssue} className="flex flex-wrap gap-2 items-end">
                <input type="hidden" name="id" value={i.id} />
                <input type="hidden" name="lgaId" value={lga} />
                <input type="hidden" name="hidden" value={i.hidden ? "no" : "yes"} />
                {!i.hidden ? <input name="reason" placeholder="Reason (abuse, personal attack, duplicate of …)" aria-label={`Reason to take ${i.id} off the register`} maxLength={300} style={{ maxWidth: "26rem" }} /> : null}
                <button type="submit" className="btn btn-quiet btn-sm">{i.hidden ? "Put back on the register" : "Take off the register"}</button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-3">
        <h2>Residents&apos; scores, latest {ratings.length}</h2>
        <p className="small muted measure">What residents said the council should fix first. Comments are never public. The scores feed the <Link href={`/${lga}/report-card`}>public report card</Link> once five residents have scored in three months.</p>
        {ratings.length === 0 ? <p className="muted">No scores yet.</p> : (
          <ul className="register">
            {ratings.map((r) => (
              <li key={r.id} className="register-row">
                <span className="small">{formatDate(r.createdAt)}, for {formatDate(r.month)}: {Object.entries(r.scores).map(([k, v]) => `${fnLabel(k, true)} ${v}`).join(", ")}</span>
                {r.comment ? <span>{r.comment}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
