"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Dict, UiLang } from "@/lib/i18n";

type Citation = { type: string; id: string; label: string };
type Result = {
  questionId: number;
  token: string;
  language: string;
  answered: boolean;
  answer: string;
  citations: Citation[];
  escalate: boolean;
  disclaimer: "none" | "legal" | "medical";
  latencyMs: number;
  figureCheck: string;
  mode?: "model" | "search" | "none";
};

type Problem = { kind: "offline" | "busy" | "network" | "input" | "server"; message: string };

const PLACEHOLDERS = [
  "Wetin happen to the market project for my area?",
  "What documents do I need for an LGA identification letter?",
  "Which boreholes in my ward are working?",
  "Wanne ofishi ne ke ba da takardar shaidar kasuwanci?",
  "Kí ni mo nílò láti forúkọ sílẹ̀ fún ilé ìtajà?",
  "Kedu ihe m ga-eme ka m nweta akwụkwọ ọmụmụ?",
];

/** Voice languages, each recognised by an N-ATLAS speech model (NCAIR1) through /api/voice. */
const SPEECH_LANGS: { code: UiLang; label: string; note?: string }[] = [
  { code: "en", label: "English" },
  { code: "pcm", label: "Pidgin", note: "Pidgin is recognised through the Nigerian English model." },
  { code: "ha", label: "Hausa" },
  { code: "yo", label: "Yoruba" },
  { code: "ig", label: "Igbo" },
];
/** Longest recording; the voice service reads up to 60 s, a question rarely needs 30. */
const MAX_RECORD_MS = 30000;

const HTML_LANG: Record<string, string> = { en: "en-NG", pcm: "pcm", ha: "ha", yo: "yo", ig: "ig" };
const SPEECH_DEFAULT: Record<UiLang, number> = { en: 0, pcm: 1, ha: 2, yo: 3, ig: 4 };

const SLOW_AFTER_MS = 8000;
const GIVE_UP_AFTER_MS = 50000;

function recordPath(lgaId: string, c: Citation, scope: "public" | "internal"): string {
  switch (c.type) {
    case "project":
      return `/${lgaId}/projects/${c.id}`;
    case "service":
      return `/${lgaId}/services/${c.id}`;
    case "asset":
      return `/${lgaId}/assets#${c.id}`;
    case "profile":
      return `/${lgaId}/investment#${c.id}`;
    case "document":
      // Internal documents have no public page; staff open them in the workspace.
      return scope === "internal" ? `/admin/${lgaId}/documents?edit=${c.id}#form` : `/${lgaId}/documents/${c.id}`;
    default:
      return `/${lgaId}`;
  }
}

export function AskBox({
  lgaId,
  audience = "resident",
  scope = "public",
  compact = false,
  t,
  lang = "en",
  suggestions = [],
}: {
  lgaId: string;
  audience?: "resident" | "investor" | "staff";
  scope?: "public" | "internal";
  compact?: boolean;
  t: Dict;
  lang?: UiLang;
  /** Example questions this council's records can answer; tapping one asks it. */
  suggestions?: string[];
}) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [placeholder, setPlaceholder] = useState(PLACEHOLDERS[1]);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [showPerson, setShowPerson] = useState(false);
  const [ticketId, setTicketId] = useState<number | null>(null);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [ticketPending, setTicketPending] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagDone, setFlagDone] = useState(false);
  const [flagError, setFlagError] = useState<string | null>(null);
  const [flagPending, setFlagPending] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [coarsePointer, setCoarsePointer] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [reading, setReading] = useState(false);
  const [speechLang, setSpeechLang] = useState(SPEECH_DEFAULT[lang] ?? 0);
  const [recSeconds, setRecSeconds] = useState(0);
  const recRef = useRef<{ stop: () => void } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const meterRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    setPlaceholder(PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]);
    // Voice needs only a microphone and MediaRecorder; recognition happens on the server.
    setSpeechSupported(Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== "undefined");
    setCoarsePointer(window.matchMedia("(pointer: coarse)").matches);
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const load = () => setVoices(synth.getVoices());
    load();
    synth.addEventListener("voiceschanged", load);
    return () => {
      synth.removeEventListener("voiceschanged", load);
      synth.cancel();
    };
  }, []);

  function resetFollowUps() {
    if (reading) window.speechSynthesis.cancel();
    setReading(false);
    setFeedback(null);
    setFeedbackError(null);
    setShowPerson(false);
    setTicketId(null);
    setTicketError(null);
    setFlagOpen(false);
    setFlagDone(false);
    setFlagError(null);
  }

  async function submit(e?: React.FormEvent, asked?: string) {
    e?.preventDefault();
    const question = (asked ?? q).trim();
    if (!question || busy) return;
    setBusy(true);
    setSlow(false);
    setProblem(null);
    setResult(null);
    resetFollowUps();
    const controller = new AbortController();
    abortRef.current = controller;
    const slowTimer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    const giveUp = setTimeout(() => controller.abort(), GIVE_UP_AFTER_MS);
    try {
      if (typeof navigator !== "undefined" && navigator.onLine === false) throw new Error("offline");
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lgaId, question, audience, scope }),
        signal: controller.signal,
      });
      let data: Partial<Result> & { error?: string; offline?: boolean; busy?: boolean } = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      if (!res.ok) {
        if (data.offline) setProblem({ kind: "offline", message: data.error ?? "" });
        else if (res.status === 429 || res.status === 503 || data.busy) setProblem({ kind: "busy", message: t.busy });
        else if (res.status === 400 || res.status === 404) setProblem({ kind: "input", message: data.error ?? t.checkQuestion });
        else setProblem({ kind: "server", message: t.serverProblem });
        return;
      }
      setResult(data as Result);
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      setProblem({ kind: "network", message: aborted ? t.tooLong : t.noConnection });
    } finally {
      clearTimeout(slowTimer);
      clearTimeout(giveUp);
      setBusy(false);
      setSlow(false);
    }
  }

  async function toggleListen() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    setProblem(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setProblem({ kind: "input", message: err instanceof DOMException && err.name === "NotAllowedError" ? t.voiceDenied : t.voiceFailed });
      return;
    }
    const type = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"].find((m) => MediaRecorder.isTypeSupported(m));
    const rec = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 32000 } : undefined);
    const chunks: Blob[] = [];
    const lang = SPEECH_LANGS[speechLang].code;
    rec.ondataavailable = (ev) => {
      if (ev.data.size) chunks.push(ev.data);
    };
    const cap = setTimeout(() => rec.state !== "inactive" && rec.stop(), MAX_RECORD_MS);
    const stopMeter = startMeter(stream);
    const started = Date.now();
    setRecSeconds(0);
    const tick = setInterval(() => setRecSeconds(Math.floor((Date.now() - started) / 1000)), 250);
    rec.onstop = async () => {
      clearTimeout(cap);
      clearInterval(tick);
      stopMeter();
      stream.getTracks().forEach((track) => track.stop());
      setListening(false);
      const blob = new Blob(chunks, { type: (rec.mimeType || type || "audio/webm").split(";")[0] });
      if (!blob.size) return;
      setTranscribing(true);
      try {
        const res = await fetch(`/api/voice?lang=${lang}`, { method: "POST", headers: { "Content-Type": blob.type }, body: blob });
        const out = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
        if (!res.ok || !out.text) {
          setProblem({ kind: "input", message: out.error || t.voiceFailed });
          return;
        }
        // The words go in the box so the resident can check them, and the question is asked
        // straight away so someone who does not type never has to.
        setQ(out.text);
        submit(undefined, out.text);
      } catch {
        setProblem({ kind: "input", message: t.voiceFailed });
      } finally {
        setTranscribing(false);
      }
    };
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  /**
   * Drives the five bars beside the stop button from the microphone level, so a resident can see
   * they are being heard. Writes straight to the DOM each frame; no React state, no re-render.
   */
  function startMeter(stream: MediaStream): () => void {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return () => {};
    const ctx = new Ctx();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    let frame = 0;
    const draw = () => {
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
      const level = Math.min(1, peak / 64);
      meterRef.current?.querySelectorAll("span").forEach((bar, i) => {
        const shape = [0.55, 0.85, 1, 0.85, 0.55][i] ?? 1;
        bar.style.transform = `scaleY(${Math.max(0.2, level * shape)})`;
      });
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      ctx.close().catch(() => {});
    };
  }

  /** A device voice for the answer's language, if this phone or browser has one. */
  function voiceFor(language: string): SpeechSynthesisVoice | undefined {
    const want = language === "pcm" ? "en" : language;
    return voices.find((v) => v.lang.toLowerCase() === `${want}-ng`) ?? voices.find((v) => v.lang.toLowerCase().startsWith(want));
  }

  function toggleReading() {
    const synth = window.speechSynthesis;
    if (reading) {
      synth.cancel();
      setReading(false);
      return;
    }
    const voice = result ? voiceFor(result.language) : undefined;
    if (!result || !voice) return;
    const u = new SpeechSynthesisUtterance(result.answer);
    u.voice = voice;
    u.lang = voice.lang;
    u.onend = () => setReading(false);
    u.onerror = () => setReading(false);
    synth.cancel();
    synth.speak(u);
    setReading(true);
  }

  async function sendFeedback(f: "up" | "down") {
    if (!result) return;
    setFeedback(f);
    setFeedbackError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: result.questionId, token: result.token, feedback: f }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setFeedback(null);
      setFeedbackError(t.ratingNotSaved);
    }
  }

  async function sendFlag(formData: FormData) {
    if (!result || flagPending) return;
    const note = String(formData.get("note") ?? "").trim();
    if (!note) return;
    setFlagPending(true);
    setFlagError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: result.questionId, token: result.token, flag: note }),
      });
      if (!res.ok) throw new Error();
      setFlagDone(true);
      setFlagOpen(false);
    } catch {
      setFlagError(t.flagNotSent);
    } finally {
      setFlagPending(false);
    }
  }

  async function sendTicket(formData: FormData) {
    if (ticketPending) return;
    const contact = String(formData.get("contact") ?? "");
    const summary = q.trim();
    if (!summary) return;
    setTicketPending(true);
    setTicketError(null);
    try {
      const res = await fetch("/api/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lgaId, questionId: result?.questionId, summary, contact }),
      });
      const data = (await res.json().catch(() => ({}))) as { ticketId?: number; error?: string };
      if (!res.ok || !data.ticketId) throw new Error(data.error);
      setTicketId(data.ticketId);
      setShowPerson(false);
    } catch (err) {
      setTicketError(err instanceof Error && err.message ? err.message : t.ticketNotSent);
    } finally {
      setTicketPending(false);
    }
  }

  const note = SPEECH_LANGS[speechLang].note;
  const answerLang = result ? (HTML_LANG[result.language] ?? "en-NG") : "en-NG";
  const canReachPerson = problem?.kind === "offline" || problem?.kind === "busy" || problem?.kind === "server";

  // Ask and Speak sit straight under the box, so voice is on the first screen of a phone.
  const actions = (
    <div className="ask-actions">
      <button type="submit" className="btn" disabled={busy || !q.trim()} aria-busy={busy}>{busy ? t.looking : t.getAnswer}</button>
      {busy ? <button type="button" className="btn btn-quiet" onClick={() => abortRef.current?.abort()}>{t.stop}</button> : null}
      {speechSupported ? (
        <>
          <button type="button" className="btn btn-quiet btn-voice" onClick={toggleListen} aria-pressed={listening} disabled={busy || transcribing} aria-busy={transcribing}>
            {listening ? (
              <>
                <span className="rec-dot" aria-hidden="true" />
                <span>{t.stopRecording}</span>
                <span className="rec-meter" ref={meterRef} aria-hidden="true"><span /><span /><span /><span /><span /></span>
                <span className="rec-time" aria-hidden="true">0:{String(recSeconds).padStart(2, "0")} / 0:{MAX_RECORD_MS / 1000}</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                </svg>
                <span>{transcribing ? t.transcribing : t.speak}</span>
              </>
            )}
          </button>
        </>
      ) : null}
    </div>
  );

  const personForm = (
    <form action={sendTicket} className="grid gap-2 border border-rule p-3" style={{ borderRadius: 2 }}>
      <p className="small">{t.ticketIntro}</p>
      <label htmlFor={`ticket-contact-${lgaId}`} className="sr-only">{t.contactPlaceholder}</label>
      <input id={`ticket-contact-${lgaId}`} name="contact" placeholder={t.contactPlaceholder} inputMode="tel" autoComplete="tel" maxLength={40} />
      <div className="flex gap-2">
        <button type="submit" className="btn btn-sm" disabled={ticketPending} aria-busy={ticketPending}>{ticketPending ? t.sending : t.sendToOfficer}</button>
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => setShowPerson(false)} disabled={ticketPending}>{t.cancel}</button>
      </div>
      {ticketError ? <p className="small" role="alert" style={{ color: "var(--danger)" }}>{ticketError}</p> : null}
    </form>
  );

  const ticketDone = ticketId !== null ? (
    <p className="small">
      {t.ticketSent} <strong>#{ticketId}</strong>. {t.quoteIt}
    </p>
  ) : null;

  return (
    <div className="measure">
      <form onSubmit={submit} className="grid gap-2">
        <label htmlFor={`ask-${lgaId}`} className={compact ? "small" : "font-bold"}>{t.askLabel}</label>
        <textarea
          id={`ask-${lgaId}`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          rows={compact ? 2 : 3}
          maxLength={1000}
          enterKeyHint="send"
          aria-describedby={`ask-help-${lgaId}`}
          onKeyDown={(e) => {
            // Desktop: Enter sends, Shift+Enter breaks a line. Touch keyboards have no Shift for
            // a newline and tone-mark keyboards compose, so there Enter only breaks a line.
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && !coarsePointer) submit(e);
          }}
        />
        {actions}
        {speechSupported ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 small muted">
            <label className="flex items-center gap-1">
              <span>{t.voiceLanguage}</span>
              <select value={speechLang} onChange={(e) => setSpeechLang(Number(e.target.value))} style={{ width: "auto", padding: "0.25rem 0.4rem" }}>
                {SPEECH_LANGS.map((l, i) => (
                  <option key={l.label} value={i}>{l.label}</option>
                ))}
              </select>
            </label>
            <details className="voice-note">
              <summary>{t.voiceByShort}</summary>
              <p>{t.voiceBy}{note ? <span lang="en"> {note}</span> : null}</p>
            </details>
          </div>
        ) : null}
        <p id={`ask-help-${lgaId}`} className="small muted">{t.askHelp}</p>
        {suggestions.length && !result && !busy ? (
          <div className="grid gap-1" lang="en">
            <p className="small muted">{t.tryAsking}</p>
            <ul className="suggest">
              {suggestions.map((s) => (
                <li key={s}>
                  <button type="button" onClick={() => { setQ(s); submit(undefined, s); }}>{s}</button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </form>

      <div aria-live="polite" className="grid gap-4">
        {busy && slow ? <p className="mt-3 small muted" role="status">{t.stillLooking}</p> : null}

        {problem && (problem.kind === "input" || problem.kind === "network") ? (
          <p className="mt-4" role="alert" style={{ color: "var(--danger)" }}>{problem.message}</p>
        ) : null}

        {problem && canReachPerson ? (
          <section className="mt-4 grid gap-3">
            <div className="stamp stamp-caution" role="status">
              <div><strong>{problem.kind === "offline" ? t.pausedTitle : t.tryAgainTitle}</strong></div>
              <div>{problem.message}</div>
              <div>{t.browseStill}</div>
              <div className="flex flex-wrap gap-x-3">
                <Link href={`/${lgaId}/services`}>{t.nav.services}</Link>
                <Link href={`/${lgaId}/projects`}>{t.nav.projects}</Link>
                <Link href={`/${lgaId}/documents`}>{t.nav.documents}</Link>
              </div>
            </div>
            {ticketId !== null ? ticketDone : showPerson ? personForm : (
              <button type="button" className="btn btn-quiet btn-sm justify-self-start" onClick={() => setShowPerson(true)}>{t.talkToPerson}</button>
            )}
          </section>
        ) : null}

        {result ? (
          <section className="mt-6 grid gap-4">
            <p className="answer" lang={answerLang}>{result.answer}</p>
            {voiceFor(result.language) ? (
              <button type="button" className="btn btn-quiet btn-sm justify-self-start" onClick={toggleReading} aria-pressed={reading}>{reading ? t.stopReading : t.listen}</button>
            ) : null}
            {result.mode === "search" ? <p className="small muted">{t.searchModeNote}</p> : null}

            {result.disclaimer !== "none" ? <p className="small muted">{result.disclaimer === "legal" ? t.legal : t.medical}</p> : null}

            {result.answered && result.citations.length ? (
              <div className="stamp stamp-in">
                <div><strong>{result.citations.length === 1 ? t.verifiedFromOne : t.verifiedFromMany.replace("%n", String(result.citations.length))}</strong></div>
                <ul className="grid gap-0.5">
                  {result.citations.map((c) => (
                    <li key={c.id}>
                      <Link href={recordPath(lgaId, c, scope)}>{c.id}</Link> {c.label}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="stamp stamp-caution">
                <div>{t.notInRecords}{result.figureCheck === "failed" ? ` ${t.figureWithheld}` : ""}</div>
                <div>{t.addedToGaps}</div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 small">
              <span className="muted">{t.wasUseful}</span>
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => sendFeedback("up")} disabled={feedback !== null}>{feedback === "up" ? t.thanks : t.yes}</button>
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => sendFeedback("down")} disabled={feedback !== null}>{feedback === "down" ? t.noted : t.no}</button>
              <span className="muted" aria-hidden="true">|</span>
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => setShowPerson((v) => !v)} disabled={ticketId !== null}>
                {ticketId !== null ? `#${ticketId}` : t.talkToPerson}
              </button>
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => setFlagOpen((v) => !v)} disabled={flagDone}>{flagDone ? t.flagSent : t.flagWrong}</button>
            </div>
            {feedbackError ? <p className="small" role="alert" style={{ color: "var(--danger)" }}>{feedbackError}</p> : null}

            {result.escalate && !showPerson && ticketId === null ? <p className="small">{t.escalateHint}</p> : null}

            {showPerson ? personForm : null}
            {ticketDone}

            {flagOpen ? (
              <form action={sendFlag} className="grid gap-2 border border-rule p-3" style={{ borderRadius: 2 }}>
                <label htmlFor={`flag-note-${lgaId}`} className="small">{t.flagWhat}</label>
                <textarea id={`flag-note-${lgaId}`} name="note" rows={2} required maxLength={500} />
                <div className="flex gap-2">
                  <button type="submit" className="btn btn-sm" disabled={flagPending} aria-busy={flagPending}>{flagPending ? t.sending : t.sendFlag}</button>
                  <button type="button" className="btn btn-quiet btn-sm" onClick={() => setFlagOpen(false)} disabled={flagPending}>{t.cancel}</button>
                </div>
                {flagError ? <p className="small" role="alert" style={{ color: "var(--danger)" }}>{flagError}</p> : null}
              </form>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
