import Link from "next/link";
import { LgaShell } from "@/components/LgaShell";
import { LgaPageHead } from "@/components/LgaPageHead";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata = { title: "Open data" };

const SETS = [
  ["projects", "Projects register", "Capital projects with sponsor, budget, contractor, status and evidence."],
  ["assets", "Public assets inventory", "Health centres, schools, boreholes and markets with location and condition."],
  ["services", "Service directory", "Eligibility, documents, steps, office and turnaround for each service."],
  ["investment", "Investment profile", "Each approved section of the investor profile."],
  ["allocations", "Federation allocations", "Every published FAAC month: gross, deductions and net, with source."],
];

export default async function OpenDataPage({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  return (
    <LgaShell
      lgaId={lga}
      hero={
        <LgaPageHead
          lgaId={lga}
          title="Open data"
          lede="Every approved register has a stable address in JSON and CSV. Reuse it under CC BY 4.0: credit the council and AskLGA, and say if you changed the data."
        />
      }
    >
      <section className="grid gap-3">
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Dataset</th><th>What is in it</th><th>Download</th></tr></thead>
            <tbody>
              {SETS.map(([key, label, desc]) => (
                <tr key={key}>
                  <td><strong>{label}</strong></td>
                  <td style={{ color: "var(--ink-2)" }}>{desc}</td>
                  <td className="whitespace-nowrap">
                    <a href={`/api/${lga}/open/${key}.json`} className="chip" style={{ marginRight: "0.4rem" }}>JSON</a>
                    <a href={`/api/${lga}/open/${key}.csv`} className="chip">CSV</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted measure">Rows are approved records only; drafts are never included. Each record carries its source, approval and last-verified fields. The JSON response includes the licence and when it was generated. Field definitions are in the <Link href="/standard">LGA Record Standard</Link>, and every published dataset is listed in the <a href="/api/catalogue.json">data catalogue</a>.</p>
      </section>

      <section className="grid gap-3 measure" style={{ maxWidth: "48rem" }}>
        <h2 style={{ fontSize: "1.4rem" }}>Put the ask box on your own website</h2>
        <p style={{ color: "var(--ink-2)" }}>A state or council that already has a website can add the same ask box with one line. It loads in a frame, so nothing else on the page changes.</p>
        <pre className="small mono" style={{ background: "var(--band)", color: "#dfe9e2", padding: "1rem 1.1rem", borderRadius: 6, overflowX: "auto" }}>
          {`<script src="${SITE_URL}/widget.js" data-lga="${lga}" async></script>`}
        </pre>
      </section>
    </LgaShell>
  );
}
