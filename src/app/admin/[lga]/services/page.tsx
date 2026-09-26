import { Area, Field, SourceFields } from "@/components/Field";
import { listServices } from "@/lib/queries";
import { saveService } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminServices({ params, searchParams }: { params: Promise<{ lga: string }>; searchParams: Promise<{ edit?: string }> }) {
  const { lga } = await params;
  const { edit } = await searchParams;
  const services = await listServices(lga, false);
  const sv = edit ? services.find((x) => x.id === edit) ?? null : null;
  return (
    <>
      <section className="grid gap-3">
        <h1>Services</h1>
        <table>
          <thead><tr><th>ID</th><th>Service</th><th>Category</th><th>Office</th><th>Approval</th><th></th></tr></thead>
          <tbody>
            {services.map((x) => (
              <tr key={x.id}>
                <td className="muted">{x.id}</td>
                <td>{x.name}</td>
                <td>{x.category}</td>
                <td>{x.office ?? ""}</td>
                <td>{x.approval}</td>
                <td><a href={`/admin/${lga}/services?edit=${x.id}#form`}>Edit</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section id="form" className="grid gap-3">
        <h2>{sv ? `Edit ${sv.id}` : "Add a service"}</h2>
        <form action={saveService} className="grid gap-3">
          <input type="hidden" name="lgaId" value={lga} />
          {sv ? <input type="hidden" name="id" value={sv.id} /> : null}
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Service name" name="name" value={sv?.name} required />
            <Field label="Category" name="category" value={sv?.category} required placeholder="Identity and records, Business, Health..." />
          </div>
          <Area label="What it is" name="summary" value={sv?.summary} rows={2} />
          <Area label="Who can use it" name="eligibility" value={sv?.eligibility} rows={2} />
          <Area label="Documents to bring, one per line" name="documents" value={sv?.documents.join("\n")} rows={4} />
          <Area label="Steps, one per line" name="steps" value={sv?.steps.join("\n")} rows={4} />
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Office" name="office" value={sv?.office} />
            <Field label="Responsible role" name="role" value={sv?.role} />
            <Field label="Contact" name="contact" value={sv?.contact} />
            <Field label="How long it takes" name="turnaround" value={sv?.turnaround} />
          </div>
          <SourceFields source={sv?.source} sourceUrl={sv?.sourceUrl} approval={sv?.approval} lastVerified={sv?.lastVerified} />
          <div><button type="submit" className="btn">{sv ? "Save changes" : "Create service"}</button></div>
        </form>
      </section>
    </>
  );
}
