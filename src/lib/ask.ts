import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { getDb, schema as s } from "@/db";
import { scrubPii } from "./pii";
import { buildRegister } from "./register";
import { searchChunks, type Scope } from "./queries";

/**
 * The answer engine.
 *
 * Guardrails, in order:
 *  1. PII is scrubbed from the question before anything is logged or sent.
 *  2. The model sees only approved records: the LGA's registers (cached system block)
 *     plus the top document passages matched by full-text search.
 *  3. Structured output: the model must return citations (record IDs) with every answer.
 *  4. Post-checks: unknown citation IDs are dropped; an answer with no valid citation is
 *     turned into a refusal; any figure of four or more digits in the answer must appear in
 *     a cited record, otherwise the answer is refused and the question logged as a gap.
 */

export const MODEL = process.env.ASKLGA_MODEL ?? "claude-opus-5";

/** Thrown when the answer service cannot run at all (no key, bad key). The message is safe to show residents. */
export class AnswerServiceOffline extends Error {
  constructor() {
    super("Answers are not switched on for this LGA yet. You can still browse the services, projects and documents here, or ask a person at the secretariat.");
    this.name = "AnswerServiceOffline";
  }
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

function digitsIn(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.replace(/[,\s](?=\d{3}\b)/g, "").matchAll(/\d{4,}/g)) out.add(m[0]);
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

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("[ask] ANTHROPIC_API_KEY is not set; the answer service is offline. Set it in .env.local.");
    throw new AnswerServiceOffline();
  }
  const client = new Anthropic();
  let parsed: Answer;
  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 2000,
      system: [
        { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
        { type: "text", text: `# APPROVED RECORDS FOR THIS LGA (scope: ${scope})\n\n${register.text}`, cache_control: { type: "ephemeral" } },
      ],
      messages: [
        {
          role: "user",
          content: `Audience: ${audience}.\n\nRelevant document passages:\n${passageBlock}\n\nQuestion:\n${question}`,
        },
      ],
      output_config: { format: zodOutputFormat(AnswerSchema), effort: "medium" },
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) {
      parsed = { language: "en", answered: false, answer: "", citations: [], escalate: false, disclaimer: "none", gap_summary: "Model declined or returned no output" };
    } else {
      parsed = response.parsed_output;
    }
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("[ask] ANTHROPIC_API_KEY was rejected; the answer service is offline. Check the key in .env.local.");
      throw new AnswerServiceOffline();
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new Error("The answer service is busy. Try again in a moment.");
    }
    if (error instanceof Anthropic.APIError) {
      throw new Error(`Answer service error ${error.status}: ${error.message}`);
    }
    throw error;
  }

  // Post-check 1: citations must be real, approved records.
  const citations = parsed.citations
    .filter((c) => register.ids.has(c.id))
    .map((c) => ({ type: c.type, id: c.id, label: register.ids.get(c.id) ?? c.id }));

  let answered = parsed.answered && citations.length > 0;
  let answer = parsed.answer;

  // Post-check 2: every figure of four or more digits must appear in a cited record.
  let figureCheck: AskResult["figureCheck"] = "skipped";
  if (answered) {
    const figures = digitsIn(answer);
    if (figures.length) {
      const cited = citations.map((c) => (register.recordText.get(c.id) ?? "").replace(/[,\s](?=\d{3}\b)/g, "")).join("\n");
      const passageText = passages.map((p) => p.text).join("\n").replace(/[,\s](?=\d{3}\b)/g, "");
      const missing = figures.filter((f) => !cited.includes(f) && !passageText.includes(f));
      figureCheck = missing.length ? "failed" : "passed";
      if (missing.length) answered = false;
    }
  }

  const language = parsed.language;
  if (!answered) answer = REFUSAL[language] ?? REFUSAL.en;

  const latencyMs = Date.now() - started;
  const db = await getDb();
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
      gapStatus: answered ? null : "open",
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
