# AskLGA

A public-interest web app that makes Nigerian local government understandable and answerable. Residents, investors and LGA staff ask a question in English, Pidgin, Hausa, Yoruba or Igbo and get an answer generated only from records the LGA has approved, with the source stamped on it.

Built from the plan in `Documents/AskLGA-Build-Plan`. Twelve goals, one means: an answer layer over registers the LGA never had.

## What is in the box

Public portal, one per LGA (`/{lga}`)
- Ask box with typed or spoken questions (browser speech recognition), answers with a source stamp, thumbs up/down, "talk to a person" tickets, and "flag a wrong answer".
- Projects register with map, status, sponsor, budget line, contractor, evidence and status history; resident site reports, moderated before they show.
- Public assets inventory with condition and last inspection.
- Service directory: steps, documents, office, responsible role, contact.
- Investment profile with an investor ask box and enquiry form.
- Public documents (budgets, minutes, notices) quoted by the answer engine.
- Open data: every register as JSON and CSV at stable URLs, plus a one-line embeddable widget (`/widget.js`).

Staff workspace (`/admin`, passcode sign-in)
- Internal ask over public and internal documents.
- Editors for projects (with field status updates and evidence), assets, services, investment profile sections and documents, each with source, approval and last-verified fields. Only approved records reach the public portal and the answer engine.
- Data-gap queue (unanswered questions), flagged answers, tickets, investor enquiries.
- Monthly one-page report and a handover pack for a change of administration.

Answer engine (`src/lib/ask.ts`)
- PII scrubbed before logging or any model call.
- Switchable model provider (`ASKLGA_PROVIDER=gemini|anthropic`): Gemini (`gemini-3.5-flash-lite` by default, called over REST; on a free key the larger Flash models are capped at about 20 requests a day each, so enable billing before switching up) or Claude (`claude-opus-5`). Both return the same structured output: language, answer, citations, escalate, disclaimer.
- The LGA's approved registers are sent as a system block (cached on Anthropic); document passages come from Postgres full-text search.
- Post-checks: citations must be real approved records; an answer without a valid citation becomes a refusal; any figure of four or more digits must appear in a cited record or the answer is withheld and the question logged as a gap.

## Run it

```
npm install
copy .env.example .env.local     # set GEMINI_API_KEY (or ANTHROPIC_API_KEY) and ADMIN_PASSCODE
npm run dev
```

Open http://localhost:3000. With no `DATABASE_URL`, an embedded Postgres (PGlite) is created under `data/pglite` and seeded with demo records for Obio/Akpor LGA (every demo record says so in its source field, and the portal shows a demo banner).

Production: set `DATABASE_URL` to a Postgres hosted in Nigeria (demo records are never seeded when it is set), a long `ADMIN_PASSCODE`, a random `SESSION_SECRET`, `NEXT_PUBLIC_BASE_URL`, and the model key. Ship `src/db/migrations` with the build (it is traced automatically for standalone output). Enter real records through the staff workspace or a migration.

## Safety and limits

- **Public answers are budgeted.** Six questions a minute and sixty a day per connection, two thousand a day per LGA (`ASK_RATE_*`). Ticket, report, enquiry and feedback posts are limited to five or twenty a minute per connection. Buckets are in memory; a multi-server deployment should move them to Postgres or Redis.
- **Sign-in is throttled** to five attempts a minute per connection, the placeholder passcode is refused, and every workspace page is gated by middleware on every request, not only by the layout.
- **Sessions expire** after twelve hours server-side; the cookie is signed with `SESSION_SECRET` and is `Secure` in production.
- **Ratings and flags are bound to the answer** they belong to through a token returned by `/api/ask`, so they cannot be set on someone else's question.
- **Instruction-like questions are refused** before the model is called, in addition to the citation and figure checks. Repeats of an unanswered question do not add duplicate rows to the data-gap queue.
- **Links are scheme-checked** (http/https only) everywhere a resident or officer can enter one, and CSV cells that would run as spreadsheet formulas are neutralised.
- **Headers:** every page is `frame-ancestors 'none'` except `/{lga}/embed`, which any site may frame through the widget; `nosniff` and a strict referrer policy are set.
- **Privacy:** `/privacy` explains what is stored under the NDPA 2023; `/about-answers` explains the five checks behind every answer.

If `npm install` stalls behind a slow or intercepting proxy, `scripts/fetch-pkg.mjs` downloads and extracts packages directly:

```
node --use-system-ca scripts/fetch-pkg.mjs zod@^4 drizzle-orm@0.45.3 @electric-sql/pglite@0.5.8
```

## Evaluate

```
npm run eval -- http://localhost:3000 <staff name> <ADMIN_PASSCODE>   # server must be running; the last two arguments enable the internal-scope case
```

Runs `eval/questions.json` (20 cases: five languages, investor and staff audiences, out-of-scope and PII cases, one internal-document case) through the engine and writes a scored result to `eval/results/`. The build plan's launch bar is zero invented figures and at least 95 percent on the rubric.

## What is prototype-grade

- Staff sign-in is one shared passcode and a self-declared name. Replace with per-officer accounts and roles before real use; until then, anyone with the passcode is an administrator of every LGA on the server.
- Internal-scope questions send passages from internal documents to the model provider. The build plan's rule is public content only for foreign inference; keep the private index empty, or get the partner's written sign-off, until a Nigerian-hosted model is configured.
- Escalation has no SMS or email alert yet; an officer must open the workspace to see new tickets.
- The interface text is English only. Answers and refusals come back in the question's language, but a language switcher for the pages has not been built.
- Voice input uses the browser's speech recognition. Hausa, Yoruba and Igbo recognition is experimental; the plan's speech-to-text bake-off has not been run.
- Refusal messages in Hausa, Yoruba and Igbo have not had native-speaker review.
- Photo evidence is by link only; there is no upload store yet.
- The register block is sent whole to the model. For an LGA with thousands of records, switch to retrieval-only for the registers too.
