"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Citation = { type: string; id: string; label: string };
type Result = {
  questionId: number;
  language: string;
  answered: boolean;
  answer: string;
  citations: Citation[];
  escalate: boolean;
  disclaimer: "none" | "legal" | "medical";
  latencyMs: number;
  figureCheck: string;
};

const PLACEHOLDERS = [
  "Wetin happen to the Rukpokwu market project?",
  "What documents do I need for an LGA identification letter?",
  "Which boreholes in Ozuoba are working?",
  "Wanne ofishi ne ke ba da takardar shaidar kasuwanci?",
  "Kí ni mo nílò láti forúkọ sílẹ̀ fún ilé ìtajà?",
  "Kedu ihe m ga-eme ka m nweta akwụkwọ ọmụmụ?",
];

const SPEECH_LANGS: { code: string; label: string; note?: string }[] = [
  { code: "en-NG", label: "English" },
  { code: "en-NG", label: "Pidgin", note: "Pidgin is recognised through the English model. Check the words before you send." },
  { code: "ha-NG", label: "Hausa", note: "Hausa voice recognition is experimental in most browsers. Check the words before you send." },
  { code: "yo-NG", label: "Yoruba", note: "Yoruba voice recognition is experimental in most browsers. Check the words before you send." },
  { code: "ig-NG", label: "Igbo", note: "Igbo voice recognition is experimental in most browsers. Check the words before you send." },
];

function recordPath(lgaId: string, c: Citation): string {
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
      return `/${lgaId}/documents/${c.id}`;
    default:
      return `/${lgaId}`;
  }
}

export function AskBox({
  lgaId,
  audience = "resident",
  scope = "public",
  compact = false,
}: {
  lgaId: string;
  audience?: "resident" | "investor" | "staff";
  scope?: "public" | "internal";
  compact?: boolean;
}) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [placeholder, setPlaceholder] = useState(PLACEHOLDERS[0]);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [showPerson, setShowPerson] = useState(false);
  const [ticketDone, setTicketDone] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagDone, setFlagDone] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechLang, setSpeechLang] = useState(0);
  const recRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    setPlaceholder(PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]);
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    setSpeechSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const question = q.trim();
    if (!question || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setFeedback(null);
    setShowPerson(false);
    setTicketDone(false);
    setFlagOpen(false);
    setFlagDone(false);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lgaId, question, audience, scope }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setResult(data as Result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function toggleListen() {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = SPEECH_LANGS[speechLang].code;
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (ev) => {
      let text = "";
      for (let i = 0; i < ev.results.length; i++) text += ev.results[i][0].transcript;
      setQ(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => {
      setListening(false);
      setError("Voice input did not work here. Type the question instead.");
    };
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  async function sendFeedback(f: "up" | "down") {
    if (!result) return;
    setFeedback(f);
    await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId: result.questionId, feedback: f }) });
  }

  async function sendFlag(formData: FormData) {
    if (!result) return;
    const note = String(formData.get("note") ?? "");
    await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId: result.questionId, flag: note }) });
    setFlagDone(true);
    setFlagOpen(false);
  }

  async function sendTicket(formData: FormData) {
    if (!result) return;
    const contact = String(formData.get("contact") ?? "");
    await fetch("/api/ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lgaId, questionId: result.questionId, summary: q.trim(), contact }),
    });
    setTicketDone(true);
    setShowPerson(false);
  }

  const note = SPEECH_LANGS[speechLang].note;

  return (
    <div className="measure">
      <form onSubmit={submit} className="grid gap-2">
        <label htmlFor={`ask-${lgaId}`} className={compact ? "sr-only" : "font-bold"}>
          Ask a question in English, Pidgin, Hausa, Yoruba or Igbo
        </label>
        <textarea
          id={`ask-${lgaId}`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          rows={compact ? 2 : 3}
          maxLength={1000}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) submit(e);
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" className="btn" disabled={busy || !q.trim()}>
            {busy ? "Looking in the records" : "Get the answer"}
          </button>
          {speechSupported ? (
            <>
              <button type="button" className={`btn btn-quiet ${listening ? "font-bold" : ""}`} onClick={toggleListen} aria-pressed={listening}>
                {listening ? "Stop listening" : "Speak the question"}
              </button>
              <label className="small muted flex items-center gap-1">
                <span>Voice language</span>
                <select value={speechLang} onChange={(e) => setSpeechLang(Number(e.target.value))} style={{ width: "auto", padding: "0.25rem 0.4rem" }}>
                  {SPEECH_LANGS.map((l, i) => (
                    <option key={l.label} value={i}>{l.label}</option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <span className="small muted">Voice input needs Chrome or Edge.</span>
          )}
        </div>
        {speechSupported && note ? <p className="small muted">{note}</p> : null}
      </form>

      {error ? (
        <p className="mt-4" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      ) : null}

      {result ? (
        <section className="mt-6 grid gap-4" aria-live="polite">
          <p className="answer">{result.answer}</p>

          {result.disclaimer !== "none" ? (
            <p className="small muted">
              {result.disclaimer === "legal"
                ? "This is what the records say. It is not legal advice."
                : "This is what the records say. It is not medical advice. For an emergency go to the nearest health centre."}
            </p>
          ) : null}

          {result.answered && result.citations.length ? (
            <div className="stamp stamp-in">
              <div><strong>Verified</strong> answer from {result.citations.length === 1 ? "one record" : `${result.citations.length} records`}</div>
              <ul className="grid gap-0.5">
                {result.citations.map((c) => (
                  <li key={c.id}>
                    <Link href={recordPath(lgaId, c)}>{c.id}</Link> {c.label}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="stamp" style={{ borderColor: "var(--caution)", color: "var(--caution)" }}>
              <div>Not in the approved records{result.figureCheck === "failed" ? " (a figure could not be verified, so the answer was withheld)" : ""}</div>
              <div>This question has been added to the LGA&apos;s list of gaps to fill.</div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 small">
            <span className="muted">Was this useful?</span>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => sendFeedback("up")} disabled={feedback !== null}>
              {feedback === "up" ? "Thanks" : "Yes"}
            </button>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => sendFeedback("down")} disabled={feedback !== null}>
              {feedback === "down" ? "Noted" : "No"}
            </button>
            <span className="muted" aria-hidden="true">|</span>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => setShowPerson((v) => !v)}>
              Talk to a person
            </button>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => setFlagOpen((v) => !v)} disabled={flagDone}>
              {flagDone ? "Flag sent" : "Flag a wrong answer"}
            </button>
          </div>

          {result.escalate && !showPerson && !ticketDone ? (
            <p className="small">This looks like something a named officer should handle. Use &quot;Talk to a person&quot; and the LGA will call you back.</p>
          ) : null}

          {showPerson ? (
            <form action={sendTicket} className="grid gap-2 border border-rule p-3" style={{ borderRadius: 2 }}>
              <p className="small">Your question goes to a named officer as a ticket. Leave a phone number for the reply. The number is stored for the officer only and is never sent to the answer service.</p>
              <input name="contact" placeholder="Phone number for the reply (optional)" inputMode="tel" />
              <div className="flex gap-2">
                <button type="submit" className="btn btn-sm">Send to an officer</button>
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => setShowPerson(false)}>Cancel</button>
              </div>
            </form>
          ) : null}
          {ticketDone ? <p className="small">Sent. An officer will follow up.</p> : null}

          {flagOpen ? (
            <form action={sendFlag} className="grid gap-2 border border-rule p-3" style={{ borderRadius: 2 }}>
              <label htmlFor="flag-note" className="small">What is wrong with this answer?</label>
              <textarea id="flag-note" name="note" rows={2} required maxLength={500} />
              <div className="flex gap-2">
                <button type="submit" className="btn btn-sm">Send flag</button>
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => setFlagOpen(false)}>Cancel</button>
              </div>
            </form>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};
