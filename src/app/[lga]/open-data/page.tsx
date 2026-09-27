import { LgaShell } from "@/components/LgaShell";

export const dynamic = "force-dynamic";
export const metadata = { title: "Open data" };

export default async function OpenDataPage({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  const sets = [
    ["projects", "Projects register"],
    ["assets", "Public assets inventory"],
    ["services", "Service directory"],
    ["investment", "Investment profile"],
    ["allocations", "Federation allocations by month"],
  ];
  return (
    <LgaShell lgaId={lga}>
      <section className="grid gap-2 measure">
        <h1>Open data</h1>
        <p>Every approved register is downloadable and has a stable address. Journalists, researchers and other civic platforms may reuse it under the <a href="https://creativecommons.org/licenses/by/4.0/" rel="noopener">Creative Commons Attribution 4.0 licence (CC BY 4.0)</a>: credit the LGA and this portal, and say if you changed the data.</p>
        <p className="small muted">Each dataset carries its source, approval and last-verified fields per record. The JSON response includes the licence text and the generation time. Rows are approved records only; draft records are never included.</p>
      </section>
      <table className="max-w-2xl">
        <thead><tr><th>Dataset</th><th>JSON</th><th>CSV</th></tr></thead>
        <tbody>
          {sets.map(([key, label]) => (
            <tr key={key}>
              <td>{label}</td>
              <td><a href={`/api/${lga}/open/${key}.json`}>{key}.json</a></td>
              <td><a href={`/api/${lga}/open/${key}.csv`}>{key}.csv</a></td>
            </tr>
          ))}
        </tbody>
      </table>
      <section className="grid gap-2 measure">
        <h2>Put the ask box on your own website</h2>
        <p>States and LGAs that already have a website can add the same ask box with one line. It loads in a frame, so nothing else on the page changes.</p>
        <pre className="small" style={{ background: "var(--field)", padding: "0.75rem", borderRadius: 2, overflowX: "auto" }}>
          {`<script src="${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/widget.js" data-lga="${lga}" async></script>`}
        </pre>
      </section>
    </LgaShell>
  );
}
