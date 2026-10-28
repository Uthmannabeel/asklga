import { Field, Select, SourceFields } from "@/components/Field";
import { listOfficials } from "@/lib/participation";
import { saveOfficial } from "@/app/admin/actions";
import { ROLE_LABEL } from "@/lib/officials";

export const dynamic = "force-dynamic";

export default async function AdminOfficials({ params, searchParams }: { params: Promise<{ lga: string }>; searchParams: Promise<{ edit?: string }> }) {
  const { lga } = await params;
  const { edit } = await searchParams;
  const rows = await listOfficials(lga, false);
  const o = edit ? rows.find((x) => String(x.id) === edit) ?? null : null;
  return (
    <>
      <section className="grid gap-3">
        <h1>Officials</h1>
        <p className="measure small">Who holds office at the council: chairman, vice chairman, leader of the legislative council, secretary, head of administration, treasurer and councillors by ward. Each name carries the source it was taken from and the date it was last confirmed. Approved entries show on the council&apos;s public page; the chairman&apos;s name shows in the national directory.</p>
        <table>
          <thead><tr><th>Role</th><th>Name</th><th>Ward</th><th>Since</th><th>Until</th><th>Approval</th><th></th></tr></thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.id}>
                <td>{ROLE_LABEL[x.role]}</td>
                <td>{x.title ? `${x.title} ` : ""}{x.name}</td>
                <td>{x.ward ?? ""}</td>
                <td>{x.since ?? ""}</td>
                <td>{x.until ?? ""}</td>
                <td>{x.approval}</td>
                <td><a href={`/admin/${lga}/officials?edit=${x.id}#form`}>Edit</a></td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="muted">No officials on file.</p> : null}
      </section>
      <section id="form" className="grid gap-3">
        <h2>{o ? `Edit ${o.name}` : "Add an official"}</h2>
        <form action={saveOfficial} className="grid gap-3">
          <input type="hidden" name="lgaId" value={lga} />
          {o ? <input type="hidden" name="id" value={o.id} /> : null}
          <div className="grid gap-3 md:grid-cols-2">
            <Select label="Role" name="role" value={o?.role} options={Object.entries(ROLE_LABEL) as [string, string][]} />
            <Field label="Name" name="name" value={o?.name} required />
            <Field label="Title as styled locally" name="title" value={o?.title} placeholder="Executive Chairman, Rt. Hon., Hon. Dr." />
            <Field label="Ward (councillors)" name="ward" value={o?.ward} />
            <Field label="In office since" name="since" value={o?.since} type="date" />
            <Field label="Left office" name="until" value={o?.until} type="date" hint="Leave blank while in office." />
            <Field label="Order within role" name="ord" value={o?.ord} type="number" />
          </div>
          <SourceFields source={o?.source} sourceUrl={o?.sourceUrl} approval={o?.approval} lastVerified={o?.lastVerified} />
          <div><button type="submit" className="btn">{o ? "Save changes" : "Add official"}</button></div>
        </form>
      </section>
    </>
  );
}
