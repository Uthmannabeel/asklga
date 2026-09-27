import { inArray } from "drizzle-orm";
import * as s from "./schema";
import lgaList from "./lgas.json";

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
  const ids = DIRECTORY.map((d) => d.id);
  const existing = new Set<string>();
  for (let i = 0; i < ids.length; i += 200) {
    const rows = (await db.select({ id: s.lgas.id }).from(s.lgas).where(inArray(s.lgas.id, ids.slice(i, i + 200)))) as { id: string }[];
    for (const r of rows) existing.add(r.id);
  }
  const missing = DIRECTORY.filter((d) => !existing.has(d.id));
  for (let i = 0; i < missing.length; i += 100) {
    await db.insert(s.lgas).values(missing.slice(i, i + 100).map((d) => ({ id: d.id, name: d.name, state: d.state, zone: d.zone, demo: false })));
  }
  // Back-fill zones on rows that predate the column.
  for (const d of DIRECTORY) {
    if (existing.has(d.id)) await db.update(s.lgas).set({ zone: d.zone }).where(inArray(s.lgas.id, [d.id]));
  }
  return missing.length;
}
