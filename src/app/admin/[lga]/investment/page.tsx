import { Area, Field, SourceFields } from "@/components/Field";
import { listProfile } from "@/lib/queries";
import { saveProfileSection } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminInvestment({ params, searchParams }: { params: Promise<{ lga: string }>; searchParams: Promise<{ edit?: string }> }) {
  const { lga } = await params;
  const { edit } = await searchParams;
  const sections = await listProfile(lga, false);
  const sec = edit ? sections.find((x) => x.id === edit) ?? null : null;
  return (
    <>
      <section className="grid gap-3">
        <h1>Investment profile</h1>
        <p className="measure small">Seven sections are expected: location, land, markets, infrastructure, approvals, incentives, contacts. Every claim should trace to the state investment agency, a ministry or the LGA planning office.</p>
        <table>
          <thead><tr><th>Order</th><th>Section</th><th>Title</th><th>Approval</th><th>Verified</th><th></th></tr></thead>
          <tbody>
            {sections.map((x) => (
              <tr key={x.id}>
                <td>{x.ord}</td>
                <td className="muted">{x.section}</td>
                <td>{x.title}</td>
                <td>{x.approval}</td>
                <td>{x.lastVerified ?? "never"}</td>
                <td><a href={`/admin/${lga}/investment?edit=${x.id}#form`}>Edit</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section id="form" className="grid gap-3">
        <h2>{sec ? `Edit ${sec.title}` : "Add a section"}</h2>
        <form action={saveProfileSection} className="grid gap-3">
          <input type="hidden" name="lgaId" value={lga} />
          {sec ? <input type="hidden" name="id" value={sec.id} /> : null}
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Section key" name="section" value={sec?.section} required placeholder="land" />
            <Field label="Title" name="title" value={sec?.title} required />
            <Field label="Order" name="ord" value={sec?.ord} type="number" />
          </div>
          <Area label="Body" name="body" value={sec?.body} rows={10} required hint="Plain paragraphs separated by a blank line." />
          <SourceFields source={sec?.source} sourceUrl={sec?.sourceUrl} approval={sec?.approval} lastVerified={sec?.lastVerified} />
          <div><button type="submit" className="btn">{sec ? "Save changes" : "Create section"}</button></div>
        </form>
      </section>
    </>
  );
}
