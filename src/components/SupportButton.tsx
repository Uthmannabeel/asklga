"use client";

import { useEffect, useState } from "react";

/** "This affects me too." One press per browser per issue, remembered locally. */
export function SupportButton({ id, initial }: { id: string; initial: number }) {
  const [n, setN] = useState(initial);
  const [pressed, setPressed] = useState(false);
  const [busy, setBusy] = useState(false);
  const key = `asklga_support_${id}`;

  useEffect(() => {
    try {
      if (localStorage.getItem(key)) setPressed(true);
    } catch {}
  }, [key]);

  async function press() {
    if (pressed || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/issue?support=1", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const data = (await res.json().catch(() => ({}))) as { supports?: number };
      if (res.ok && typeof data.supports === "number") {
        setN(data.supports);
        setPressed(true);
        try { localStorage.setItem(key, "1"); } catch {}
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className="btn btn-quiet btn-sm" onClick={press} aria-pressed={pressed} disabled={busy}>
      {pressed ? "You said this affects you too" : "This affects me too"}
      <span className="mono" aria-label={`${n} residents`}> {n}</span>
    </button>
  );
}
