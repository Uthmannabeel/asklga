import { NextResponse } from "next/server";
import { getLga } from "@/lib/queries";
import { allow, clientIp, readJson, TOO_MANY } from "@/lib/ratelimit";
import { MIN_RATERS, validateRating } from "@/lib/participationRules";
import { reportCard, saveRating } from "@/lib/participation";
import { forget } from "@/lib/memo";

/**
 * POST /api/rating {lgaId, scores: {roads: 1..5, ...}, email, comment?}
 * One score per email address per council per calendar month; a second submission in the
 * same month replaces the first. The address is kept only as a keyed hash.
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!allow(`rating:${ip}`, 4, 60 * 60_000)) return TOO_MANY(900);
  const body = await readJson<Record<string, unknown>>(req, 8 * 1024);
  const lgaId = typeof body?.lgaId === "string" ? body.lgaId.slice(0, 60) : "";
  if (!body || !lgaId) return NextResponse.json({ error: "lgaId required" }, { status: 400 });
  if (!(await getLga(lgaId))) return NextResponse.json({ error: "Unknown LGA" }, { status: 404 });
  const checked = validateRating(body);
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });
  const { replaced } = await saveRating(lgaId, checked.value, ip);
  forget("ratings:");
  const card = await reportCard(lgaId);
  return NextResponse.json({ ok: true, replaced, raters: card.raters, published: card.published, needed: Math.max(0, MIN_RATERS - card.raters) });
}
