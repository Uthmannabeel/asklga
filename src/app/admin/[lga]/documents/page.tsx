import { Area, Field, Select } from "@/components/Field";
import { listDocuments } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import { importDocumentFromUrl, refetchDocument, saveDocument } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

const KINDS: [string, string][] = [["minutes", "Council minutes"], ["budget", "Budget"], ["circular", "Circular"], ["memo", "Memo"], ["project_file", "Project file"], ["notice", "Notice"], ["web", "Web page"]];

export default async function AdminDocuments({ params, searchParams }: { params: Promise<{ lga: string }>; searchParams: Promise<{ edit?: string; error?: string; ok?: string }> }) {
  const { lga } = await params;
  const { edit, error, ok } = await searchParams;
  const docs = await listDocuments(lga, "internal", false);
  const today = new Date().toISOString().slice(0, 10);
  const d = edit ? docs.find((x) => x.id === edit) ?? null : null;
  return (
    <>
      <section className="grid gap-3">
        <h1>Document library</h1>
        <p className="measure small">Public documents feed the public answer service. Internal documents are only used in the staff workspace. Documents past their review date are marked and should be re-checked or retired. Documents imported from a web address can be re-fetched; if the page changed, the document goes back to draft for re-approval.</p>
        {error ? <p className="small" role="alert" style={{ color: "var(--danger)" }}>{decodeURIComponent(error)}</p> : null}
        {ok === "imported" ? <p className="small" role="status">Imported as a draft. Check the text below, set the kind and review date, then approve it.</p> : null}
        {ok === "unchanged" ? <p className="small" role="status">Re-fetched: the source has not changed.</p> : null}
        {ok === "changed" ? <p className="small" role="status">The source changed. The new text is saved as a draft; review it and approve again.</p> : null}
        <div className="table-scroll">
          <table>
            <thead><tr><th>ID</th><th>Title</th><th>Kind</th><th>Visibility</th><th>Approval</th><th>Review by</th><th>Source</th><th></th></tr></thead>
            <tbody>
              {docs.map((x) => (
                <tr key={x.id}>
                  <td className="muted">{x.id}</td>
                  <td>{x.title}</td>
                  <td>{x.kind}</td>
                  <td>{x.visibility}</td>
                  <td>{x.approval}</td>
                  <td style={x.reviewBy && x.reviewBy < today ? { color: "var(--caution)" } : undefined}>{x.reviewBy ? formatDate(x.reviewBy) : ""}{x.reviewBy && x.reviewBy < today ? " (past due)" : ""}</td>
                  <td className="small muted">{x.fetchedAt ? `Fetched ${formatDate(x.fetchedAt)}${x.fetchNote ? `; ${x.fetchNote}` : ""}` : x.sourceUrl ? "Link on file" : ""}</td>
                  <td className="flex gap-2 items-center">
                    <a href={`/admin/${lga}/documents?edit=${x.id}#form`}>Edit</a>
                    {x.sourceUrl ? (
                      <form action={refetchDocument}>
                        <input type="hidden" name="id" value={x.id} />
                        <input type="hidden" name="lgaId" value={lga} />
                        <button type="submit" className="btn btn-quiet btn-sm">Re-fetch</button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-3">
        <h2>Import from a web address</h2>
        <p className="measure small">Pulls the readable text of a published page (a state budget page, a Tracka project page, a gazette notice) into a draft document with the address as its source. Web pages only for now; for a PDF, paste the text into the form below.</p>
        <form action={importDocumentFromUrl} className="grid gap-3 max-w-2xl">
          <input type="hidden" name="lgaId" value={lga} />
          <Field label="Web address" name="url" type="url" required placeholder="https://" />
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Title (optional, taken from the page if blank)" name="title" />
            <Select label="Kind" name="kind" value="web" options={KINDS} />
            <Select label="Visibility" name="visibility" value="public" options={[["public", "Public"], ["internal", "Internal (staff only)"]]} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Source label (optional)" name="source" placeholder="e.g. Rivers State 2026 budget, Ministry of Finance" />
            <Field label="Review by" name="reviewBy" type="date" hint="After this date the document is flagged as due for review." />
          </div>
          <div><button type="submit" className="btn">Import as draft</button></div>
        </form>
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
