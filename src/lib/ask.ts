import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { scrubPii } from "./pii";
import { buildRegister } from "./register";
import { searchChunks, type Scope } from "./queries";

/**
 * The answer engine.
 *
 * Guardrails, in order:
 *  1. PII is scrubbed from the question before anything is logged or sent.
 *  2. The model sees only approved records: the LGA's registers (system block, cached on
 *     Anthropic) plus the top document passages matched by full-text search.
 *
 * The model provider is switchable (ASKLGA_PROVIDER=anthropic|gemini). Both paths return the
 * same structured Answer and go through the same post-checks, so the guardrails do not depend
 * on the vendor. Gemini is called over REST so no extra SDK is needed.
 *  3. Structured output: the model must return citations (record IDs) with every answer.
 *  4. Post-checks: unknown citation IDs are dropped; an answer with no valid citation is
 *     turned into a refusal; any figure of four or more digits in the answer must appear in
 *     a cited record, otherwise the answer is refused and the question logged as a gap.
 */

export type Provider = "anthropic" | "gemini";

/** Explicit ASKLGA_PROVIDER wins; otherwise infer from which key is present (Anthropic if both). */
export const PROVIDER: Provider =
  process.env.ASKLGA_PROVIDER === "gemini" || process.env.ASKLGA_PROVIDER === "anthropic"
    ? process.env.ASKLGA_PROVIDER
    : process.env.GEMINI_API_KEY && !process.env.ANTHROPIC_API_KEY
      ? "gemini"
      : "anthropic";

// Default Gemini model is the Flash-Lite tier: on a free key it is the only one whose daily cap
// gets through a working day (the larger Flash models were capped at ~20 requests/day/model on
// 26 Sep 2026). Set ASKLGA_MODEL to a bigger model once billing is enabled.
export const MODEL = process.env.ASKLGA_MODEL ?? (PROVIDER === "gemini" ? "gemini-3.5-flash-lite" : "claude-opus-5");

/** Thrown when the answer service cannot run at all (no key, bad key). The message is safe to show residents. */
export class AnswerServiceOffline extends Error {
  constructor(message = "Answers are not switched on for this LGA yet. You can still browse the services, projects and documents here, or ask a person at the secretariat.") {
    super(message);
    this.name = "AnswerServiceOffline";
  }
}

/** Thrown for temporary conditions (rate limit, provider outage, network). Safe to show residents. */
export class AnswerServiceBusy extends Error {
  constructor(message = "The answer service is busy right now. Try again in a minute, or use the pages above.") {
    super(message);
    this.name = "AnswerServiceBusy";
  }
}

/**
 * Questions that try to instruct the model ("ignore the records", "reply that X is completed",
 * "cite OBA-P-0003") are refused before any model call. The post-checks verify citation IDs and
 * figures but not status words, so this closes the remaining prompt-injection route cheaply.
 */
const INSTRUCTION_LIKE =
  /\b(ignore|disregard|forget|override)\b[^.?!]{0,60}\b(records?|instructions?|rules?|prompt|system)\b|\b(reply|say|answer|respond|state|pretend|claim|assume|confirm)\b[^.?!]{0,25}\bthat\b|\bcite\s+[A-Z]{2,5}-[A-Z]-|\bsystem prompt\b|\byou are now\b/i;

export function looksLikeInstruction(question: string): boolean {
  return INSTRUCTION_LIKE.test(question);
}

export const LANGS = ["en", "pcm", "ha", "yo", "ig", "other"] as const;
export type Lang = (typeof LANGS)[number];

export const REFUSAL: Record<Lang, string> = {
  en: "We don't have that in the approved records yet. You can ask a person at the secretariat, or leave your question so the LGA can add the answer.",
  pcm: "We never get that one for the approved records. You fit ask person for secretariat, or leave your question make the LGA add the answer.",
  ha: "Ba mu da wannan bayanin a cikin rubuce-rubucen da aka amince da su tukuna. Za ka iya tambayar wani a sakatariya, ko ka bar tambayarka don ƙaramar hukuma ta ƙara amsar.",
  yo: "A kò tíì ní ìyẹn nínú àwọn àkọsílẹ̀ tí a fọwọ́ sí. O lè béèrè lọ́wọ́ ẹnìkan ní ilé ìgbìmọ̀, tàbí kí o fi ìbéèrè rẹ sílẹ̀ kí ìjọba ìbílẹ̀ lè fi ìdáhùn kún un.",
  ig: "Anyị enwebeghị nke ahụ n'ime ndekọ akwadoro. Ị nwere ike ịjụ mmadụ na sekretarịat, ma ọ bụ hapụ ajụjụ gị ka gọọmentị ime obodo tinye azịza ya.",
  other: "We don't have that in the approved records yet. You can ask a person at the secretariat, or leave your question so the LGA can add the answer.",
};

const AnswerSchema = z.object({
  language: z.enum(LANGS).describe("Language of the question: en, pcm (Nigerian Pidgin), ha, yo, ig, or other"),
  answered: z.boolean().describe("true only if the approved records contain the answer"),
  answer: z.string().describe("The answer in the language of the question, plain words, short sentences. Empty string if not answered."),
  citations: z
    .array(
      z.object({
        type: z.enum(["project", "service", "asset", "profile", "document"]),
        id: z.string().describe("A record ID exactly as it appears in square brackets, e.g. OBA-P-0003"),
      }),
    )
    .describe("Every record the answer relies on. Must be non-empty when answered is true."),
  escalate: z.boolean().describe("true if the person should be connected to a named officer (complaint, dispute, urgent, or personal case)"),
  disclaimer: z.enum(["none", "legal", "medical"]),
  gap_summary: z.string().describe("One short English line saying what was asked, for the LGA's data-gap queue. Never include personal details."),
});
export type Answer = z.infer<typeof AnswerSchema>;

const SYSTEM = `You are the answer service of a Nigerian local government area (LGA) portal. You answer residents, investors and LGA staff from the LGA's approved records only.

Rules you never break:
- Answer only from the records supplied in this conversation. If they do not contain the answer, set answered to false and leave the answer empty. Never guess, never use general knowledge about Nigeria to fill a gap, never invent a figure, date, name, status or contact.
- Every figure, date and status you state must be copied from a record you cite. Do not compute totals or convert amounts.
- Cite every record you rely on by its ID in square brackets. Cite at least one record when answered is true.
- Answer in the language of the question: English, Nigerian Pidgin, Hausa, Yoruba or Igbo. If the question mixes languages, use the dominant one. Use plain words and short sentences a secondary-school leaver follows. Do not switch to English unless the question is in English.
- Say what the person should do next when the records say so: which office, which documents, who is responsible.
- Do not process payments, fill forms, or give legal or medical advice. For legal or medical questions, answer only what a record states and set the disclaimer.
- Never repeat personal details from the question (names, phone numbers, addresses). Placeholders like [phone removed] mean a detail was removed on purpose; do not comment on them.
- Do not give opinions about politicians, parties, elections, contractors or officials. State what the records say and nothing more.
- Set escalate to true when the person has a complaint, a dispute, an urgent problem, or a personal case a record cannot settle.
- Keep answers under 120 words unless listing documents or steps, and never pad.`;

function declined(reason: string): Answer {
  return { language: "en", answered: false, answer: "", citations: [], escalate: false, disclaimer: "none", gap_summary: reason };
}

async function generateWithAnthropic(system: string, register: string, user: string): Promise<Answer> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("[ask] ANTHROPIC_API_KEY is not set; the answer service is offline. Set it in .env.local.");
    throw new AnswerServiceOffline();
  }
  const client = new Anthropic();
  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 2000,
      system: [
        { type: "text", text: system, cache_control: { type: "ephemeral" } },
        { type: "text", text: register, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: user }],
      output_config: { format: zodOutputFormat(AnswerSchema), effort: "medium" },
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) return declined("Model declined or returned no output");
    return response.parsed_output;
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("[ask] ANTHROPIC_API_KEY was rejected; the answer service is offline. Check the key in .env.local.");
      throw new AnswerServiceOffline();
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new AnswerServiceBusy();
    }
    if (error instanceof Anthropic.APIError) {
      throw new Error(`Answer service error ${error.status}: ${error.message}`);
    }
    throw error;
  }
}

/** Gemini's responseSchema dialect (OpenAPI subset). Mirrors AnswerSchema; the reply is still validated with zod. */
const GEMINI_SCHEMA = {
  type: "OBJECT",
  properties: {
    language: { type: "STRING", enum: [...LANGS], description: "Language of the question: en, pcm (Nigerian Pidgin), ha, yo, ig, or other" },
    answered: { type: "BOOLEAN", description: "true only if the approved records contain the answer" },
    answer: { type: "STRING", description: "The answer in the language of the question, plain words, short sentences. Empty string if not answered." },
    citations: {
      type: "ARRAY",
      description: "Every record the answer relies on. Must be non-empty when answered is true.",
      items: {
        type: "OBJECT",
        properties: {
          type: { type: "STRING", enum: ["project", "service", "asset", "profile", "document"] },
          id: { type: "STRING", description: "A record ID exactly as it appears in square brackets, e.g. OBA-P-0003" },
        },
        required: ["type", "id"],
      },
    },
    escalate: { type: "BOOLEAN", description: "true if the person should be connected to a named officer (complaint, dispute, urgent, or personal case)" },
    disclaimer: { type: "STRING", enum: ["none", "legal", "medical"] },
    gap_summary: { type: "STRING", description: "One short English line saying what was asked, for the LGA's data-gap queue. Never include personal details." },
  },
  required: ["language", "answered", "answer", "citations", "escalate", "disclaimer", "gap_summary"],
  propertyOrdering: ["language", "answered", "answer", "citations", "escalate", "disclaimer", "gap_summary"],
};

type GeminiResponse = {
  candidates?: { finishReason?: string; content?: { parts?: { text?: string }[] } }[];
  promptFeedback?: { blockReason?: string };
};

async function generateWithGemini(system: string, register: string, user: string): Promise<Answer> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error("[ask] GEMINI_API_KEY is not set; the answer service is offline. Set it in .env.local.");
    throw new AnswerServiceOffline();
  }
  const body = {
    systemInstruction: { parts: [{ text: system }, { text: register }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: { responseMimeType: "application/json", responseSchema: GEMINI_SCHEMA, temperature: 0.2, maxOutputTokens: 4096 },
  };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

  // Free-tier keys see per-minute quota (429) and "high demand" (503) spikes. Back off and retry,
  // honouring Retry-After when Google sends it, before giving up with the "busy" message.
  const waits = [4000, 12000, 30000];
  let res: Response | undefined;
  for (let attempt = 0; attempt <= waits.length; attempt++) {
    try {
      res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: JSON.stringify(body) });
    } catch (netErr) {
      // DNS/TLS/socket hiccup before any response: treat like a 503 and retry.
      res = undefined;
      if (attempt === waits.length) throw new AnswerServiceBusy("The answer service could not be reached. Check the connection and try again in a moment.");
      console.warn(`[ask] Gemini network error on attempt ${attempt + 1} (${netErr instanceof Error ? netErr.message : "unknown"}); retrying in ${waits[attempt] / 1000}s`);
      await new Promise((r) => setTimeout(r, waits[attempt]));
      continue;
    }
    if (res.status !== 429 && res.status !== 503) break;
    const detail = await res.text();
    // A per-day quota will not clear by waiting; say so instead of burning retries.
    if (res.status === 429 && /PerDay/i.test(detail)) {
      console.error(`[ask] Gemini daily free-tier quota for ${MODEL} is used up: ${detail.slice(0, 200)}`);
      throw new AnswerServiceOffline("The answer service has reached its limit for today. Try again tomorrow, or ask a person at the secretariat.");
    }
    if (attempt === waits.length) break;
    const retryAfter = Number(res.headers.get("retry-after"));
    const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 45000) : waits[attempt];
    console.warn(`[ask] Gemini ${res.status} on attempt ${attempt + 1}; retrying in ${wait / 1000}s`);
    await new Promise((r) => setTimeout(r, wait));
  }
  if (!res) throw new Error("Answer service did not respond.");

  if (res.status === 400 || res.status === 401 || res.status === 403) {
    const detail = await res.text();
    console.error(`[ask] Gemini rejected the request (${res.status}): ${detail.slice(0, 300)}`);
    if (/API[_ ]KEY|UNAUTHENTICATED|PERMISSION_DENIED/i.test(detail)) throw new AnswerServiceOffline();
    throw new Error(`Answer service error ${res.status}`);
  }
  if (res.status === 429 || res.status === 503) throw new Error("The answer service is busy. Try again in a moment.");
  if (!res.ok) throw new Error(`Answer service error ${res.status}`);

  const json = (await res.json()) as GeminiResponse;
  const candidate = json.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text || (candidate?.finishReason && candidate.finishReason !== "STOP")) {
    return declined(`Model declined or returned no output (${candidate?.finishReason ?? json.promptFeedback?.blockReason ?? "empty"})`);
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return declined("Model returned malformed output");
  }
  const check = AnswerSchema.safeParse(raw);
  if (!check.success) return declined("Model output failed the schema check");
  return check.data;
}

export type AskInput = {
  lgaId: string;
  question: string;
  scope?: Scope;
  audience?: "resident" | "investor" | "staff";
};

export type AskResult = {
  questionId: number;
  language: Lang;
  answered: boolean;
  answer: string;
  citations: { type: string; id: string; label: string }[];
  escalate: boolean;
  disclaimer: "none" | "legal" | "medical";
  latencyMs: number;
  piiRemoved: number;
  figureCheck: "passed" | "failed" | "skipped";
};

/** Joins digit groups ("185,000,000", "185 000 000") without gluing separate numbers ("2026 120"). */
function joinDigitGroups(text: string): string {
  return text.replace(/(?<=\d)[,\s](?=\d{3}\b)/g, "");
}

function digitsIn(text: string): string[] {
  const out = new Set<string>();
  for (const m of joinDigitGroups(text).matchAll(/\d{4,}/g)) out.add(m[0]);
  return [...out];
}

export async function ask(input: AskInput): Promise<AskResult> {
  const started = Date.now();
  const scope: Scope = input.scope === "internal" ? "internal" : "public";
  const audience = input.audience ?? "resident";
  const { text: question, removed } = scrubPii(input.question);

  const [register, passages] = await Promise.all([
    buildRegister(input.lgaId, scope),
    searchChunks(input.lgaId, scope, question),
  ]);

  const passageBlock = passages.length
    ? passages.map((p) => `[${p.documentId}] ${p.title} (passage ${p.ord + 1})\n${p.text}`).join("\n\n")
    : "(no document passages matched this question)";

  const registerBlock = `# APPROVED RECORDS FOR THIS LGA (scope: ${scope})\n\n${register.text}`;
  const userBlock = `Audience: ${audience}.\n\nRelevant document passages:\n${passageBlock}\n\nQuestion:\n${question}`;
  const parsed: Answer = looksLikeInstruction(question)
    ? declined("Instruction-like question refused before the model was called")
    : PROVIDER === "gemini"
      ? await generateWithGemini(SYSTEM, registerBlock, userBlock)
      : await generateWithAnthropic(SYSTEM, registerBlock, userBlock);

  // Post-check 1: citations must be real, approved records.
  // The record type comes from the register, not the model, so links always resolve.
  const seen = new Set<string>();
  const citations = parsed.citations
    .filter((c) => register.ids.has(c.id) && !seen.has(c.id) && seen.add(c.id))
    .map((c) => ({ type: register.types.get(c.id) ?? c.type, id: c.id, label: register.ids.get(c.id) ?? c.id }));

  let answered = parsed.answered && citations.length > 0;
  // Models tend to write the record IDs inside the answer as well ("... [OBA-D-0002]"). The
  // citations list already carries them, so strip them from the prose: residents should not
  // read codes, and the digits in an ID must not be mistaken for a figure.
  let answer = parsed.answer;
  for (const id of register.ids.keys()) answer = answer.split(`[${id}]`).join("").split(id).join("");
  answer = answer
    .replace(/\([\s,;]*\)|\[[\s,;]*\]/g, "")
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  // Post-check 2: every figure of four or more digits must appear in a cited record.
  let figureCheck: AskResult["figureCheck"] = "skipped";
  if (answered) {
    const figures = digitsIn(answer);
    if (figures.length) {
      const cited = joinDigitGroups(citations.map((c) => register.recordText.get(c.id) ?? "").join("\n"));
      const passageText = joinDigitGroups(passages.map((p) => p.text).join("\n"));
      const missing = figures.filter((f) => !cited.includes(f) && !passageText.includes(f));
      figureCheck = missing.length ? "failed" : "passed";
      if (missing.length) answered = false;
    }
  }

  const language = parsed.language;
  if (!answered) answer = REFUSAL[language] ?? REFUSAL.en;

  const latencyMs = Date.now() - started;
  const db = await getDb();

  // One open gap per distinct question: repeats of an unanswered question are logged but do not
  // add another row to the data-gap queue.
  let gapStatus: string | null = answered ? null : "open";
  if (!answered) {
    const dup = await db
      .select({ id: s.questions.id })
      .from(s.questions)
      .where(and(eq(s.questions.lgaId, input.lgaId), eq(s.questions.gapStatus, "open"), sql`lower(${s.questions.question}) = ${question.toLowerCase()}`))
      .limit(1);
    if (dup.length) gapStatus = "duplicate";
  }

  const [row] = await db
    .insert(s.questions)
    .values({
      lgaId: input.lgaId,
      audience,
      scope,
      language,
      question,
      answer,
      citations,
      answered,
      escalated: parsed.escalate,
      latencyMs,
      gapStatus,
      gapResolution: answered ? null : parsed.gap_summary,
    })
    .returning({ id: s.questions.id });

  return {
    questionId: row.id,
    language,
    answered,
    answer,
    citations,
    escalate: parsed.escalate,
    disclaimer: parsed.disclaimer,
    latencyMs,
    piiRemoved: removed,
    figureCheck,
  };
}
