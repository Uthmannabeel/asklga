import { and, eq } from "drizzle-orm";
import * as s from "./schema";
import lgaList from "./lgas.json";
import renames from "./lga-renames.json";

const RENAMES = renames as unknown as Record<string, [string, string]>;

/**
 * The national directory: all 774 local government areas across the 36 states and the FCT,
 * from the public list of states and LGAs, with geopolitical zones. Runs on every start and
 * inserts any LGA that is missing, so every LGA has a page on day one. Existing rows are never
 * overwritten (the demo LGA keeps its intro and coordinates; a joined LGA keeps its edits).
 */
export type DirectoryEntry = { id: string; name: string; state: string; zone: string };

export const DIRECTORY: DirectoryEntry[] = lgaList as DirectoryEntry[];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function seedDirectory(db: any) {
  // One read of the whole table, then write only what actually differs, so a cold start costs
  // one query instead of hundreds.
  const current = new Map<string, { name: string; zone: string | null }>();
  for (const r of (await db.select({ id: s.lgas.id, name: s.lgas.name, zone: s.lgas.zone }).from(s.lgas)) as { id: string; name: string; zone: string | null }[]) {
    current.set(r.id, { name: r.name, zone: r.zone });
  }
  const missing = DIRECTORY.filter((d) => !current.has(d.id));
  for (let i = 0; i < missing.length; i += 100) {
    await db.insert(s.lgas).values(missing.slice(i, i + 100).map((d) => ({ id: d.id, name: d.name, state: d.state, zone: d.zone, demo: false })));
  }
  // Back-fill zones on rows that predate the column.
  for (const d of DIRECTORY) {
    const row = current.get(d.id);
    if (row && row.zone !== d.zone) await db.update(s.lgas).set({ zone: d.zone }).where(eq(s.lgas.id, d.id));
  }
  // Correct names the original public list garbled ("Sagba/Sagbama", "Moya" for Munya), but only
  // where the row still holds the old wrong name, so an LGA's own edit is never overwritten.
  for (const [id, [from, to]] of Object.entries(RENAMES)) {
    if (current.get(id)?.name === from) await db.update(s.lgas).set({ name: to }).where(and(eq(s.lgas.id, id), eq(s.lgas.name, from)));
  }
  return missing.length;
}
