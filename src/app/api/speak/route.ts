import { NextResponse } from "next/server";
import { isStaff } from "@/lib/auth";
import { allow, allowDaily, clientIp, readJson, TOO_MANY } from "@/lib/ratelimit";
import { MAX_SPEECH_CHARS, SPEECH_LANGS, SpeechBusy, SpeechOffline, speak, type SpeechLang } from "@/lib/tts";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Spoken answers: turns answer text into a WAV clip in the answer's language.
 *
 * POST /api/speak  { text, lang: en|pcm|ha|yo|ig }  -> audio/wav
 *
 * 503 means "no server voice right now"; the browser then falls back to its own voice if it
 * has one for the language, or shows the text only. Only the answer text is accepted, capped
 * at MAX_SPEECH_CHARS; nothing is stored.
 */
const PER_IP_PER_MIN = Number(process.env.SPEAK_RATE_PER_MIN ?? 10);
const PER_IP_PER_DAY = Number(process.env.SPEAK_RATE_PER_DAY ?? 120);

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!(await isStaff()) && (!allow(`speak:${ip}`, PER_IP_PER_MIN, 60_000) || !allowDaily(`speak-day:${ip}`, PER_IP_PER_DAY))) return TOO_MANY();

  const body = await readJson<{ text?: unknown; lang?: unknown }>(req, 4 * 1024);
  if (!body) return NextResponse.json({ error: "Send JSON with text and lang." }, { status: 400 });
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const lang = typeof body.lang === "string" && (SPEECH_LANGS as readonly string[]).includes(body.lang) ? (body.lang as SpeechLang) : null;
  if (!text || !lang) return NextResponse.json({ error: "text and lang (en, pcm, ha, yo or ig) are required." }, { status: 400 });
  if (text.length > MAX_SPEECH_CHARS) return NextResponse.json({ error: `Keep the text under ${MAX_SPEECH_CHARS} characters.` }, { status: 400 });

  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 25_000);
  try {
    const clip = await speak(lang, text, c.signal);
    return new Response(clip.wav, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(clip.wav.byteLength),
        "Cache-Control": "private, max-age=3600",
        "X-Voice-Model": clip.model,
        "X-Voice-Seconds": clip.seconds.toFixed(1),
      },
    });
  } catch (e) {
    if (e instanceof SpeechOffline) return NextResponse.json({ error: e.message, offline: true }, { status: 503 });
    if (e instanceof SpeechBusy) return NextResponse.json({ error: e.message, busy: true }, { status: 503, headers: { "Retry-After": "30" } });
    if (e instanceof DOMException && e.name === "AbortError") return NextResponse.json({ error: "The voice took too long." }, { status: 504 });
    console.error("[speak]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "The voice had a problem." }, { status: 502 });
  } finally {
    clearTimeout(t);
  }
}
