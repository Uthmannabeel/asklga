"use client";

import { useState } from "react";

export function ReportForm({ projectId }: { projectId: string }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, note: fd.get("note"), imageUrl: fd.get("imageUrl") || undefined }),
    });
    if (res.ok) {
      setDone(true);
      form.reset();
    } else {
      setError("The report was not sent. Try again.");
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-2 measure">
      <h2>Seen this project?</h2>
      <p className="small">Tell the LGA what you saw on the site. Reports are checked by the data owner before they appear as evidence. Do not include your name or phone number here.</p>
      <label htmlFor={`note-${projectId}`} className="small">What did you see, and when?</label>
      <textarea id={`note-${projectId}`} name="note" rows={3} required maxLength={600} />
      <label htmlFor={`img-${projectId}`} className="small">Link to a photo (optional)</label>
      <input id={`img-${projectId}`} name="imageUrl" type="url" placeholder="https://" />
      <div>
        <button type="submit" className="btn btn-sm">Send report</button>
      </div>
      {done ? <p className="small">Report sent. It will show here once the LGA has checked it.</p> : null}
      {error ? <p className="small" style={{ color: "var(--danger)" }}>{error}</p> : null}
    </form>
  );
}
