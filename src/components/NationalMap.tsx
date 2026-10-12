"use client";

import Link from "next/link";
import { memo, useEffect, useMemo, useState } from "react";

/** [id, name, state, publishing, naira per resident or null] */
export type NationalRow = [string, string, string, 0 | 1, number | null];
type Geo = { box: [number, number]; states: Record<string, string>; lgas: Record<string, string> };

// Five steps of the civic green, light to dark. Flat fills: a choropleth, not a gradient.
const STEPS = ["#e3eee6", "#b5d6c1", "#7db694", "#36875b", "#06512f"];
const NONE = "#eceeea";

const fmt = (n: number) => "₦" + Math.round(n).toLocaleString("en-NG");

/**
 * Every LGA in Nigeria on one map, shaded by what it received from the Federation Account per
 * resident in the latest month. The outlines are a static file (public/geo), so the page itself
 * stays light; until it loads, and without JavaScript, the lists beside the map carry the same facts.
 */
export function NationalMap({ rows, period }: { rows: NationalRow[]; period: string }) {
  const [geo, setGeo] = useState<Geo | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    fetch("/geo/nigeria-lgas.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((g: Geo) => live && setGeo(g))
      .catch(() => live && setFailed(true));
    return () => { live = false; };
  }, []);

  const { byId, breaks, ranked } = useMemo(() => {
    const byId = new Map(rows.map((r) => [r[0], r]));
    const vals = rows.map((r) => r[4]).filter((v): v is number => v != null).sort((a, b) => a - b);
    const q = (p: number) => vals[Math.min(vals.length - 1, Math.floor(p * vals.length))];
    const breaks = vals.length ? [q(0.2), q(0.4), q(0.6), q(0.8)] : [];
    const ranked = rows.filter((r) => r[4] != null).sort((a, b) => b[4]! - a[4]!);
    return { byId, breaks, ranked };
  }, [rows]);

  const step = (v: number | null) => (v == null ? -1 : breaks.filter((b) => v >= b).length);
  const sel = active ? byId.get(active) : null;
  const rank = sel ? ranked.findIndex((r) => r[0] === sel[0]) + 1 : 0;

  return (
    <div className="nmap">
      <div className="nmap-figure">
        {geo ? (
          <svg
            viewBox={`0 0 ${geo.box[0]} ${geo.box[1]}`}
            className="nmap-svg"
            role="img"
            aria-label={`Map of Nigeria's ${rows.length} local government areas, shaded by Federation Account allocation per resident, ${period}. The same figures are in the money tables.`}
            onPointerOver={(e) => {
              const id = (e.target as Element).getAttribute?.("data-id");
              if (id && e.pointerType === "mouse") setActive(id);
            }}
            onClick={(e) => {
              // A tap selects an area and shows its figures; the second tap on it opens its page.
              const id = (e.target as Element).getAttribute?.("data-id");
              if (id && id !== active) { e.preventDefault(); setActive(id); }
            }}
          >
            <Shapes geo={geo} fill={(id) => { const s = step(byId.get(id)?.[4] ?? null); return s < 0 ? NONE : STEPS[s]; }} />
            <g className="nmap-states" aria-hidden="true">
              {Object.entries(geo.states).map(([code, d]) => <path key={code} d={d} />)}
            </g>
            {rows.filter((r) => r[3] && geo.lgas[r[0]]).map((r) => (
              <path key={`pub-${r[0]}`} d={geo.lgas[r[0]]} className="nmap-pub" aria-hidden="true" />
            ))}
            {active && geo.lgas[active] ? <path d={geo.lgas[active]} className="nmap-active" aria-hidden="true" /> : null}
          </svg>
        ) : (
          <div className="nmap-wait" aria-hidden={!failed}>
            {failed ? <p className="small muted">The map could not load. The figures are in the <Link href="/money">money tables</Link>.</p> : null}
          </div>
        )}
        <div className="nmap-legend" aria-hidden="true">
          <span className="small muted">Per resident, {period}</span>
          <span className="mono small muted">{breaks.length ? `< ${fmt(breaks[0])}` : ""}</span>
          <span className="nmap-scale">
            {STEPS.map((c, i) => <span key={c} style={{ background: c }} title={i === 0 ? `Under ${fmt(breaks[0] ?? 0)}` : i === STEPS.length - 1 ? `${fmt(breaks[3] ?? 0)} and over` : `${fmt(breaks[i - 1] ?? 0)} to ${fmt(breaks[i] ?? 0)}`} />)}
          </span>
          <span className="mono small muted">{breaks.length ? `${fmt(breaks[3])}+` : ""}</span>
          <span className="small muted nmap-key-pub">Publishing records</span>
        </div>
      </div>

      <div className="nmap-read" aria-live="polite">
        {sel ? (
          <>
            <p className="eyebrow">{sel[2] === "Federal Capital Territory" ? "FCT" : `${sel[2]} State`}</p>
            <p className="nmap-name">{sel[1]}</p>
            <p className="figure-n">{sel[4] != null ? fmt(sel[4]) : "Not on file"}</p>
            <p className="small muted">{sel[4] != null ? `per resident in ${period}. ${ordinal(rank)} of ${ranked.length} nationally.` : "No matched allocation for this month."}</p>
            {sel[3] ? <p className="small"><span className="legend-dot" style={{ background: "var(--ink)" }} />Publishes records you can ask about</p> : null}
            <Link href={`/${sel[0]}`} className="btn btn-sm justify-self-start">Open {sel[1]}</Link>
          </>
        ) : (
          <>
            <p className="eyebrow">Tap or point at any area</p>
            <p className="small muted">Every council&apos;s share of the Federation Account, divided by its 2006 census population.</p>
            <Extremes title="Most per resident" list={ranked.slice(0, 3)} />
            <Extremes title="Least per resident" list={ranked.slice(-3).reverse()} />
          </>
        )}
      </div>
    </div>
  );
}

function Extremes({ title, list }: { title: string; list: NationalRow[] }) {
  return (
    <div className="grid gap-1">
      <p className="font-bold small">{title}</p>
      <ol className="register">
        {list.map((r) => (
          <li key={r[0]} className="flex items-baseline justify-between gap-3" style={{ padding: "0.45rem 0" }}>
            <span className="small"><Link href={`/${r[0]}/money`}>{r[1]}</Link> <span className="muted">{r[2] === "Federal Capital Territory" ? "FCT" : r[2]}</span></span>
            <span className="mono small">{fmt(r[4]!)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// 774 paths render once; hovering only redraws the one highlight path on top.
const Shapes = memo(function Shapes({ geo, fill }: { geo: Geo; fill: (id: string) => string }) {
  return (
    <g className="nmap-lgas">
      {Object.entries(geo.lgas).map(([id, d]) => (
        <a key={id} href={`/${id}`} tabIndex={-1} aria-hidden="true">
          <path d={d} data-id={id} fill={fill(id)} />
        </a>
      ))}
    </g>
  );
}, (a, b) => a.geo === b.geo);

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
