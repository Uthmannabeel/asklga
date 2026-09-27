import Link from "next/link";
import { notFound } from "next/navigation";
import { LgaShell } from "@/components/LgaShell";
import { getLga } from "@/lib/queries";
import { formatNaira } from "@/lib/register";
import { allocationsFor, stateAllocationContext } from "@/lib/national";

export const dynamic = "force-dynamic";
export const metadata = { title: "Money from the Federation Account" };

/**
 * "Your LGA's money": the monthly Federation Account (FAAC) allocation to this LGA, as
 * published in the monthly tables. Since the 2024 Supreme Court judgment on local government
 * financial autonomy this is the most-asked number about any LGA and the hardest to find.
 */
export default async function MoneyPage({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  const [row, rows] = await Promise.all([getLga(lga), allocationsFor(lga, 36)]);
  if (!row) notFound();
  const latest = rows[0] ?? null;
  const ctx = latest ? await stateAllocationContext(row.state, latest.period) : null;
  const twelve = rows.slice(0, 12);
  const total12 = twelve.reduce((n, r) => n + (r.netNgn ?? r.grossNgn ?? 0), 0);
  return (
    <LgaShell lgaId={lga} back={`/${lga}/money`}>
      <section className="grid gap-2 measure">
        <p className="small"><Link href={`/${lga}`}>{row.name}</Link></p>
        <h1>Money from the Federation Account</h1>
        <p>
          Every month the Federation Account Allocation Committee shares federal revenue among the federal government, the states and all 774 local governments. This page shows what was allocated to {row.name}, as published in the monthly tables, so residents can compare it with what they see on the ground.
        </p>
      </section>
      {rows.length === 0 ? (
        <section className="measure grid gap-2">
          <div className="stamp stamp-caution">
            <div><strong>Not loaded yet</strong></div>
            <div>No allocation months have been loaded for {row.name}. Figures are imported from the published monthly tables by the portal administrators; when they are, they appear here with the source linked.</div>
          </div>
          <p className="small muted">Officials: the import accepts the published table as CSV. See <Link href="/join">how to join</Link>.</p>
        </section>
      ) : (
        <>
          <section className="grid gap-3">
            <table className="max-w-2xl">
              <tbody>
                <tr><th>Latest month on file</th><td>{latest!.period}: {formatNaira(latest!.netNgn ?? latest!.grossNgn)}{latest!.grossNgn && latest!.netNgn && latest!.grossNgn !== latest!.netNgn ? ` net of ${formatNaira(latest!.grossNgn)} gross` : ""}</td></tr>
                <tr><th>Last {twelve.length} month{twelve.length === 1 ? "" : "s"} on file</th><td>{formatNaira(total12)}</td></tr>
                {ctx && Number(ctx.lgas) > 1 ? <tr><th>{row.state} State, {latest!.period}</th><td>{Number(ctx.lgas)} LGAs on file, median {formatNaira(Number(ctx.median))}, total {formatNaira(Number(ctx.total))}</td></tr> : null}
                {row.population && latest ? <tr><th>Per resident, latest month</th><td>{formatNaira(Math.round((latest.netNgn ?? latest.grossNgn ?? 0) / row.population))} (population {row.population.toLocaleString("en-NG")}{row.populationYear ? `, ${row.populationYear}` : ""})</td></tr> : null}
              </tbody>
            </table>
          </section>
          <section className="grid gap-2">
            <h2>Month by month</h2>
            <div className="table-scroll">
              <table className="max-w-3xl">
                <thead><tr><th>Month</th><th>Gross</th><th>Net paid</th><th>Source</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.period}</td>
                      <td>{formatNaira(r.grossNgn)}</td>
                      <td>{formatNaira(r.netNgn)}</td>
                      <td className="small">{r.sourceUrl ? <a href={r.sourceUrl} rel="noopener">{r.source}</a> : r.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="small muted">N = naira. Gross is the LGA&apos;s share before deductions; net is the amount paid after statutory deductions. Figures are as published; the portal does not compute or adjust them. <Link href="/standard#allocations">Field definitions</Link>.</p>
          </section>
        </>
      )}
      <section className="measure grid gap-2">
        <h2>What this money is for</h2>
        <p>Local governments fund primary health centres, primary schools, markets, rural roads, drainage, waste collection and civil registration from this allocation and from their own revenue. The projects register on this portal is where an LGA shows what it built with it.</p>
        <p className="small"><Link href={`/${lga}/projects`}>See the projects register</Link></p>
      </section>
    </LgaShell>
  );
}
