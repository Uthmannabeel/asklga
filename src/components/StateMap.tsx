import { GEO_CREDIT, nationalGeo, stateGeo } from "@/lib/geo";

/**
 * A state drawn from real boundaries, one shape per LGA, each a link to its page.
 * `focus` is the LGA being viewed; `lit` are LGAs publishing approved records.
 */
export function StateMap({
  code,
  names,
  focus,
  lit = [],
  label,
  showCredit = true,
  labels = "fit",
}: {
  code: string;
  names: Record<string, string>;
  focus?: string;
  lit?: string[];
  label: string;
  showCredit?: boolean;
  /** "fit": name every LGA whose shape can hold its name; "focus": only the LGA being viewed. */
  labels?: "fit" | "focus";
}) {
  const g = stateGeo(code);
  if (!g) return null;
  const [w, h] = g.box;
  const litSet = new Set(lit);
  const ids = Object.keys(g.lgas).sort((a, b) => (a === focus ? 1 : b === focus ? -1 : 0)); // focus drawn last so its outline sits on top
  return (
    <figure className="grid gap-2">
      <svg viewBox={`-4 -4 ${w + 8} ${h + 8}`} className="state-map" role="group" aria-label={label}>
        {ids.map((id) => (
          <a key={id} href={`/${id}`} aria-label={names[id] ?? id}>
            <path d={g.lgas[id]} className={`lga-shape${id === focus ? " is-focus" : ""}${litSet.has(id) ? " is-lit" : ""}`}>
              <title>{names[id] ?? id}</title>
            </path>
          </a>
        ))}
        {placeLabels(ids, g.labels ?? {}, names, focus, labels).map((id) => {
          const lp = g.labels[id];
          const name = names[id];
          return (
            <text key={`t-${id}`} x={lp[0]} y={lp[1]} className={`lga-label${id === focus ? " is-focus" : ""}`} textAnchor="middle" dominantBaseline="middle" aria-hidden="true">
              {name}
            </text>
          );
        })}
      </svg>
      {showCredit ? (
        <figcaption className="small muted">
          <a href={GEO_CREDIT.url} rel="noopener" className="muted">{GEO_CREDIT.text}</a>
        </figcaption>
      ) : null}
    </figure>
  );
}

/**
 * Which LGAs get a printed name: the focus always; otherwise the largest shapes first, each only
 * if its name fits inside the shape and does not overlap a name already placed.
 */
function placeLabels(ids: string[], lp: Record<string, [number, number, number]>, names: Record<string, string>, focus: string | undefined, mode: "fit" | "focus") {
  const box = (id: string, size: number) => {
    const w = (names[id]?.length ?? 0) * size * 0.56;
    const [x, y] = lp[id];
    return [x - w / 2 - 2, y - size / 2 - 1, x + w / 2 + 2, y + size / 2 + 1];
  };
  const hit = (a: number[], b: number[]) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  const placed: number[][] = [];
  const out: string[] = [];
  if (focus && lp[focus] && names[focus]) { placed.push(box(focus, 12)); out.push(focus); }
  if (mode === "focus") return out;
  const order = ids.filter((id) => id !== focus && lp[id] && names[id]).sort((a, b) => lp[b][2] - lp[a][2]);
  for (const id of order) {
    const fits = lp[id][2] > names[id].length * 5.6 * 12 * 3.2;
    const b = box(id, 10);
    if (fits && !placed.some((p) => hit(p, b))) { placed.push(b); out.push(id); }
  }
  return out;
}

/** Nigeria with one state filled: a small "where is this" locator. */
export function NationalLocator({ code, label, size = 140 }: { code: string; label: string; size?: number }) {
  const n = nationalGeo();
  const [w, h] = n.box;
  return (
    <svg viewBox={`-2 -2 ${w + 4} ${h + 4}`} width={size} height={Math.round((size * h) / w)} role="img" aria-label={label} className="locator">
      {Object.entries(n.states).map(([c, d]) => (
        <path key={c} d={d} className={c === code ? "loc-on" : "loc-off"} />
      ))}
    </svg>
  );
}
