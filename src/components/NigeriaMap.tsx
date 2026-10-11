import Link from "next/link";
import { TILES, stateLabel } from "@/lib/ngTiles";

export type MapRow = { id: string; name: string; state: string; records: number };

/**
 * The national map: every state is a tile in roughly its real position, every LGA is a dot.
 * A filled dot is an LGA that publishes approved records. Tiles are plain links (?state=XX),
 * so the map works without JavaScript and every state list is crawlable.
 */
export function NigeriaMap({ rows, selected }: { rows: MapRow[]; selected?: string }) {
  const byState = new Map<string, MapRow[]>();
  for (const r of rows) byState.set(r.state, [...(byState.get(r.state) ?? []), r]);
  return (
    <nav className="ng-grid" aria-label="States of Nigeria">
      {TILES.map((t) => {
        const lgas = byState.get(t.state) ?? [];
        const lit = lgas.filter((l) => l.records > 0).length;
        const current = selected === t.code;
        return (
          <Link
            key={t.code}
            href={current ? "/#map" : `/?state=${t.code}#map`}
            scroll={false}
            className={`ng-tile ${lit ? "has-lit" : ""}`}
            // --i staggers the first-paint animation in a diagonal wave (globals.css, reduced-motion aware).
            style={{ gridColumn: t.col + 1, gridRow: t.row + 1, "--i": t.row * 2 + t.col } as React.CSSProperties}
            aria-current={current ? "true" : undefined}
            aria-label={`${stateLabel(t.state)}: ${lgas.length} local government areas, ${lit} publishing records`}
            title={`${stateLabel(t.state)}, ${lgas.length} LGAs`}
          >
            <span className="ng-code" aria-hidden="true"><span>{t.code}</span><span>{lgas.length}</span></span>
            <span className="ng-dots" aria-hidden="true">
              {lgas.map((l) => <span key={l.id} className={`ng-dot ${l.records > 0 ? "lit" : ""}`} />)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
