import { NextResponse } from "next/server";
import { catalogue } from "@/lib/national";

/** DCAT-style catalogue of every published register, for open-data harvesters. */
export async function GET(req: Request) {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? new URL(req.url).origin;
  return NextResponse.json(await catalogue(base), { headers: { "Cache-Control": "public, max-age=600", "Access-Control-Allow-Origin": "*" } });
}
