"use client";

import { useState } from "react";
import { FUNCTIONS, type FnKey } from "@/lib/functions";

/** Files a problem report against one of the council's constitutional functions. No account; no name or phone asked. */
export function IssueForm({ lgaId, lgaName, wards }: { lgaId: string; lgaName: string; wards: string[] }) {
  const [fn, setFn] = useState<FnKey | "">("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ id: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const chosen = FUNCTIONS.find((f) => f.key === fn);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      lgaId,
      fn: fd.get("fn"),
      title: fd.get("title"),
      detail: fd.get("detail"),
      ward: fd.get("ward") || undefined,
      place: fd.get("place") || undefined,
      photoUrl: fd.get("photoUrl") || undefined,
    };
    try {
      const res = await fetch("/api/issue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as { id?: string; url?: string; error?: string };
      if (res.ok && data.id && data.url) {
        setDone({ id: data.id, url: data.url });
        e.currentTarget?.reset?.();
      } else {
        setError(data.error ?? (res.status === 429 ? "You have filed several reports in a short time. Wait a few minutes and try again." : "The report was not filed. Try again."));
      }
    } catch {
      setError("No connection. The report was not filed.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="grid gap-3" role="status">
        <p className="font-bold">Filed. Your report number is <span className="mono">{done.id}</span>.</p>
        <p style={{ color: "var(--ink-2)" }}>It is on the public register now. Every change of status will show on its page, with the date and who made it.</p>
        <p><a href={done.url} className="btn btn-sm">Open the report</a></p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4" aria-busy={busy}>
      <div className="grid gap-1">
        <label htmlFor="iss-fn" className="font-bold">Which council function is this about?</label>
        <select id="iss-fn" name="fn" required value={fn} onChange={(e) => setFn(e.target.value as FnKey | "")}>
          <option value="">Choose one</option>
          {FUNCTIONS.map((f) => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </select>
        {chosen ? (
          <div className="small grid gap-1" style={{ color: "var(--ink-2)" }}>
            <span>For example: {chosen.examples.join("; ")}. <span className="muted">({chosen.ref})</span></span>
            {chosen.notCouncil ? <span><strong>Not the council:</strong> {chosen.notCouncil}</span> : null}
          </div>
        ) : (
          <span className="small muted">The Constitution gives councils nine jobs. Picking the right one sends the report to the right desk.</span>
        )}
      </div>
      <div className="grid gap-1">
        <label htmlFor="iss-title" className="font-bold">The problem, in one line</label>
        <input id="iss-title" name="title" required minLength={8} maxLength={120} placeholder="e.g. Drain on Rumuola Road blocked since August" />
      </div>
      <div className="grid gap-1">
        <label htmlFor="iss-detail" className="font-bold">What is wrong, where, and since when</label>
        <textarea id="iss-detail" name="detail" required minLength={20} maxLength={1200} rows={4} />
        <span className="small muted">Do not include your name, phone number or anyone else&apos;s. Personal details are removed before the report is saved.</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-1">
          <label htmlFor="iss-ward" className="small">Ward (optional)</label>
          <input id="iss-ward" name="ward" maxLength={80} list={wards.length ? "iss-wards" : undefined} />
          {wards.length ? <datalist id="iss-wards">{wards.map((w) => <option key={w} value={w} />)}</datalist> : null}
        </div>
        <div className="grid gap-1">
          <label htmlFor="iss-place" className="small">Street or landmark (optional)</label>
          <input id="iss-place" name="place" maxLength={160} />
        </div>
      </div>
      <div className="grid gap-1">
        <label htmlFor="iss-photo" className="small">Link to a photo or video (optional)</label>
        <input id="iss-photo" name="photoUrl" type="url" placeholder="https://" />
        <span className="small muted">A link to a photo you have put on Google Photos, Drive, Imgur or similar. Files are not uploaded here.</span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn" disabled={busy}>{busy ? "Filing" : `File the report with ${lgaName}`}</button>
        <span className="small muted">Public at once. No account needed.</span>
      </div>
      {error ? <p className="small" role="alert" style={{ color: "var(--danger)" }}>{error}</p> : null}
    </form>
  );
}
