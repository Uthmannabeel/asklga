"use client";

import { useState } from "react";

export function EnquiryForm({ lgaId }: { lgaId: string }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/enquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lgaId, organisation: fd.get("organisation"), sector: fd.get("sector"), summary: fd.get("summary"), contact: fd.get("contact") }),
    });
    if (res.ok) setDone(true);
    else setError("The enquiry was not sent. Try again.");
  }

  if (done) return <p className="measure">Enquiry received. The Planning unit will reply with the approvals and contacts that apply.</p>;

  return (
    <form onSubmit={submit} className="grid gap-2 measure">
      <h2>Send an investor enquiry</h2>
      <p className="small">The Planning unit routes your enquiry to the right LGA or state office and replies within the time stated in the service directory. Your contact details are stored for that reply only.</p>
      <label htmlFor="enq-org" className="small">Organisation (optional)</label>
      <input id="enq-org" name="organisation" maxLength={120} />
      <label htmlFor="enq-sector" className="small">Sector</label>
      <input id="enq-sector" name="sector" required maxLength={80} placeholder="Agro-processing, housing, logistics, retail, health, education..." />
      <label htmlFor="enq-summary" className="small">What you are proposing and where</label>
      <textarea id="enq-summary" name="summary" required rows={4} maxLength={1500} />
      <label htmlFor="enq-contact" className="small">Email or phone for the reply</label>
      <input id="enq-contact" name="contact" required maxLength={120} />
      <div><button type="submit" className="btn">Send enquiry</button></div>
      {error ? <p className="small" style={{ color: "var(--danger)" }}>{error}</p> : null}
    </form>
  );
}
