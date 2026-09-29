import { sql } from "drizzle-orm";
import * as s from "./schema";
import profileList from "./profiles.json";
import centroids from "./centroids.json";

/**
 * National profile facts for every LGA (headquarters, land area, census population, year
 * created, senatorial district), each with its published source, from src/db/profiles.json.
 * Fills empty fields only: a value an LGA has entered itself is never overwritten.
 */
type Profile = {
  id: string;
  headquarters?: string | null;
  areaKm2?: number | null;
  population2006?: number | null;
  created?: number | null;
  senatorialDistrict?: string | null;
  sources?: Record<string, string>;
};

const PROFILES = profileList as unknown as Profile[];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function seedProfiles(db: any) {
  const rows = (await db
    .select({ id: s.lgas.id, lat: s.lgas.lat, lng: s.lgas.lng, headquarters: s.lgas.headquarters, areaKm2: s.lgas.areaKm2, population: s.lgas.population, createdYear: s.lgas.createdYear, senatorialDistrict: s.lgas.senatorialDistrict, factSources: s.lgas.factSources })
    .from(s.lgas)) as { id: string; lat: number | null; lng: number | null; headquarters: string | null; areaKm2: number | null; population: number | null; createdYear: number | null; senatorialDistrict: string | null; factSources: Record<string, string> | null }[];
  const byId = new Map(rows.map((r) => [r.id, r]));
  let changed = 0;
  // Centre points from the GRID3 boundaries, only where the LGA has no coordinates of its own.
  // One statement for all of them, so a first cold start is not hundreds of round trips.
  const need = Object.entries(centroids as unknown as Record<string, [number, number]>).filter(([id]) => {
    const r = byId.get(id);
    return r && (r.lat == null || r.lng == null);
  });
  if (need.length) {
    const values = sql.join(need.map(([id, [lat, lng]]) => sql`(${id}, ${lat}::double precision, ${lng}::double precision)`), sql`, `);
    await db.execute(sql`UPDATE lgas SET lat = v.lat, lng = v.lng FROM (VALUES ${values}) AS v(id, lat, lng) WHERE lgas.id = v.id AND (lgas.lat IS NULL OR lgas.lng IS NULL)`);
    changed += need.length;
  }
  const pending: { id: string; set: Record<string, unknown>; src: Record<string, string> }[] = [];
  for (const p of PROFILES) {
    const r = byId.get(p.id);
    if (!r) continue;
    const set: Record<string, unknown> = {};
    const src: Record<string, string> = { ...(r.factSources ?? {}) };
    const take = (field: string, current: unknown, value: unknown, extra?: Record<string, unknown>) => {
      if ((current == null || current === "") && value != null && value !== "") {
        Object.assign(set, extra ?? { [field]: value });
        const key = ({ population: "population2006", createdYear: "created" } as Record<string, string>)[field] ?? field;
        const url = p.sources?.[key] ?? p.sources?.[field];
        if (url) src[field] = url;
      }
    };
    take("headquarters", r.headquarters, p.headquarters);
    take("areaKm2", r.areaKm2, p.areaKm2);
    take("population", r.population, p.population2006, { population: p.population2006, populationYear: 2006, populationSource: "2006 census (NBS Annual Abstract of Statistics 2011)" });
    take("createdYear", r.createdYear, p.created);
    take("senatorialDistrict", r.senatorialDistrict, p.senatorialDistrict);
    if (Object.keys(set).length) pending.push({ id: p.id, set, src });
  }
  // Batched: each row's final values were decided above (existing values kept), so one
  // statement per 150 rows writes them. COALESCE keeps anything set in the meantime.
  for (let i = 0; i < pending.length; i += 150) {
    const chunk = pending.slice(i, i + 150);
    const values = sql.join(
      chunk.map(({ id, set, src }) =>
        sql`(${id}, ${(set.headquarters as string) ?? null}::text, ${(set.areaKm2 as number) ?? null}::double precision, ${(set.population as number) ?? null}::integer, ${(set.populationYear as number) ?? null}::integer, ${(set.populationSource as string) ?? null}::text, ${(set.createdYear as number) ?? null}::integer, ${(set.senatorialDistrict as string) ?? null}::text, ${JSON.stringify(src)}::jsonb)`,
      ),
      sql`, `,
    );
    await db.execute(sql`UPDATE lgas SET
      headquarters = COALESCE(lgas.headquarters, v.hq),
      area_km2 = COALESCE(lgas.area_km2, v.area),
      population = COALESCE(lgas.population, v.pop),
      population_year = CASE WHEN lgas.population IS NULL AND v.pop IS NOT NULL THEN v.pop_year ELSE lgas.population_year END,
      population_source = CASE WHEN lgas.population IS NULL AND v.pop IS NOT NULL THEN v.pop_src ELSE lgas.population_source END,
      created_year = COALESCE(lgas.created_year, v.created),
      senatorial_district = COALESCE(lgas.senatorial_district, v.senatorial),
      fact_sources = v.src
      FROM (VALUES ${values}) AS v(id, hq, area, pop, pop_year, pop_src, created, senatorial, src)
      WHERE lgas.id = v.id`);
    changed += chunk.length;
  }
  return changed;
}
