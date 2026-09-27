import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { LgaFinder } from "@/components/LgaFinder";
import { directory, nationalSummary } from "@/lib/national";

export const dynamic = "force-dynamic";
export const metadata = { title: "AskLGA, every local government in Nigeria" };

export default async function Home() {
  const [rows, sum] = await Promise.all([directory(), nationalSummary()]);
  const states = [...new Set(rows.map((l) => l.state))];
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-5xl px-4 py-10 grid gap-10">
        <div className="measure grid gap-3">
          <h1>Ask your local government.</h1>
          <p className="text-lg">
            Every one of Nigeria&apos;s {sum.lgas} local government areas has a page here. Ask about services, projects, public assets, money and investment in English, Pidgin, Hausa, Yoruba or Igbo, and get answers from approved records only, with the source stamped on every one.
          </p>
        </div>

        <LgaFinder
          rows={rows.map((r) => ({ id: r.id, name: r.name, state: r.state, records: r.records }))}
          hint="Find your local government area"
          placeholder="Type the LGA or state, e.g. Obio/Akpor or Kano"
          noMatch="No LGA matches that. Check the spelling, or pick from the list below."
          withRecords="has published records"
        />

        <section className="grid gap-3">
          <h2>Across the country</h2>
          <table className="max-w-xl">
            <tbody>
              <tr><th>Local government areas</th><td>{sum.lgas} in {sum.states} states and the FCT</td></tr>
              <tr><th>LGAs with approved records</th><td>{sum.joined}</td></tr>
              <tr><th>Approved records published</th><td>{sum.records}</td></tr>
              <tr><th>Questions asked so far</th><td>{sum.questions}</td></tr>
              <tr><th>Allocation months on file</th><td>{sum.allocationPeriods}{sum.latestPeriod ? `, latest ${sum.latestPeriod}, ${sum.allocationLgas} LGAs` : ""}</td></tr>
            </tbody>
          </table>
          <p className="flex flex-wrap gap-x-4 gap-y-1 small">
            <Link href="/scoreboard" className="nav-link">Scoreboard</Link>
            <Link href="/insights" className="nav-link">What Nigerians ask</Link>
            <Link href="/standard" className="nav-link">The LGA Record Standard</Link>
            <Link href="/api/catalogue.json" className="nav-link">Open data catalogue</Link>
            <Link href="/join" className="nav-link">For LGA officials</Link>
          </p>
        </section>

        <section className="grid gap-4">
          <h2>All local government areas</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {states.map((st) => (
              <div key={st} className="grid gap-1 break-inside-avoid">
                <h3>{st === "Federal Capital Territory" ? st : `${st} State`}</h3>
                <p className="small" style={{ lineHeight: 1.9 }}>
                  {rows.filter((l) => l.state === st).map((l, i, arr) => (
                    <span key={l.id}>
                      <Link href={`/${l.id}`} className={l.records > 0 ? "font-bold" : ""}>{l.name}</Link>
                      {i < arr.length - 1 ? " · " : ""}
                    </span>
                  ))}
                </p>
              </div>
            ))}
          </div>
          <p className="small muted">Bold: the LGA has published approved records. Every other LGA has a page with what the federal system already publishes about it, and can join.</p>
        </section>

        <section className="measure grid gap-2 small muted">
          <p>AskLGA is a public good. The software is open source under the MIT licence, the registers are open data under CC BY 4.0, and no LGA pays to be listed.</p>
        </section>
      </main>
    </>
  );
}
