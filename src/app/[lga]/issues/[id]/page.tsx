import Link from "next/link";
import { notFound } from "next/navigation";
import { LgaShell } from "@/components/LgaShell";
import { LgaPageHead } from "@/components/LgaPageHead";
import { IssueStatusMark, issueStatusLabel } from "@/components/IssueStatus";
import { SupportButton } from "@/components/SupportButton";
import { getIssue, listIssueUpdates } from "@/lib/participation";
import { daysOpen } from "@/lib/participationRules";
import { FUNCTIONS } from "@/lib/functions";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const httpOnly = (u: string | null | undefined) => (u && /^https?:\/\//i.test(u) ? u : null);

export async function generateMetadata({ params }: { params: Promise<{ lga: string; id: string }> }) {
  const { id } = await params;
  const i = await getIssue(id);
  return { title: i && !i.hidden ? i.title : "Problem report" };
}

export default async function IssuePage({ params }: { params: Promise<{ lga: string; id: string }> }) {
  const { lga, id } = await params;
  const i = await getIssue(id);
  if (!i || i.lgaId !== lga || i.hidden) notFound();
  const updates = await listIssueUpdates(id);
  const fn = FUNCTIONS.find((f) => f.key === i.fn);
  const closedAt = i.resolvedAt ?? (i.status === "closed" || i.status === "not_council" ? i.updatedAt : null);

  return (
    <LgaShell
      lgaId={lga}
      back={`/${lga}/issues`}
      hero={
        <LgaPageHead lgaId={lga} title={i.title} extraCrumb={{ href: `/${lga}/issues`, label: "Problems reported" }}>
          <div className="flex flex-wrap items-center gap-3">
            <IssueStatusMark status={i.status} />
            <span className="small muted"><span className="mono">{i.id}</span> · filed {formatDate(i.createdAt)}</span>
          </div>
          <dl className="fact-strip">
            <div><dt>Council function</dt><dd>{fn?.label ?? i.fn}</dd></div>
            <div><dt>Days {closedAt ? "to close" : "open"}</dt><dd className="mono">{daysOpen(i.createdAt, closedAt)}</dd></div>
            <div><dt>First response</dt><dd>{i.respondedAt ? `${formatDate(i.respondedAt)}, after ${daysOpen(i.createdAt, i.respondedAt)} day${daysOpen(i.createdAt, i.respondedAt) === 1 ? "" : "s"}` : <span className="muted" style={{ fontWeight: 400 }}>None yet</span>}</dd></div>
            <div><dt>Where</dt><dd>{[i.ward ? `${i.ward} ward` : null, i.place].filter(Boolean).join(", ") || <span className="muted" style={{ fontWeight: 400 }}>Not given</span>}</dd></div>
          </dl>
        </LgaPageHead>
      }
    >
      <section className="grid gap-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-14">
        <div className="grid gap-10">
          <div className="grid gap-3">
            <h2 style={{ fontSize: "1.4rem" }}>What the resident reported</h2>
            <p style={{ whiteSpace: "pre-line" }}>{i.detail}</p>
            {httpOnly(i.photoUrl) ? <p className="small"><a href={httpOnly(i.photoUrl)!} rel="noopener nofollow">Photo or video the resident linked</a> <span className="muted">(opens another site)</span></p> : null}
            <div className="flex flex-wrap items-center gap-3">
              <SupportButton id={i.id} initial={i.supports} />
            </div>
          </div>

          {i.response ? (
            <div className="grid gap-2 panel">
              <p className="eyebrow">The council&apos;s response</p>
              <p style={{ whiteSpace: "pre-line" }}>{i.response}</p>
            </div>
          ) : null}

          <div className="grid gap-3">
            <h2 style={{ fontSize: "1.4rem" }}>What has happened since</h2>
            <ol className="timeline">
              {updates.map((u) => (
                <li key={u.id}>
                  <span className="font-bold">{u.oldStatus && u.oldStatus !== u.newStatus ? `${issueStatusLabel(u.oldStatus)} to ` : ""}{issueStatusLabel(u.newStatus)}</span>
                  {u.note ? <span style={{ whiteSpace: "pre-line" }}>{u.note}</span> : null}
                  <span className="small muted">{formatDate(u.createdAt)}, {u.by}</span>
                </li>
              ))}
            </ol>
            {!i.respondedAt ? <p className="small muted">The council has not responded yet. Days without a response count on its public record.</p> : null}
          </div>
        </div>

        <aside className="grid gap-5 content-start order-first lg:order-none">
          {fn ? (
            <div className="grid gap-2 small" style={{ color: "var(--ink-2)" }}>
              <p className="eyebrow">Why this is the council&apos;s job</p>
              <p>{fn.label} is a local government function under the Fourth Schedule to the 1999 Constitution ({fn.ref}){fn.shared ? ", shared with the State" : ""}.</p>
              {fn.notCouncil ? <p><strong>Not the council:</strong> {fn.notCouncil}</p> : null}
            </div>
          ) : null}
          <p className="small"><Link href={`/${lga}/issues#file`}>Report another problem</Link></p>
          <p className="small"><Link href={`/${lga}/report-card`}>Score the council on this function</Link></p>
        </aside>
      </section>
    </LgaShell>
  );
}
