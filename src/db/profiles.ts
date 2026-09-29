import { eq } from "drizzle-orm";
import * as s from "./schema";
import profileList from "./profiles.json";

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
  if (!PROFILES.length) return 0;
  const rows = (await db
    .select({ id: s.lgas.id, headquarters: s.lgas.headquarters, areaKm2: s.lgas.areaKm2, population: s.lgas.population, createdYear: s.lgas.createdYear, senatorialDistrict: s.lgas.senatorialDistrict, factSources: s.lgas.factSources })
    .from(s.lgas)) as { id: string; headquarters: string | null; areaKm2: number | null; population: number | null; createdYear: number | null; senatorialDistrict: string | null; factSources: Record<string, string> | null }[];
  const byId = new Map(rows.map((r) => [r.id, r]));
  let changed = 0;
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
    take("population", r.population, p.population2006, { population: p.population2006, populationYear: 2006, populationSource: "2006 census" });
    take("createdYear", r.createdYear, p.created);
    take("senatorialDistrict", r.senatorialDistrict, p.senatorialDistrict);
    if (Object.keys(set).length) {
      await db.update(s.lgas).set({ ...set, factSources: src }).where(eq(s.lgas.id, p.id));
      changed++;
    }
  }
  return changed;
}
