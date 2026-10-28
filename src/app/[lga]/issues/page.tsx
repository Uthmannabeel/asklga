import Link from "next/link";
import { notFound } from "next/navigation";
import { LgaShell } from "@/components/LgaShell";
import { LgaPageHead } from "@/components/LgaPageHead";
import { IssueForm } from "@/components/IssueForm";
import { IssueStatusMark } from "@/components/IssueStatus";
import { getLga } from "@/lib/queries";
import { issueStats, listIssues } from "@/lib/participation";
import { ISSUE_STATUSES, ISSUE_STATUS_LABEL, daysOpen } from "@/lib/participationRules";
import { FUNCTIONS, fnLabel, isFnKey } from "@/lib/functions";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Report a problem" };

export default async function IssuesPage({ params, searchParams }: { params: Promise<{ lga: string }>; searchParams: Promise<{ status?: string | string[]; fn?: string | string[] }> }) {
  const { lga } = await params;
  const sp = await searchParams;
  const one = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);
  const status = (ISSUE_STATUSES as readonly string[]).includes(one(sp.status) ?? "") ? one(sp.status) : undefined;
  const fn = isFnKey(one(sp.fn)) ? one(sp.fn) : undefined;
  const [row, all, stats] = await Promise.all([getLga(lga), listIssues(lga), issueStats(lga)]);
  if (!row) notFound();
  const shown = all.filter((i) => (!status || i.status === status) && (!fn || i.fn === fn));
  const byStatus = ISSUE_STATUSES.map((st) => [st, all.filter((i) => i.status === st).length] as const).filter(([, n]) => n > 0);
  const byFn = FUNCTIONS.map((f) => [f.key, all.filter((i) => i.fn === f.key).length] as const).filter(([, n]) => n > 0);
  const query = (next: { status?: string; fn?: string }) => {
    const q = new URLSearchParams();
    const st = "status" in next ? next.status : status;
    const f = "fn" in next ? next.fn : fn;
    if (st) q.set("status", st);
    if (f) q.set("fn", f);
    const qs = q.toString();
    return `/${lga}/issues${qs ? `?${qs}` : ""}`;
  };

  return (
    <LgaShell
      lgaId={lga}
      back={`/${lga}/issues`}
      hero={
        <LgaPageHead lgaId={lga} title="Problems reported to the council" lede="Any resident can report a problem that falls under one of the council's nine constitutional jobs. Every report is public from the moment it is filed, and every change of status is dated, so the council's response time is on the record.">
          {stats.total ? (
            <dl className="fact-strip">
              <div><dt>Reports</dt><dd>{stats.total}</dd></div>
              <div><dt>Still open</dt><dd style={{ color: stats.open ? "var(--caution)" : undefined }}>{stats.open}</dd></div>
              <div><dt>Council responded</dt><dd>{stats.responded} of {stats.total}</dd></div>
              <div><dt>Median days to first response</dt><dd>{stats.medianDaysToResponse != null ? stats.medianDaysToResponse : <span className="muted" style={{ fontWeight: 400 }}>No response yet</span>}</dd></div>
              <div><dt>Resolved</dt><dd>{stats.resolved}</dd></div>
            </dl>
          ) : null}
        </LgaPageHead>
      }
    >
      <section className="grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-14 items-start">
        <div className="grid gap-6">
          {all.length === 0 ? (
            <div className="empty measure">
              <p className="font-bold">No problem has been reported to {row.name} here yet</p>
              <p style={{ color: "var(--ink-2)" }}>Be the first. The report goes on the public register at once and the council&apos;s response, or silence, is timed from today.</p>
            </div>
          ) : (
            <>
              <nav aria-label="Filter by status" className="chips">
                <Link href={query({ status: undefined })} scroll={false} className="chip" aria-current={!status ? "page" : undefined}>All <span className="n">{all.length}</span></Link>
                {byStatus.map(([st, n]) => (
                  <Link key={st} href={query({ status: st })} scroll={false} className="chip" aria-current={status === st ? "page" : undefined}>{ISSUE_STATUS_LABEL[st]} <span className="n">{n}</span></Link>
                ))}
              </nav>
              {byFn.length > 1 ? (
                <nav aria-label="Filter by council function" className="chips">
                  {byFn.map(([k, n]) => (
                    <Link key={k} href={query({ fn: fn === k ? undefined : k })} scroll={false} className="chip" aria-current={fn === k ? "page" : undefined}>{fnLabel(k, true)} <span className="n">{n}</span></Link>
                  ))}
                </nav>
              ) : null}
              <ol className="register">
                {shown.map((i) => (
                  <li key={i.id} className="register-row md:grid-cols-[minmax(0,1fr)_9rem] md:gap-x-8" style={{ padding: "1.05rem 0" }}>
                    <div className="grid gap-1.5">
                      <Link href={`/${lga}/issues/${i.id}`} className="record-title">{i.title}</Link>
                      <span className="small" style={{ color: "var(--ink-2)" }}>
                        <IssueStatusMark status={i.status} />{" "}
                        {[fnLabel(i.fn, true), i.ward ? `${i.ward} ward` : null, i.place].filter(Boolean).join(" · ")}
                      </span>
                      {i.response ? <span className="small"><strong>Council:</strong> {i.response}</span> : null}
                      <span className="small muted"><span className="mono">{i.id}</span> · filed {formatDate(i.createdAt)}{i.supports ? ` · affects ${i.supports} other${i.supports === 1 ? "" : "s"}` : ""}</span>
                    </div>
                    <div className="md:text-right grid content-start gap-0.5">
                      <span className="mono font-bold">{daysOpen(i.createdAt, i.resolvedAt ?? (i.status === "closed" || i.status === "not_council" ? i.updatedAt : null))} days</span>
                      <span className="small muted">{i.respondedAt ? `responded in ${daysOpen(i.createdAt, i.respondedAt)} day${daysOpen(i.createdAt, i.respondedAt) === 1 ? "" : "s"}` : "no response yet"}</span>
                    </div>
                  </li>
                ))}
              </ol>
              {shown.length === 0 ? <p className="muted">No report matches that filter.</p> : null}
            </>
          )}
          <p className="small muted measure">
            Reports are the resident&apos;s own words with personal details removed. The council can mark a report as not its responsibility, with a note saying whose it is. Reports with abuse or personal attacks are taken off the register and the reason is logged. <Link href={`/${lga}/report-card`}>Score the council</Link> on the same nine functions.
          </p>
        </div>
        <aside className="panel grid gap-4 content-start" id="file">
          <h2 style={{ fontSize: "1.3rem" }}>Report a problem</h2>
          <IssueForm lgaId={lga} lgaName={row.name} wards={row.wards ?? []} />
        </aside>
      </section>
    </LgaShell>
  );
}
