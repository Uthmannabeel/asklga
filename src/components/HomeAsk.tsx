"use client";

import { useMemo, useRef, useState } from "react";
import { AskBox } from "./AskBox";
import type { FinderRow } from "./LgaFinder";
import type { Dict, UiLang } from "@/lib/i18n";

const norm = (v: string) => v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const where = (state: string) => (state === "Federal Capital Territory" ? "FCT" : `${state} State`);

/**
 * The home page's one job: an enquiry slip addressed to a council. "To" picks any of the 774
 * LGAs (the pilot council is preselected because it publishes records); the ask box below it
 * answers on this page, so a resident never has to find the right page first.
 */
export function HomeAsk({ rows, initialId, t, lang, suggestions }: { rows: FinderRow[]; initialId: string; t: Dict; lang: UiLang; suggestions: string[] }) {
  const [id, setId] = useState(initialId);
  const [editing, setEditing] = useState(false);
  const [q, setQ] = useState("");
  const changeRef = useRef<HTMLButtonElement | null>(null);
  const current = rows.find((r) => r[0] === id) ?? rows[0];

  const matches = useMemo(() => {
    const s = norm(q);
    if (s.length < 2) return [] as FinderRow[];
    return rows
      .map((r) => ({ r, score: norm(r[1]).startsWith(s) ? 0 : norm(r[1]).includes(s) ? 1 : norm(r[2]).startsWith(s) ? 2 : -1 }))
      .filter((x) => x.score >= 0)
      .sort((a, b) => a.score - b.score || b.r[3] - a.r[3] || a.r[1].localeCompare(b.r[1]))
      .slice(0, 7)
      .map((x) => x.r);
  }, [q, rows]);

  function pick(r: FinderRow) {
    setId(r[0]);
    setEditing(false);
    setQ("");
    requestAnimationFrame(() => changeRef.current?.focus());
  }

  return (
    <div className="slip">
      <div className="slip-head">
        <span className="slip-k">To</span>
        {editing ? (
          <div className="slip-pick">
            <label htmlFor="slip-lga" className="sr-only">Your local government area</label>
            <input
              id="slip-lga"
              className="slip-input"
              type="search"
              autoFocus
              autoComplete="off"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && matches[0]) { e.preventDefault(); pick(matches[0]); }
                if (e.key === "Escape") setEditing(false);
              }}
              placeholder="Type your local government area"
              aria-controls="slip-results"
            />
            {q.trim().length >= 2 ? (
              matches.length ? (
                <ul id="slip-results" className="finder-results">
                  {matches.map((r) => (
                    <li key={r[0]}>
                      <button type="button" onClick={() => pick(r)}>
                        <span className="font-bold">{r[1]}</span>
                        <span className="small muted text-right">{where(r[2])}{r[3] ? <><span aria-hidden="true"> · </span><span style={{ color: "var(--civic)" }}>publishing</span></> : null}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <p id="slip-results" className="finder-results px-4 py-3 small">No local government area matches that.</p>
            ) : null}
            <button type="button" className="slip-change" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        ) : (
          <div className="slip-to">
            <span className="slip-name">{current[1]} Local Government</span>
            <span className="slip-where">{where(current[2])}{current[3] ? "" : ", not yet publishing"}</span>
            <button type="button" ref={changeRef} className="slip-change" onClick={() => setEditing(true)} aria-label={`Change council. Now: ${current[1]}`}>Change</button>
          </div>
        )}
      </div>
      <div className="slip-body">
        <AskBox key={id} lgaId={id} t={t} lang={lang} suggestions={id === initialId ? suggestions : []} />
      </div>
    </div>
  );
}
