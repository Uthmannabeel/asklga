"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

/** [id, name, state, publishing] kept as tuples so all 774 rows stay small in the page payload. */
export type FinderRow = [string, string, string, 0 | 1];

const norm = (v: string) => v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/** Type-to-find over all 774 LGAs. Enter opens the best match. Without JavaScript the map below lists every LGA. */
export function LgaFinder({ rows, label }: { rows: FinderRow[]; label: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const matches = useMemo(() => {
    const t = norm(q);
    if (t.length < 2) return [];
    const scored = rows
      .map((r) => {
        const n = norm(r[1]);
        const s = norm(r[2]);
        const score = n.startsWith(t) ? 0 : n.includes(t) ? 1 : s.startsWith(t) ? 2 : s.includes(t) ? 3 : -1;
        return { r, score };
      })
      .filter((x) => x.score >= 0)
      .sort((a, b) => a.score - b.score || b.r[3] - a.r[3] || a.r[1].localeCompare(b.r[1]));
    return scored.slice(0, 8).map((x) => x.r);
  }, [q, rows]);
  const open = q.trim().length >= 2;

  return (
    <form
      role="search"
      className="grid gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (matches[0]) router.push(`/${matches[0][0]}`);
      }}
    >
      <label htmlFor="lga-finder" className="font-bold text-lg">{label}</label>
      <div className="relative">
        <svg className="finder-icon" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="6" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m13 13 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        <input
          id="lga-finder"
          className="finder-input"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. Obio/Akpor, Kano Municipal, Ikeja"
          autoComplete="off"
          enterKeyHint="go"
          aria-describedby="lga-finder-status"
          aria-controls="lga-finder-results"
        />
      </div>
      <p id="lga-finder-status" className="sr-only" aria-live="polite">
        {open ? (matches.length ? `${matches.length} matches. Press Enter to open ${matches[0][1]}.` : "No matches.") : ""}
      </p>
      {open ? (
        matches.length ? (
          <ul id="lga-finder-results" className="finder-results">
            {matches.map((r) => (
              <li key={r[0]}>
                <Link href={`/${r[0]}`}>
                  <span className="font-bold">{r[1]}</span>
                  <span className="small muted text-right">
                    {r[2] === "Federal Capital Territory" ? "FCT" : `${r[2]} State`}
                    {r[3] ? <><span aria-hidden="true"> · </span><span style={{ color: "var(--civic)" }}>publishing</span></> : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p id="lga-finder-results" className="finder-results px-4 py-3 small">No local government area matches that. Check the spelling, or pick your state on the map below.</p>
        )
      ) : null}
    </form>
  );
}
