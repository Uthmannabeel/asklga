import { NextResponse } from "next/server";
import { isStaff } from "@/lib/auth";
import { allow, allowDaily, clientIp, TOO_MANY } from "@/lib/ratelimit";

export const runtime = "nodejs";
// A cold voice service restores its models from a snapshot; allow for that on the first call.
export const maxDuration = 90;

/**
 * Speech to text for the ask box, with the N-ATLAS ASR models (NCAIR1) running in the voice
 * service (voice/modal_app.py). The browser records the question and posts the audio here; this
 * route applies the budgets, holds the service key, and returns only the text. Audio is passed
 * through in memory and never stored or logged.
 *
 * POST /api/voice?lang=en|pcm|ha|yo|ig   body: the recording (audio/webm, audio/ogg, audio/mp4, audio/wav)
 */
const LANGS = new Set(["en", "pcm", "ha", "yo", "ig"]);
const MAX_BYTES = 3 * 1024 * 1024;
const PER_IP_PER_MIN = Number(process.env.VOICE_RATE_PER_MIN ?? 6);
const PER_IP_PER_DAY = Number(process.env.VOICE_RATE_PER_DAY ?? 60);

export async function POST(req: Request) {
  const base = process.env.ASR_URL?.replace(/\/+$/, "");
  const key = process.env.ASR_KEY;
  if (!base || !key) return NextResponse.json({ error: "Voice questions are not switched on for this server." }, { status: 503 });

  const ip = clientIp(req);
  if (!(await isStaff()) && (!allow(`voice:${ip}`, PER_IP_PER_MIN, 60_000) || !allowDaily(`voice-day:${ip}`, PER_IP_PER_DAY))) return TOO_MANY();

  const lang = new URL(req.url).searchParams.get("lang") ?? "en";
  if (!LANGS.has(lang)) return NextResponse.json({ error: "lang must be en, pcm, ha, yo or ig." }, { status: 400 });
  const type = (req.headers.get("content-type") ?? "").toLowerCase();
  if (!type.startsWith("audio/") && type !== "application/octet-stream") return NextResponse.json({ error: "Send the recording as audio." }, { status: 415 });
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES) return NextResponse.json({ error: "The recording is too long. Keep it under a minute." }, { status: 413 });
  const audio = await req.arrayBuffer().catch(() => null);
  if (!audio || audio.byteLength === 0) return NextResponse.json({ error: "The recording was empty." }, { status: 400 });
  if (audio.byteLength > MAX_BYTES) return NextResponse.json({ error: "The recording is too long. Keep it under a minute." }, { status: 413 });

  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 85_000);
  try {
    const res = await fetch(`${base}/transcribe?lang=${lang}`, {
      method: "POST",
      headers: { "Content-Type": type || "application/octet-stream", "X-ASR-Key": key },
      body: audio,
      signal: c.signal,
    });
    const out = (await res.json().catch(() => null)) as { text?: string; model?: string; seconds?: number; ms?: number; detail?: string } | null;
    if (!res.ok || !out) {
      console.warn(`[voice] service answered ${res.status}: ${out?.detail ?? ""}`);
      const message = res.status === 415 || res.status === 400 ? "That recording could not be read. Try again, a little closer to the phone." : "Voice is not available right now. Type the question instead.";
      return NextResponse.json({ error: message }, { status: res.status === 415 || res.status === 400 ? 400 : 502 });
    }
    const text = (out.text ?? "").trim().slice(0, 1000);
    if (!text) return NextResponse.json({ error: "No words were heard. Try again, a little closer to the phone." }, { status: 422 });
    return NextResponse.json({ text, model: out.model, seconds: out.seconds, ms: out.ms });
  } catch (e) {
    console.warn(`[voice] ${e instanceof Error ? e.name : "error"}`);
    return NextResponse.json({ error: "Voice is not available right now. Type the question instead." }, { status: 504 });
  } finally {
    clearTimeout(t);
  }
}
