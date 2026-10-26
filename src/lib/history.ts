import { scrubPii } from "./pii.ts";

/** One earlier exchange in a conversation, sent back by the browser so follow-ups make sense. */
export type Turn = { question: string; answer: string };
export const MAX_HISTORY = 3;

/**
 * Keeps at most the last MAX_HISTORY well-formed turns, each trimmed and capped, and scrubbed
 * of personal details like the question itself. Anything malformed is dropped, never rejected,
 * so a bad history can only cost context, not the answer.
 */
export function sanitizeHistory(raw: unknown): Turn[] {
  if (!Array.isArray(raw)) return [];
  const turns: Turn[] = [];
  for (const t of raw.slice(-MAX_HISTORY)) {
    if (!t || typeof t !== "object") continue;
    const q = typeof (t as Turn).question === "string" ? (t as Turn).question.trim().slice(0, 500) : "";
    const a = typeof (t as Turn).answer === "string" ? (t as Turn).answer.trim().slice(0, 1000) : "";
    if (!q || !a) continue;
    turns.push({ question: scrubPii(q).text, answer: scrubPii(a).text });
  }
  return turns;
}
