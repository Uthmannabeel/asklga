import { Area, Field, Select, SourceFields } from "@/components/Field";
import { listAssets } from "@/lib/queries";
import { saveAsset } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

const TYPES: [string, string][] = [["health", "Health centre"], ["school", "School"], ["water", "Water point"], ["market", "Market or park"], ["road", "Road"], ["power", "Power"], ["other", "Other"]];
const COND: [string, string][] = [["good", "Good"], ["fair", "Fair"], ["poor", "Poor"], ["unknown", "Unknown"]];

export default async function AdminAssets({ params, searchParams }: { params: Promise<{ lga: string }>; searchParams: Promise<{ edit?: string }> }) {
  const { lga } = await params;
  const { edit } = await searchParams;
  const assets = await listAssets(lga, false);
  const a = edit ? assets.find((x) => x.id === edit) ?? null : null;
  return (
    <>
      <section className="grid gap-3">
        <h1>Public assets</h1>
        <table>
          <thead><tr><th>ID</th><th>Asset</th><th>Condition</th><th>Inspected</th><th>Approval</th><th></th></tr></thead>
          <tbody>
            {assets.map((x) => (
              <tr key={x.id}>
                <td className="muted">{x.id}</td>
                <td>{x.name}</td>
                <td>{x.condition ?? "unknown"}</td>
                <td>{x.lastInspected ?? "never"}</td>
                <td>{x.approval}</td>
                <td><a href={`/admin/${lga}/assets?edit=${x.id}#form`}>Edit</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section id="form" className="grid gap-3">
        <h2>{a ? `Edit ${a.id}` : "Add an asset"}</h2>
        <form action={saveAsset} className="grid gap-3">
          <input type="hidden" name="lgaId" value={lga} />
          {a ? <input type="hidden" name="id" value={a.id} /> : null}
          <Field label="Asset name" name="name" value={a?.name} required />
          <div className="grid gap-3 md:grid-cols-3">
            <Select label="Type" name="type" value={a?.type} options={TYPES} />
            <Select label="Condition" name="condition" value={a?.condition ?? "unknown"} options={COND} />
            <Field label="Last inspected" name="lastInspected" value={a?.lastInspected} type="date" />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Ward" name="ward" value={a?.ward} />
            <Field label="Latitude" name="lat" value={a?.lat} type="number" />
            <Field label="Longitude" name="lng" value={a?.lng} type="number" />
          </div>
          <Area label="Notes" name="notes" value={a?.notes} rows={2} />
          <SourceFields source={a?.source} sourceUrl={a?.sourceUrl} approval={a?.approval} lastVerified={a?.lastVerified} />
          <div><button type="submit" className="btn">{a ? "Save changes" : "Create asset"}</button></div>
        </form>
      </section>
    </>
  );
}
