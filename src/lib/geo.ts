import geo from "@/data/geo.json";
import { TILES } from "./ngTiles";

/**
 * Boundary geometry for maps, pre-projected to SVG paths by scripts/build-geo.py from
 * geoBoundaries (GRID3 Nigeria LGA and state boundaries, CC BY 4.0). Server-only: a page
 * inlines just the one state it needs.
 */
type StateGeo = { name: string; box: [number, number]; outline: string; lgas: Record<string, string>; labels: Record<string, [number, number, number]> };
type Geo = { source: string; sourceUrl: string; licence: string; states: Record<string, StateGeo>; national: { box: [number, number]; states: Record<string, string> } };

const G = geo as unknown as Geo;

export const GEO_CREDIT = { text: "Boundaries: GRID3 Nigeria via geoBoundaries, CC BY 4.0", url: G.sourceUrl };

export function stateGeo(code: string): StateGeo | null {
  return G.states[code] ?? null;
}

export function nationalGeo() {
  return G.national;
}

export function codeForState(state: string): string | null {
  return TILES.find((t) => t.state === state)?.code ?? null;
}
