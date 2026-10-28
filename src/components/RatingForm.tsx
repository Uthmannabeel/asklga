"use client";

import { useState } from "react";
import { FUNCTIONS } from "@/lib/functions";

const SCALE = [
  [1, "Very poor"],
  [2, "Poor"],
  [3, "Fair"],
  [4, "Good"],
  [5, "Very good"],
] as const;

/** Scores the council on the nine Fourth Schedule functions, 1 to 5, any subset of at least three. */
export function RatingForm({ lgaId, lgaName, month, minFunctions, minRaters }: { lgaId: string; lgaName: string; month: string; minFunctions: number; minRaters: number }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ raters: number; published: boolean; needed: number; replaced: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const scores: Record<string, string> = {};
    for (const f of FUNCTIONS) {
      const v = fd.get(`s-${f.key}`);
      if (typeof v === "string" && v) scores[f.key] = v;
    }
    try {
      const res = await fetch("/api/rating", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lgaId, scores, email: fd.get("email"), comment: fd.get("comment") || undefined }) });
      const data = (await res.json().catch(() => ({}))) as { raters?: number; published?: boolean; needed?: number; replaced?: boolean; error?: string };
      if (res.ok && typeof data.raters === "number") setDone({ raters: data.raters, published: Boolean(data.published), needed: data.needed ?? 0, replaced: Boolean(data.replaced) });
      else setError(data.error ?? (res.status === 429 ? "Several scores came from this connection in the last hour. Try again later." : "The score was not saved. Try again."));
    } catch {
      setError("No connection. The score was not saved.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="grid gap-2" role="status">
        <p className="font-bold">{done.replaced ? "Your score for this month was updated." : "Your score is in."}</p>
        <p style={{ color: "var(--ink-2)" }}>
          {done.published
            ? `${done.raters} residents have scored ${lgaName} in the last three months, so its report card is published.`
            : `${done.raters} of the ${minRaters} residents needed have scored ${lgaName} in the last three months. The card is published at ${minRaters}, so no single score can stand for the whole council.`}
        </p>
        <p className="small"><a href={`/${lgaId}/report-card`}>Reload the report card</a></p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-5" aria-busy={busy}>
      <p className="small" style={{ color: "var(--ink-2)" }}>Score only the functions you have seen for yourself this year. Skip the rest. At least {minFunctions} are needed. One score per email address per month, for {month}.</p>
      <div className="grid gap-0 rating-grid" role="group" aria-label="Scores by council function">
        {FUNCTIONS.map((f) => (
          <fieldset key={f.key} className="rating-row">
            <legend className="font-bold">{f.label} <span className="small muted" style={{ fontWeight: 400 }}>{f.ref}</span></legend>
            <div className="rating-scale">
              <label><input type="radio" name={`s-${f.key}`} value="" defaultChecked /> <span>Skip</span></label>
              {SCALE.map(([v, l]) => (
                <label key={v} title={l}><input type="radio" name={`s-${f.key}`} value={v} /> <span>{v}</span><span className="sr-only"> {l}</span></label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <p className="small muted">1 very poor, 2 poor, 3 fair, 4 good, 5 very good.</p>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-1">
          <label htmlFor="rt-email" className="font-bold">Email address</label>
          <input id="rt-email" name="email" type="email" required autoComplete="email" />
          <span className="small muted">Kept only as a one-way hash, so the same address cannot score twice in a month. Never shown, never emailed.</span>
        </div>
        <div className="grid gap-1">
          <label htmlFor="rt-comment" className="small">One thing the council should fix first (optional, staff only)</label>
          <textarea id="rt-comment" name="comment" rows={3} maxLength={300} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn" disabled={busy}>{busy ? "Saving" : `Score ${lgaName}`}</button>
      </div>
      {error ? <p className="small" role="alert" style={{ color: "var(--danger)" }}>{error}</p> : null}
    </form>
  );
}
