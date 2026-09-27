import { NextResponse } from "next/server";
import { getDb, schema as s } from "@/db";
import { canAccessLga, currentStaff, roleAtLeast } from "@/lib/auth";
import { MODEL } from "@/lib/ask";
import { readJson } from "@/lib/ratelimit";
import { getLga } from "@/lib/queries";

/** The eval harness posts its summary here (staff session required) so the scoreboard can publish it. */
export async function POST(req: Request) {
  const me = await currentStaff();
  if (!me || !roleAtLeast(me.role, "editor")) return NextResponse.json({ error: "Staff sign-in required" }, { status: 401 });
  const body = await readJson<{ lgaId?: unknown; cases?: unknown; pass?: unknown; accuracy?: unknown; figureFailures?: unknown; note?: unknown }>(req, 4 * 1024);
  const lgaId = typeof body?.lgaId === "string" ? body.lgaId : "";
  const cases = Number(body?.cases);
  const pass = Number(body?.pass);
  if (!lgaId || !Number.isInteger(cases) || !Number.isInteger(pass) || cases <= 0 || pass < 0 || pass > cases) return NextResponse.json({ error: "lgaId, cases and pass required" }, { status: 400 });
  if (!canAccessLga(me, lgaId) || !(await getLga(lgaId))) return NextResponse.json({ error: "Not your LGA" }, { status: 403 });
  const db = await getDb();
  await db.insert(s.evalRuns).values({
    lgaId,
    cases,
    pass,
    accuracy: Math.round((pass / cases) * 100),
    figureFailures: Number.isInteger(Number(body?.figureFailures)) ? Number(body?.figureFailures) : 0,
    model: MODEL,
    note: typeof body?.note === "string" ? body.note.slice(0, 200) : `run by ${me.name}`,
  });
  return NextResponse.json({ ok: true });
}
