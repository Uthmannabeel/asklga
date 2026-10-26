import { createHash } from "node:crypto";

/**
 * Text to speech for spoken answers. One provider today: Gemini TTS, called over REST with the
 * same key as the answer engine, which speaks all five answer languages. The reply is raw
 * 16-bit PCM; it is wrapped in a WAV header here so any browser plays it with no decoder.
 *
 * Only the answer text is sent: never the question, never anything personal (answers already
 * exclude personal details). Clips are cached in memory by text so a repeated answer costs
 * nothing, which also keeps the free-tier quota for new answers.
 */

export type SpeechLang = "en" | "pcm" | "ha" | "yo" | "ig";
export const SPEECH_LANGS: readonly SpeechLang[] = ["en", "pcm", "ha", "yo", "ig"];
export const MAX_SPEECH_CHARS = 700;

/**
 * Gemini TTS models, tried in order. On a free key each has its own small daily quota (the
 * lite model was used up after about a dozen clips on 26 Oct 2026), so a model that answers
 * "per day" is rested for a few hours and the next one takes over. ASKLGA_TTS_MODEL puts one
 * model first. After the chain, the open MMS voices in the voice service (voice/modal_app.py)
 * speak; they have no daily cap.
 */
const GEMINI_MODELS = [
  process.env.ASKLGA_TTS_MODEL,
  "gemini-3.8-flash-lite-tts",
  "gemini-3.8-flash-tts",
  "gemini-3.1-flash-tts-preview",
  "gemini-2.5-flash-preview-tts",
].filter((m, i, a): m is string => Boolean(m) && a.indexOf(m) === i);
export const TTS_MODEL = GEMINI_MODELS[0];
const REST_MS = 6 * 60 * 60 * 1000;
const restingUntil = new Map<string, number>();

/** One voice per language, so the service sounds the same every time. */
const VOICE: Record<SpeechLang, string> = { en: "Kore", pcm: "Kore", ha: "Kore", yo: "Kore", ig: "Kore" };

export class SpeechOffline extends Error {
  constructor(message = "Spoken answers are not switched on for this server.") {
    super(message);
    this.name = "SpeechOffline";
  }
}
export class SpeechBusy extends Error {
  constructor(message = "The voice is busy right now.") {
    super(message);
    this.name = "SpeechBusy";
  }
}

export type Clip = { wav: Uint8Array<ArrayBuffer>; sampleRate: number; seconds: number; model: string };

/** Wraps little-endian 16-bit mono PCM in a 44-byte RIFF/WAVE header. */
export function wavFromPcm16(pcm: Uint8Array, sampleRate: number): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(44 + pcm.byteLength);
  const v = new DataView(out.buffer);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) out[o + i] = s.charCodeAt(i); };
  str(0, "RIFF");
  v.setUint32(4, 36 + pcm.byteLength, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, pcm.byteLength, true);
  out.set(pcm, 44);
  return out;
}

/** Sample rate from a Gemini audio MIME type such as "audio/L16;codec=pcm;rate=24000". */
export function rateFromMime(mime: string, fallback = 24000): number {
  const m = /rate=(\d+)/.exec(mime);
  return m ? Number(m[1]) : fallback;
}

/** Text the way it should be read: no record IDs, no brackets, no markdown, collapsed spaces. */
export function speakable(text: string): string {
  return text
    .replace(/\[[A-Z]{2,5}-[A-Z]-\d{3,}\]/g, "")
    .replace(/\b[A-Z]{2,5}-[A-Z]-\d{3,}\b/g, "")
    .replace(/[*_#>`]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SPEECH_CHARS);
}

const cache = new Map<string, Clip>();
const CACHE_MAX = 300;

function remember(key: string, clip: Clip) {
  if (cache.size >= CACHE_MAX) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(key, clip);
}

export function cacheKey(lang: SpeechLang, text: string): string {
  return createHash("sha256").update(`${lang}|${text}`).digest("hex").slice(0, 32);
}

type GeminiAudio = {
  candidates?: { finishReason?: string; content?: { parts?: { inlineData?: { mimeType: string; data: string } }[] } }[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string };
};

/** "resting" when the model's daily quota is used up, "busy" for a passing 429/503, else the clip. */
async function speakWithGemini(model: string, lang: SpeechLang, text: string, apiKey: string, signal?: AbortSignal): Promise<Clip | "resting" | "busy"> {
  // Only the text goes to the model. A style instruction in front of it ("read this calmly in
  // Hausa: ...") was read out loud, word for word, when tried on 26 Oct 2026, so none is sent;
  // the model picks the language up from the text itself.
  const body = {
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE[lang] } } },
    },
  };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey }, body: JSON.stringify(body), signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    return "busy";
  }
  if (res.status === 429 || res.status === 503) {
    const detail = await res.text().catch(() => "");
    if (res.status === 429 && /PerDay/i.test(detail)) {
      console.warn(`[speak] ${model}: daily quota used; resting it`);
      restingUntil.set(model, Date.now() + REST_MS);
      return "resting";
    }
    return "busy";
  }
  if (res.status === 400 || res.status === 401 || res.status === 403) {
    const detail = await res.text().catch(() => "");
    console.error(`[speak] ${model} rejected (${res.status}): ${detail.slice(0, 300)}`);
    if (/API[_ ]KEY|UNAUTHENTICATED|PERMISSION_DENIED/i.test(detail)) throw new SpeechOffline();
    // A model that is gone or renamed should not be retried every call.
    if (res.status === 400 || res.status === 403) { restingUntil.set(model, Date.now() + REST_MS); return "resting"; }
    return "busy";
  }
  if (!res.ok) return "busy";

  const json = (await res.json()) as GeminiAudio;
  const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!part?.inlineData) {
    console.warn(`[speak] ${model} returned no audio (${json.candidates?.[0]?.finishReason ?? json.promptFeedback?.blockReason ?? "empty"})`);
    return "busy";
  }
  const pcm = new Uint8Array(Buffer.from(part.inlineData.data, "base64"));
  const sampleRate = rateFromMime(part.inlineData.mimeType);
  return { wav: wavFromPcm16(pcm, sampleRate), sampleRate, seconds: pcm.byteLength / 2 / sampleRate, model };
}

/**
 * The open MMS voices (Meta, CC BY-NC 4.0) running beside the N-ATLAS speech models in the voice
 * service. They answer with a 16 kHz WAV already. Null when the service is not configured.
 */
async function speakWithService(lang: SpeechLang, text: string, signal?: AbortSignal): Promise<Clip | null> {
  const base = process.env.ASR_URL?.replace(/\/+$/, "");
  const key = process.env.ASR_KEY;
  if (!base || !key) return null;
  let res: Response;
  try {
    res = await fetch(`${base}/speak`, { method: "POST", headers: { "Content-Type": "application/json", "X-ASR-Key": key }, body: JSON.stringify({ text, lang }), signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    return null;
  }
  if (!res.ok) {
    console.warn(`[speak] voice service answered ${res.status}`);
    return null;
  }
  const wav = new Uint8Array(await res.arrayBuffer());
  const sampleRate = Number(res.headers.get("x-sample-rate") ?? 16000);
  return { wav, sampleRate, seconds: Math.max(0, wav.byteLength - 44) / 2 / sampleRate, model: res.headers.get("x-voice-model") ?? "mms-tts" };
}

/**
 * Speaks `text` in `lang`: the Gemini chain first, then the open voices in the voice service.
 * Throws SpeechOffline when no voice is configured at all and SpeechBusy when every voice
 * failed just now, so the route can tell the browser to fall back to its own voice.
 */
export async function speak(lang: SpeechLang, rawText: string, signal?: AbortSignal): Promise<Clip> {
  const text = speakable(rawText);
  if (!text) throw new Error("Nothing to say.");
  const key = cacheKey(lang, text);
  const hit = cache.get(key);
  if (hit) return hit;

  const apiKey = process.env.GEMINI_API_KEY;
  const haveService = Boolean(process.env.ASR_URL && process.env.ASR_KEY);
  if (!apiKey && !haveService) throw new SpeechOffline();

  let clip: Clip | null = null;
  if (apiKey) {
    const now = Date.now();
    for (const model of GEMINI_MODELS) {
      if ((restingUntil.get(model) ?? 0) > now) continue;
      const out = await speakWithGemini(model, lang, text, apiKey, signal);
      if (out === "resting") continue;
      if (out === "busy") break; // a passing fault: do not spend every model's quota on one answer
      clip = out;
      break;
    }
  }
  if (!clip) clip = await speakWithService(lang, text, signal);
  if (!clip) throw new SpeechBusy(apiKey && !haveService ? "Spoken answers have reached their limit for today." : "The voice is busy right now.");
  remember(key, clip);
  return clip;
}
