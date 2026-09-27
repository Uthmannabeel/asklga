import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata = { title: "The LGA Record Standard" };

const COMMON = [
  ["id", "string", "Stable public identifier: LGA code, record kind, running number, e.g. OBA-P-0003."],
  ["lgaId", "string", "The LGA's slug on the national directory."],
  ["source", "string", "Where the record came from: the budget, notice, minutes or site visit."],
  ["sourceUrl", "string, optional", "Link to the published source."],
  ["approval", "draft | approved", "Only approved records are public and used in answers."],
  ["lastVerified", "date, optional", "The date the LGA data owner last confirmed the record."],
  ["updatedAt", "timestamp", "Last change."],
];

const SETS: { name: string; key: string; purpose: string; fields: string[][] }[] = [
  {
    name: "Projects register",
    key: "projects",
    purpose: "Every capital project the LGA has approved for publication: who pays, what was budgeted, what stands on the ground, when it was last checked.",
    fields: [
      ["name", "string", "Project name as budgeted."],
      ["type", "road | health | education | water | market | drainage | power | building | other", "Kind of project."],
      ["ward", "string, optional", "Ward or community."],
      ["lat, lng", "number, optional", "Location in decimal degrees (WGS 84)."],
      ["sponsor", "LGA | State | Federal | NDDC | Constituency | Donor | Other", "Who funds it."],
      ["budgetYear, budgetLine", "integer, string, optional", "Budget year and line item."],
      ["amountNgn", "integer, optional", "Budgeted amount in naira, whole number."],
      ["contractor", "string, optional", "Contractor as published, or 'Not published'."],
      ["startDate, expectedCompletion", "YYYY-MM, optional", "Planned dates."],
      ["status", "planned | ongoing | completed | stalled | abandoned | unknown", "Current status; every change is logged with who and when."],
      ["statusNote", "string, optional", "What was seen at the last check."],
      ["evidence", "array of {url, caption, date}", "Site evidence, moderated before publication."],
    ],
  },
  {
    name: "Public assets inventory",
    key: "assets",
    purpose: "Health centres, schools, boreholes, markets and other assets the LGA maintains, with their condition at the last inspection.",
    fields: [
      ["name", "string", "Asset name."],
      ["type", "health | school | water | market | road | power | other", "Kind of asset."],
      ["ward", "string, optional", "Ward."],
      ["lat, lng", "number, optional", "Location."],
      ["condition", "good | fair | poor | unknown", "Condition at last inspection."],
      ["lastInspected", "date, optional", "Date of last inspection."],
      ["notes", "string, optional", "What was found."],
    ],
  },
  {
    name: "Service directory",
    key: "services",
    purpose: "What the LGA does for residents and businesses, with the steps, the documents to bring, the office and who is responsible.",
    fields: [
      ["name", "string", "Service name."],
      ["category", "string", "Grouping, e.g. Identity and records, Business, Health."],
      ["summary, eligibility", "string, optional", "What it is and who can use it."],
      ["documents", "array of string", "What to bring."],
      ["steps", "array of string", "Steps in order."],
      ["office, role, contact", "string, optional", "Where to go, who is responsible, how to reach them. No personal phone numbers."],
      ["turnaround", "string, optional", "How long it takes, in words."],
    ],
  },
  {
    name: "Investment profile",
    key: "investment",
    purpose: "What an investor needs before a first visit: location, land, markets, infrastructure, approvals, incentives, contacts.",
    fields: [
      ["section", "location | land | markets | infrastructure | approvals | incentives | contacts", "Section key."],
      ["title, body", "string", "Heading and plain-language text."],
      ["ord", "integer", "Display order."],
    ],
  },
  {
    name: "Document library",
    key: "documents",
    purpose: "Budgets, minutes, notices and other documents approved for publication, split into passages for search and quotation.",
    fields: [
      ["title", "string", "Document title."],
      ["kind", "minutes | budget | circular | memo | project_file | notice | web", "Kind of document."],
      ["visibility", "public | internal", "Internal documents never leave the LGA's server."],
      ["body", "string", "Plain text."],
      ["reviewBy", "date, optional", "After this date the document counts as due for review."],
      ["fetchedAt, contentHash", "timestamp, string, optional", "For documents imported from a web address: when, and a hash to detect change."],
    ],
  },
];

export default function StandardPage() {
  return (
    <>
      <SiteHeader back="/standard" />
      <main id="main" className="wrap py-12 grid gap-8">
        <section className="measure grid gap-3">
          <h1>The LGA Record Standard</h1>
          <p className="text-lg">One way for every local government in Nigeria to publish what it does, what it built, what it owns and what it received, so that residents, journalists, investors and other platforms can read it, reuse it and check it.</p>
          <p>Version 1, September 2026. Open for comment. Reference implementation: this portal. Machine-readable schemas: <Link href="/api/standard/projects.schema.json">projects</Link>, <Link href="/api/standard/assets.schema.json">assets</Link>, <Link href="/api/standard/services.schema.json">services</Link>, <Link href="/api/standard/investment.schema.json">investment</Link>, <Link href="/api/standard/documents.schema.json">documents</Link>, <Link href="/api/standard/allocations.schema.json">allocations</Link>. Catalogue of everything published: <Link href="/api/catalogue.json">catalogue.json</Link> (DCAT).</p>
        </section>

        <section className="measure grid gap-3">
          <h2>Five rules</h2>
          <ol className="list-decimal pl-5 grid gap-2">
            <li><strong>Every record has a source.</strong> The budget line, the council minute, the notice or the site visit it came from, with a link where one exists.</li>
            <li><strong>Every record is approved by a named data owner before it is public.</strong> Drafts are never shown and never used in answers.</li>
            <li><strong>Every record says when it was last confirmed.</strong> A record without a date is shown as not yet verified, never hidden.</li>
            <li><strong>Every record has a stable public address</strong>, in JSON and CSV, under an open licence (CC BY 4.0), so other platforms can build on it rather than around it.</li>
            <li><strong>Nothing personal.</strong> Records name offices and roles, not private individuals. Residents&apos; questions are stored without personal details.</li>
          </ol>
        </section>

        <section className="grid gap-3">
          <h2>Fields on every record</h2>
          <div className="table-scroll"><table className="max-w-3xl"><thead><tr><th>Field</th><th>Type</th><th>Meaning</th></tr></thead><tbody>{COMMON.map(([f, ty, m]) => <tr key={f}><td><code>{f}</code></td><td>{ty}</td><td>{m}</td></tr>)}</tbody></table></div>
        </section>

        {SETS.map((set) => (
          <section key={set.key} id={set.key} className="grid gap-3">
            <h2>{set.name}</h2>
            <p className="measure">{set.purpose}</p>
            <div className="table-scroll"><table className="max-w-3xl"><thead><tr><th>Field</th><th>Type</th><th>Meaning</th></tr></thead><tbody>{set.fields.map(([f, ty, m]) => <tr key={f}><td><code>{f}</code></td><td>{ty}</td><td>{m}</td></tr>)}</tbody></table></div>
          </section>
        ))}

        <section id="allocations" className="grid gap-3">
          <h2>Federation allocations</h2>
          <p className="measure">One row per LGA per month from the published Federation Account tables. The portal publishes what was published; it never computes or adjusts a figure.</p>
          <div className="table-scroll"><table className="max-w-3xl"><thead><tr><th>Field</th><th>Type</th><th>Meaning</th></tr></thead><tbody>
            <tr><td><code>lgaId</code></td><td>string</td><td>The LGA&apos;s slug on the national directory.</td></tr>
            <tr><td><code>period</code></td><td>YYYY-MM</td><td>The month the allocation is for.</td></tr>
            <tr><td><code>grossNgn</code></td><td>integer, optional</td><td>The LGA&apos;s share before deductions, in naira.</td></tr>
            <tr><td><code>netNgn</code></td><td>integer, optional</td><td>The amount paid after statutory deductions, in naira.</td></tr>
            <tr><td><code>source, sourceUrl</code></td><td>string</td><td>The published table the row was taken from.</td></tr>
          </tbody></table></div>
        </section>

        <section className="measure grid gap-2">
          <h2>How to adopt it</h2>
          <p>An LGA adopts the standard by publishing its registers in this shape, on this portal or on its own site, with the JSON and CSV addresses above. A state adopts it by asking its LGAs to do so and by embedding the ask box on the state website. A civic platform adopts it by reading the catalogue. Comments and proposed changes go through the project&apos;s public repository.</p>
          <p className="small muted"><Link href="/">Back to the directory</Link></p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
