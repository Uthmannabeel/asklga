import type { schema } from "@/db";

type Lga = typeof schema.lgas.$inferSelect;
export type Fact = { key: string; label: string; value: string; note?: string; source?: string };

/**
 * The profile facts for an LGA, in display order, only where a value is on file.
 * Each carries the source URL recorded with it; density is marked as calculated.
 */
export function lgaFacts(l: Lga): Fact[] {
  const src = (l.factSources ?? {}) as Record<string, string>;
  const out: Fact[] = [];
  const wiki = (u?: string) => (u && u.includes("wikipedia.org") ? "Wikipedia" : undefined);
  if (l.population) out.push({ key: "population", label: "Population", value: l.population.toLocaleString("en-NG"), note: l.populationYear ? (l.populationYear === 2006 ? "2006 census" : String(l.populationYear)) : undefined, source: src.population ?? (l.populationSource && l.populationSource.startsWith("http") ? l.populationSource : undefined) });
  if (l.areaKm2) out.push({ key: "area", label: "Land area", value: `${Math.round(l.areaKm2).toLocaleString("en-NG")} km²`, note: wiki(src.areaKm2 ?? src.area), source: src.areaKm2 ?? src.area });
  if (l.population && l.areaKm2) out.push({ key: "density", label: "People per km²", value: Math.round(l.population / l.areaKm2).toLocaleString("en-NG"), note: "calculated" });
  if (l.headquarters) out.push({ key: "hq", label: "Headquarters", value: l.headquarters, note: wiki(src.headquarters), source: src.headquarters });
  if (l.createdYear) out.push({ key: "created", label: "Created", value: String(l.createdYear), note: wiki(src.created ?? src.createdYear), source: src.created ?? src.createdYear });
  if (l.senatorialDistrict) out.push({ key: "senatorial", label: "Senatorial district", value: l.senatorialDistrict, source: src.senatorialDistrict });
  if (l.wards?.length) out.push({ key: "wards", label: "Wards", value: String(l.wards.length) });
  return out;
}
