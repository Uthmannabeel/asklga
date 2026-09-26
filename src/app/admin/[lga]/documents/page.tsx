import { Area, Field, Select } from "@/components/Field";
import { listDocuments } from "@/lib/queries";
import { saveDocument } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

const KINDS: [string, string][] = [["minutes", "Council minutes"], ["budget", "Budget"], ["circular", "Circular"], ["memo", "Memo"], ["project_file", "Project file"], ["notice", "Notice"], ["web", "Web page"]];

export default async function AdminDocuments({ params, searchParams }: { params: Promise<{ lga: string }>; searchParams: Promise<{ edit?: string }> }) {
  const { lga } = await params;
  const { edit } = await searchParams;
  const docs = await listDocuments(lga, "internal", false);
  const today = new Date().toISOString().slice(0, 10);
  const d = edit ? docs.find((x) => x.id === edit) ?? null : null;
  return (
    <>
      <section className="grid gap-3">
        <h1>Document library</h1>
        <p className="measure small">Public documents feed the public answer service. Internal documents are only used in the staff workspace. Documents past their review date are marked and should be re-checked or retired.</p>
        <table>
          <thead><tr><th>ID</th><th>Title</th><th>Kind</th><th>Visibility</th><th>Approval</th><th>Review by</th><th></th></tr></thead>
          <tbody>
            {docs.map((x) => (
              <tr key={x.id}>
                <td className="muted">{x.id}</td>
                <td>{x.title}</td>
                <td>{x.kind}</td>
                <td>{x.visibility}</td>
                <td>{x.approval}</td>
                <td style={x.reviewBy && x.reviewBy < today ? { color: "var(--caution)" } : undefined}>{x.reviewBy ?? ""}{x.reviewBy && x.reviewBy < today ? " (past due)" : ""}</td>
                <td><a href={`/admin/${lga}/documents?edit=${x.id}#form`}>Edit</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section id="form" className="grid gap-3">
        <h2>{d ? `Edit ${d.id}` : "Add a document"}</h2>
        <form action={saveDocument} className="grid gap-3">
          <input type="hidden" name="lgaId" value={lga} />
          {d ? <input type="hidden" name="id" value={d.id} /> : null}
          <Field label="Title" name="title" value={d?.title} required />
          <div className="grid gap-3 md:grid-cols-3">
            <Select label="Kind" name="kind" value={d?.kind} options={KINDS} />
            <Select label="Visibility" name="visibility" value={d?.visibility} options={[["public", "Public"], ["internal", "Internal (staff only)"]]} />
            <Select label="Approval" name="approval" value={d?.approval ?? "draft"} options={[["draft", "Draft"], ["approved", "Approved"]]} />
          </div>
          <Area label="Text" name="body" value={d?.body} rows={14} required hint="Paste the document text. It is split into passages for search; paragraph breaks help." />
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Source" name="source" value={d?.source} required />
            <Field label="Source link" name="sourceUrl" value={d?.sourceUrl} type="url" />
            <Field label="Review by" name="reviewBy" value={d?.reviewBy} type="date" hint="After this date the document is flagged as due for review." />
          </div>
          <div><button type="submit" className="btn">{d ? "Save changes" : "Add document"}</button></div>
        </form>
      </section>
    </>
  );
}
