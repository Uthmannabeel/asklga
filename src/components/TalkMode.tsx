"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { UiLang } from "@/lib/i18n";
import type { TalkDict } from "@/lib/talkStrings";

/**
 * Hands-free conversation with a council.
 *
 * One press starts a session: the page greets you, listens, hears when you stop talking,
 * turns the speech into text (N-ATLAS, via /api/voice), asks the records (/api/ask, with the
 * last turns as context), reads the answer back (/api/speak) and listens again. You can cut in
 * while it is speaking by tapping or by talking. Every spoken answer still shows its text and
 * the records it came from, so nothing is taken on trust.
 *
 * Everything that costs quota is behind the same budgets as the typed ask box; the speech is
 * sent once for transcription and never stored.
 */

type Citation = { type: string; id: string; label: string };
type Result = {
  questionId: number;
  token: string;
  language: string;
  answered: boolean;
  answer: string;
  citations: Citation[];
  escalate: boolean;
  mode?: "model" | "search" | "none";
};
type Entry =
  | { role: "you"; text: string; at: number }
  | { role: "council"; text: string; at: number; result: Result; feedback?: "up" | "down" };

type Phase = "idle" | "greeting" | "listening" | "transcribing" | "thinking" | "speaking";

const LANGS: { code: UiLang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "pcm", label: "Pidgin" },
  { code: "ha", label: "Hausa" },
  { code: "yo", label: "Yorùbá" },
  { code: "ig", label: "Igbo" },
];
const HTML_LANG: Record<string, string> = { en: "en-NG", pcm: "pcm", ha: "ha", yo: "yo", ig: "ig" };
const STORE_LANG = "asklga_talk_lang";
const STORE_HANDS = "asklga_talk_handsfree";

// Voice-activity settings, in RMS of the time-domain signal (0..1). The noise floor follows the
// quietest recent frames (falls fast, rises slowly) so a noisy market and a quiet room both
// work, and someone who starts talking the moment they tap is not mistaken for background noise.
const MIN_START = 0.018;
const MAX_START = 0.06;
const END_SILENCE_MS = 1100;
const NO_SPEECH_MS = 8000;
const MAX_UTTERANCE_MS = 30000;
const BARGE_MS = 280;
const TICK_MS = 50;

function recordPath(lgaId: string, c: Citation): string {
  switch (c.type) {
    case "project": return `/${lgaId}/projects/${c.id}`;
    case "service": return `/${lgaId}/services/${c.id}`;
    case "asset": return `/${lgaId}/assets#${c.id}`;
    case "profile": return `/${lgaId}/investment#${c.id}`;
    case "document": return `/${lgaId}/documents/${c.id}`;
    default: return `/${lgaId}`;
  }
}

export function TalkMode({ lgaId, lgaName, lang: initialLang, t, suggestions = [], audience = "resident" }: {
  lgaId: string;
  lgaName: string;
  lang: UiLang;
  t: TalkDict;
  suggestions?: string[];
  audience?: "resident" | "investor";
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState<string>("");
  const [notice, setNotice] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [lang, setLang] = useState<UiLang>(initialLang);
  const [handsFree, setHandsFree] = useState(true);
  const [supported, setSupported] = useState(true);
  const [level, setLevel] = useState(0);
  const [typed, setTyped] = useState("");
  const [serverVoice, setServerVoice] = useState(true);

  // Session plumbing lives in refs: it must survive renders and be torn down exactly once.
  const phaseRef = useRef<Phase>("idle");
  const langRef = useRef<UiLang>(initialLang);
  const handsRef = useRef(true);
  const sessionRef = useRef(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const tickRef = useRef<number | null>(null);
  const playerRef = useRef<HTMLAudioElement | null>(null);
  const ackRef = useRef<HTMLAudioElement | null>(null);
  const greetedRef = useRef(false);
  const historyRef = useRef<{ question: string; answer: string }[]>([]);
  const logRef = useRef<HTMLOListElement | null>(null);
  const bargeRef = useRef<(() => void) | null>(null);

  const go = useCallback((p: Phase, s?: string) => {
    phaseRef.current = p;
    setPhase(p);
    if (s !== undefined) setStatus(s);
  }, []);

  useEffect(() => {
    langRef.current = lang;
    try { localStorage.setItem(STORE_LANG, lang); } catch {}
  }, [lang]);
  useEffect(() => {
    handsRef.current = handsFree;
    try { localStorage.setItem(STORE_HANDS, handsFree ? "1" : "0"); } catch {}
  }, [handsFree]);

  useEffect(() => {
    setSupported(Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== "undefined");
    try {
      const saved = localStorage.getItem(STORE_LANG);
      if (saved && LANGS.some((l) => l.code === saved)) setLang(saved as UiLang);
      if (localStorage.getItem(STORE_HANDS) === "0") setHandsFree(false);
    } catch {}
    // Wake the speech service while the page is still being read, so the first question is quick.
    fetch("/api/voice", { cache: "no-store" }).then((r) => r.json()).then((j: { voice?: boolean }) => { if (j && j.voice === false) setServerVoice(false); }).catch(() => {});
    return () => endSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    logRef.current?.lastElementChild?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [entries, phase]);

  function stopTick() {
    if (tickRef.current !== null) { clearInterval(tickRef.current); tickRef.current = null; }
    setLevel(0);
  }

  function stopPlayback() {
    const p = playerRef.current;
    if (p) { p.pause(); p.onended = null; p.onerror = null; }
    const a = ackRef.current;
    if (a) { a.pause(); a.currentTime = 0; }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    bargeRef.current = null;
  }

  function endSession(message?: string) {
    sessionRef.current += 1;
    stopTick();
    stopPlayback();
    const rec = recRef.current;
    if (rec && rec.state !== "inactive") { rec.ondataavailable = null; rec.onstop = null; try { rec.stop(); } catch {} }
    recRef.current = null;
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    analyserRef.current = null;
    greetedRef.current = false;
    go("idle", message ?? "");
  }

  function rms(): number {
    const an = analyserRef.current;
    if (!an) return 0;
    const buf = new Uint8Array(an.fftSize);
    an.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
    return Math.sqrt(sum / buf.length);
  }

  /** Noise floor tracker: snaps down to a quiet frame, creeps up through loud ones. */
  function trackFloor(floor: number, v: number): number {
    return v < floor ? v : Math.min(v, floor * 1.03 + 0.0004);
  }
  const startThreshold = (floor: number) => Math.min(MAX_START, Math.max(MIN_START, floor * 3));
  const endThreshold = (floor: number) => Math.min(MAX_START * 0.7, Math.max(MIN_START * 0.6, floor * 1.8));

  /** Plays a clip through the one unlocked audio element; resolves when it ends or fails. */
  function play(src: string, onBarge?: () => void): Promise<void> {
    return new Promise((resolve) => {
      const p = playerRef.current;
      if (!p) return resolve();
      p.onended = () => resolve();
      p.onerror = () => resolve();
      p.src = src;
      p.play().catch(() => resolve());
      if (onBarge) armBargeIn(() => { p.pause(); onBarge(); resolve(); });
    });
  }

  /** While something plays, a sustained voice above the floor (or a tap) cuts it off. */
  function armBargeIn(cut: () => void) {
    bargeRef.current = cut;
    stopTick();
    const session = sessionRef.current;
    let floor = MIN_START; let loud = 0;
    tickRef.current = window.setInterval(() => {
      if (session !== sessionRef.current || !bargeRef.current) return stopTick();
      const v = rms();
      setLevel(Math.min(1, v * 6));
      floor = trackFloor(floor, v);
      // Higher than the listening threshold: the device is playing, so only a clear voice cuts in.
      const threshold = Math.min(MAX_START * 1.5, Math.max(MIN_START * 2.2, floor * 4));
      loud = v > threshold ? loud + TICK_MS : 0;
      if (loud >= BARGE_MS) { const f = bargeRef.current; bargeRef.current = null; stopTick(); f?.(); }
    }, TICK_MS);
  }

  async function start() {
    setNotice(null);
    if (!supported) { setNotice(t.notSupported); return; }
    if (phaseRef.current !== "idle") { // tap while busy = interrupt, or end if listening
      if (phaseRef.current === "listening") { recRef.current?.stop(); return; }
      if (phaseRef.current === "speaking" || phaseRef.current === "greeting") { const f = bargeRef.current; bargeRef.current = null; stopTick(); if (f) f(); else { stopPlayback(); listen(); } return; }
      return;
    }
    const session = ++sessionRef.current;
    try {
      // Mic and audio context first, inside the tap, so Safari and Chrome on Android allow them.
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      if (ctx.state === "suspended") await ctx.resume().catch(() => {});
      ctxRef.current = ctx;
      if (!playerRef.current) {
        const p = new Audio();
        p.preload = "auto";
        playerRef.current = p;
      }
      if (!ackRef.current) ackRef.current = new Audio();
      // Unlock the elements with a silent play inside the gesture.
      try { playerRef.current.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA="; await playerRef.current.play(); } catch {}
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
      if (session !== sessionRef.current) { stream.getTracks().forEach((tr) => tr.stop()); return; }
      streamRef.current = stream;
      const source = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 1024;
      an.smoothingTimeConstant = 0.4;
      source.connect(an);
      analyserRef.current = an;
    } catch (err) {
      endSession();
      setNotice(err instanceof DOMException && err.name === "NotAllowedError" ? t.micDenied : t.notSupported);
      return;
    }
    if (!greetedRef.current) {
      greetedRef.current = true;
      go("greeting", t.greeting.replace("%lga", lgaName));
      await play(`/voice/greet-${langRef.current}.wav`, () => listen());
      if (session !== sessionRef.current) return;
      // The ref moved on during the await; read it fresh rather than through the narrowed type.
      if ((phaseRef.current as Phase) === "greeting") listen();
    } else {
      listen();
    }
  }

  function listen() {
    const stream = streamRef.current;
    if (!stream || !ctxRef.current) return;
    const session = sessionRef.current;
    stopPlayback();
    stopTick();
    const type = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"].find((m) => MediaRecorder.isTypeSupported(m));
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 32000 } : undefined);
    } catch {
      endSession();
      setNotice(t.notSupported);
      return;
    }
    const chunks: Blob[] = [];
    let spoke = false;
    let floor = MIN_START;
    let silence = 0; let elapsed = 0;
    rec.ondataavailable = (ev) => { if (ev.data.size) chunks.push(ev.data); };
    rec.onstop = () => {
      stopTick();
      if (session !== sessionRef.current) return;
      recRef.current = null;
      if (!spoke || !chunks.length) {
        go("idle", t.noSpeech);
        return;
      }
      const blob = new Blob(chunks, { type: (rec.mimeType || type || "audio/webm").split(";")[0] });
      transcribe(blob, session);
    };
    recRef.current = rec;
    rec.start(250);
    go("listening", t.listening);
    tickRef.current = window.setInterval(() => {
      if (session !== sessionRef.current || rec.state === "inactive") return stopTick();
      elapsed += TICK_MS;
      const v = rms();
      setLevel(Math.min(1, v * 6));
      floor = trackFloor(floor, v);
      if (!spoke) {
        if (v > startThreshold(floor)) { spoke = true; silence = 0; }
        else if (elapsed >= NO_SPEECH_MS) rec.stop();
        return;
      }
      silence = v < endThreshold(floor) ? silence + TICK_MS : 0;
      if (silence >= END_SILENCE_MS || elapsed >= MAX_UTTERANCE_MS) rec.stop();
    }, TICK_MS);
  }

  async function transcribe(blob: Blob, session: number) {
    go("transcribing", t.heard);
    try {
      const res = await fetch(`/api/voice?lang=${langRef.current}`, { method: "POST", headers: { "Content-Type": blob.type }, body: blob });
      const out = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
      if (session !== sessionRef.current) return;
      if (!res.ok || !out.text) {
        setNotice(out.error || t.voiceDown);
        afterTurn(session);
        return;
      }
      askIt(out.text, session, true);
    } catch {
      if (session !== sessionRef.current) return;
      setNotice(t.voiceDown);
      afterTurn(session);
    }
  }

  async function askIt(question: string, session: number, viaVoice: boolean) {
    setNotice(null);
    setEntries((e) => [...e, { role: "you", text: question, at: Date.now() }]);
    go("thinking", t.thinking);
    // A short spoken acknowledgement covers the wait; it is cut off as soon as the answer speaks.
    if (viaVoice && ackRef.current) { ackRef.current.src = `/voice/ack-${langRef.current}.wav`; ackRef.current.play().catch(() => {}); }
    let result: Result | null = null;
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lgaId, question, audience, scope: "public", spoken: true, history: historyRef.current.slice(-3) }),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<Result> & { error?: string };
      if (session !== sessionRef.current) return;
      if (!res.ok) {
        setNotice(data.error || t.voiceDown);
        afterTurn(session);
        return;
      }
      result = data as Result;
    } catch {
      if (session !== sessionRef.current) return;
      setNotice(t.voiceDown);
      afterTurn(session);
      return;
    }
    historyRef.current = [...historyRef.current, { question, answer: result.answer }].slice(-3);
    setEntries((e) => [...e, { role: "council", text: result!.answer, at: Date.now(), result: result! }]);
    await say(result.answer, result.language, session);
  }

  async function say(text: string, language: string, session: number) {
    const sl = (["en", "pcm", "ha", "yo", "ig"].includes(language) ? language : langRef.current) as UiLang;
    go("speaking", t.speaking);
    const a = ackRef.current;
    let src: string | null = null;
    try {
      const res = await fetch("/api/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, lang: sl }) });
      if (session !== sessionRef.current) return;
      if (res.ok) src = URL.createObjectURL(await res.blob());
      else if (res.status === 503) setServerVoice(false);
    } catch {}
    if (a) { a.pause(); a.currentTime = 0; }
    if (session !== sessionRef.current) return;
    let interrupted = false;
    if (src) {
      await play(src, () => { interrupted = true; });
      URL.revokeObjectURL(src);
    } else if ("speechSynthesis" in window) {
      // The browser's own voice, if it has one for the language; otherwise the text stands alone.
      const want = sl === "pcm" ? "en" : sl;
      const voice = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(want));
      if (voice) {
        await new Promise<void>((resolve) => {
          const u = new SpeechSynthesisUtterance(text);
          u.voice = voice; u.lang = voice.lang;
          u.onend = () => resolve(); u.onerror = () => resolve();
          armBargeIn(() => { window.speechSynthesis.cancel(); interrupted = true; resolve(); });
          window.speechSynthesis.speak(u);
        });
      }
    }
    if (session !== sessionRef.current) return;
    stopTick();
    if (interrupted) { go("listening", t.interrupted); listen(); return; }
    afterTurn(session);
  }

  function afterTurn(session: number) {
    if (session !== sessionRef.current) return;
    if (handsRef.current && streamRef.current) listen();
    else go("idle", t.tapToTalk);
  }

  async function submitTyped(e?: React.FormEvent, text?: string) {
    e?.preventDefault();
    const q = (text ?? typed).trim();
    if (!q || (phaseRef.current !== "idle" && phaseRef.current !== "listening")) return;
    setTyped("");
    if (phaseRef.current === "listening") { const rec = recRef.current; if (rec) { rec.onstop = null; rec.stop(); } stopTick(); }
    // Typing without a session still speaks the answer when the browser allows it.
    if (!playerRef.current) { const p = new Audio(); p.preload = "auto"; playerRef.current = p; try { p.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA="; await p.play(); } catch {} }
    if (!ackRef.current) ackRef.current = new Audio();
    const session = streamRef.current ? sessionRef.current : ++sessionRef.current;
    await askIt(q, session, false);
  }

  async function sendFeedback(i: number, f: "up" | "down") {
    const entry = entries[i];
    if (!entry || entry.role !== "council" || entry.feedback) return;
    setEntries((e) => e.map((x, j) => (j === i && x.role === "council" ? { ...x, feedback: f } : x)));
    try {
      await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId: entry.result.questionId, token: entry.result.token, feedback: f }) });
    } catch {}
  }

  const busy = phase === "transcribing" || phase === "thinking";
  const orbLabel = phase === "idle" ? (entries.length ? t.tapToTalk : t.start) : phase === "listening" ? t.listening : phase === "speaking" || phase === "greeting" ? t.speaking : t.thinking;

  return (
    <div className="talk">
      <div className="talk-stage">
        <button
          type="button"
          className={`talk-orb is-${phase}`}
          onClick={start}
          aria-label={orbLabel}
          aria-pressed={phase !== "idle"}
          disabled={busy}
          style={{ ["--level" as string]: level.toFixed(3) }}
        >
          <span className="talk-ring" aria-hidden="true" />
          <span className="talk-ring talk-ring-2" aria-hidden="true" />
          <svg viewBox="0 0 24 24" aria-hidden="true" className="talk-icon">
            {phase === "speaking" || phase === "greeting" ? (
              <path d="M4 9v6h4l5 4V5L8 9H4Zm12.5-1.5a5 5 0 0 1 0 9M19 4.5a9 9 0 0 1 0 15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            ) : busy ? (
              <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="11 33" strokeLinecap="round" className="talk-spin" />
            ) : (
              <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0M12 19v3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
        </button>
        <p className="talk-status" role="status" aria-live="polite">{status || (supported ? t.start : t.notSupported)}</p>
        {phase !== "idle" ? (
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => endSession(t.ended)}>{t.stop}</button>
        ) : null}
        {notice ? <p className="talk-notice" role="alert">{notice}</p> : null}
      </div>

      <div className="talk-controls">
        <label className="small flex items-center gap-2">
          <span className="muted">{t.language}</span>
          <select value={lang} onChange={(e) => setLang(e.target.value as UiLang)} disabled={phase !== "idle"} style={{ width: "auto", padding: "0.3rem 0.5rem" }}>
            {LANGS.map((l) => <option key={l.code} value={l.code} lang={l.code === "en" ? "en" : l.code}>{l.label}</option>)}
          </select>
        </label>
        <label className="small flex items-center gap-2">
          <input type="checkbox" checked={handsFree} onChange={(e) => setHandsFree(e.target.checked)} style={{ width: "1.1rem", height: "1.1rem" }} />
          <span>{t.handsFree}</span>
        </label>
      </div>

      {entries.length ? (
        <ol className="talk-log" ref={logRef} aria-label="Conversation">
          {entries.map((e, i) => (
            <li key={e.at + e.role} className={`talk-turn is-${e.role}`}>
              <span className="talk-who">{e.role === "you" ? t.you : lgaName}</span>
              <p className={e.role === "council" ? "answer" : ""} lang={e.role === "council" ? (HTML_LANG[e.result.language] ?? "en-NG") : undefined}>{e.text}</p>
              {e.role === "council" ? (
                e.result.answered && e.result.citations.length ? (
                  <div className="stamp stamp-in">
                    <div><strong>{t.fromRecords.replace("%n", String(e.result.citations.length))}</strong></div>
                    <ul className="grid gap-0.5">
                      {e.result.citations.map((c) => (
                        <li key={c.id}><Link href={recordPath(lgaId, c)}>{c.id}</Link> {c.label}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="stamp stamp-caution"><div>{t.notInRecords}</div></div>
                )
              ) : null}
              {e.role === "council" ? (
                <div className="flex items-center gap-2 small">
                  <span className="muted">{t.wasUseful}</span>
                  <button type="button" className="btn btn-quiet btn-sm" onClick={() => sendFeedback(i, "up")} disabled={Boolean(e.feedback)}>{e.feedback === "up" ? t.thanks : t.yes}</button>
                  <button type="button" className="btn btn-quiet btn-sm" onClick={() => sendFeedback(i, "down")} disabled={Boolean(e.feedback)}>{e.feedback === "down" ? t.thanks : t.no}</button>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      ) : suggestions.length ? (
        <div className="grid gap-1">
          <p className="small muted">{t.suggestionsTitle}</p>
          <ul className="suggest" lang="en">
            {suggestions.map((s) => (
              <li key={s}><button type="button" onClick={() => submitTyped(undefined, s)} disabled={busy}>{s}</button></li>
            ))}
          </ul>
        </div>
      ) : null}

      <form onSubmit={submitTyped} className="talk-type">
        <label htmlFor={`talk-type-${lgaId}`} className="small muted">{t.typeInstead}</label>
        <div className="flex gap-2">
          <input id={`talk-type-${lgaId}`} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={t.typePlaceholder} maxLength={1000} enterKeyHint="send" />
          <button type="submit" className="btn" disabled={busy || !typed.trim()}>{t.send}</button>
        </div>
      </form>

      <p className="small muted">{t.poweredBy}{!serverVoice ? ` ${t.voiceDown}` : ""}</p>
    </div>
  );
}
