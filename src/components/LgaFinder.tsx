"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type FinderRow = { id: string; name: string; state: string; records: number };

/** Type-to-find over all 774 LGAs. The full list is server-rendered below it for search engines and no-JS browsers. */
export function LgaFinder({ rows, placeholder, hint, noMatch, withRecords }: { rows: FinderRow[]; placeholder: string; hint: string; noMatch: string; withRecords: string }) {
  const [q, setQ] = useState("");
  const norm = (v: string) => v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const matches = useMemo(() => {
    const t = norm(q.trim());
    if (t.length < 2) return [];
    return rows.filter((r) => norm(r.name).includes(t) || norm(r.state).includes(t)).slice(0, 12);
  }, [q, rows]);
  return (
    <div className="grid gap-2 measure">
      <label htmlFor="lga-finder" className="font-bold">{hint}</label>
      <input id="lga-finder" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} autoComplete="off" enterKeyHint="search" />
      {q.trim().length >= 2 ? (
        matches.length ? (
          <ul className="register" aria-live="polite">
            {matches.map((r) => (
              <li key={r.id} className="register-row">
                <Link href={`/${r.id}`} className="text-lg">{r.name}</Link>
                <span className="small muted">{r.state}{r.records > 0 ? ` · ${withRecords}` : ""}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="small muted" aria-live="polite">{noMatch}</p>
        )
      ) : null}
    </div>
  );
}
