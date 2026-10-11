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

## The national layer

Every one of Nigeria's 774 local government areas has a page from the first start: `src/db/lgas.json` (36 states and the FCT, with geopolitical zones) is merged into the `lgas` table on boot, and existing rows are never overwritten. An LGA that has not published records shows what the federal system publishes about it, still takes questions (logged as gaps, with no model call, so no quota is spent on a certain refusal), and links to `/join`.

- **Money** (`/{lga}/money`, `/money`): monthly Federation Account allocations per LGA (gross, deductions, net), a chart, month-on-month change, rank in state and nationally, and national rankings by total and per resident. Load published tables with `npm run import-faac -- faac.json` (JSON array of `{id, period, grossNgn?, deductionsNgn?, netNgn?, source, sourceUrl?}`; uses `DATABASE_URL` when set, never overwrites a month on file) or as CSV under Allocations in the workspace. Figures are shown as published; totals, change and ranks are calculated from them and labelled.
- **Maps and state pages** (`/state/{slug}`): real LGA and state boundaries from GRID3 via geoBoundaries (CC BY 4.0), pre-projected to SVG in `src/data/geo.json` by `npm run build-geo` (see the header of `scripts/geo/build_geo.py` for the two source files). Every page ships only its own state's shapes.
- **Profile facts**: headquarters, land area, 2006 census population, year created and senatorial district from `src/db/profiles.json`, each with its source URL, filled into empty fields on boot (a council's own values are never overwritten).
- **Compare** (`/compare?lgas=a,b`): up to four LGAs side by side.
- **Share cards and search**: per-LGA Open Graph images with the state map, `sitemap.xml` covering every LGA and state page, schema.org JSON-LD on LGA pages. Set `CONTACT_EMAIL` to show a contact address on `/about` and `/join`.
- **The LGA Record Standard** (`/standard`): the five rules and field definitions for every register, with JSON Schemas at `/api/standard/{projects,assets,services,investment,documents,allocations}.schema.json` and a DCAT-style catalogue of everything published at `/api/catalogue.json`.
- **Scoreboard** (`/scoreboard`): per LGA, approved records, questions and answer rate over 30 days, open gaps, and the latest test-set accuracy. The eval harness posts only which stored answer belongs to which test case; the server reloads those answers from its own question log (same LGA, last six hours, matching test question, every case once), scores them with the shared rubric in `src/lib/evalScore.mjs`, and stores the per-case result with the model and a sha256 of the test set (`JSON.stringify` of the parsed `eval/questions.json`, so line endings do not change it). Any run is inspectable at `/api/eval-result?run=<id>`. Runs from before server scoring are labelled staff-reported. A run is only as broad as the test set, and staff can still choose when to run it.
- **Insights** (`/insights`): the demand signal. Questions by state, language and audience, and the questions residents repeat that no LGA has a record for. Only questions asked more than once are listed.

## Staff accounts

- **First run:** sign in at `/admin` with `ADMIN_PASSCODE`, open Accounts, create the first administrator. The passcode then stops working. Or, with the server stopped: `npm run create-admin -- you@lga.gov.ng "Your Name" <password>`.
- **Roles:** admin manages accounts and everything below; editor changes records and closes gaps, flags and tickets; viewer reads the workspace and uses the internal search. An account bound to an LGA sees only that LGA; a server administrator sees all.
- Officers change their own password under Account. Admins reset passwords and disable accounts under Accounts; the last active admin cannot be removed.

## Internal documents and the model

`ASKLGA_INTERNAL_SCOPE=search` (the default) keeps the build plan's rule that a foreign model provider only sees public content: in the staff "Ask" page, internal documents are matched by keyword on the server and quoted directly, with no model call. `model` sends internal passages to the provider like public content; set it only with the partner's written sign-off or a Nigerian-hosted model.

## Alerts and connected sources

- New tickets, flagged answers and investor enquiries can be pushed by webhook, email (Resend) or SMS (Termii): see `.env.example`. Without a channel they only appear in the workspace, and the Tickets page says so.
- Documents can be imported from a web address (a state budget page, a Tracka project page) as drafts, and re-fetched later; a changed page goes back to draft for re-approval. PDF import is not available yet.

## Languages

The answer engine replies in the question's language. The page chrome (navigation, ask box, stamps, footer, home headings) is switchable between English, Pidgin, Hausa, Yoruba and Igbo from the header. English is the reviewed source; the other four are drafts and every page in them shows a "draft awaiting native-speaker review" line until `REVIEWED` in `src/lib/i18n.ts` is flipped after review.

## Deploy

`docker compose up --build` runs the portal with its own Postgres (see `docker-compose.yml`; copy `.env.example` to `.env` first). The image is a Next standalone build; put TLS in front and set `NEXT_PUBLIC_BASE_URL` to the https address so the session cookie is marked Secure. CI (`.github/workflows/ci.yml`) typechecks, lints, builds, boots the app and checks the key routes, then builds the container image. Licence: MIT.

## Deploy on Vercel (demo link)

Vercel is a fine host for the public demo and the submission link. It has no Nigerian region and it is serverless, so the pilot itself still belongs on a Nigerian-hosted server with the compose file above. Steps:

1. Import the GitHub repository into a Vercel project (framework: Next.js, defaults).
2. Storage tab: create a Postgres database (Neon through the Vercel Marketplace) and connect it to the project. This sets `DATABASE_URL`; use the pooled connection string.
3. Environment variables: `ADMIN_PASSCODE` (long passphrase, used once to create the first administrator), `SESSION_SECRET` (random, 32+ characters), `GEMINI_API_KEY`, `ASKLGA_PROVIDER=gemini`, `NEXT_PUBLIC_BASE_URL=https://<project>.vercel.app`, and `AUTO_SEED=true` if the Obio/Akpor demo records should be loaded.
4. Deploy. The first request runs the migrations and seeds the 774-LGA directory.
5. Open `/admin`, sign in with the passcode, create your administrator account under Accounts. The passcode then stops working.

Notes: the rate limiter is per serverless instance, so limits are looser than on one server; cold starts add a second or two while migrations are checked; the `output: "standalone"` setting is skipped automatically on Vercel.

## Safety and limits

- **Public answers are budgeted.** Six questions a minute and sixty a day per connection, two thousand a day per LGA (`ASK_RATE_*`). Ticket, report, enquiry and feedback posts are limited to five or twenty a minute per connection. Buckets are in memory; a multi-server deployment should move them to Postgres or Redis. The connection is identified from `x-vercel-forwarded-for` on Vercel, or from the right-hand end of `X-Forwarded-For` when `TRUST_PROXY_HOPS` says how many proxies you run; otherwise forwarded headers are ignored and all callers share one bucket. Self-hosted, never expose port 3000 directly (the compose file binds it to loopback).
- **Sign-in is throttled** in `signIn` itself, so the browser form and the JSON route share it: five attempts a minute per connection and ten per fifteen minutes per account (or for the bootstrap passcode), in memory per instance. The placeholder passcode is refused, and every workspace page is gated by middleware on every request, not only by the layout. Every action re-checks the account's role and LGA.
- **Sessions expire** after twelve hours server-side; the cookie is signed with `SESSION_SECRET` and is `Secure` in production.
- **Ratings and flags are bound to the answer** they belong to through a token returned by `/api/ask`, so they cannot be set on someone else's question.
- **Instruction-like questions are refused** before the model is called, in addition to the citation and figure checks. Repeats of an unanswered question do not add duplicate rows to the data-gap queue.
- **URL import cannot reach the private network:** redirects are followed by hand and each hop re-checked, and every address a name resolves to is checked at connect time (IPv4 and IPv6 private, loopback, link-local, CGNAT and mapped ranges), so DNS rebinding is refused.
- **Links are scheme-checked** (http/https only) everywhere a resident or officer can enter one, and CSV cells that would run as spreadsheet formulas are neutralised.
- **Headers:** every page is `frame-ancestors 'none'` except `/{lga}/embed`, which any site may frame through the widget; `nosniff` and a strict referrer policy are set.
- **Privacy:** `/privacy` explains what is stored under the NDPA 2023; `/about-answers` explains the five checks behind every answer.

If `npm install` stalls behind a slow or intercepting proxy, `scripts/fetch-pkg.mjs` downloads and extracts packages directly:

```
node --use-system-ca scripts/fetch-pkg.mjs zod@^4 drizzle-orm@0.45.3 @electric-sql/pglite@0.5.8
```

## Test

```
npm test       # PII scrubbing, the answer rubric, the import address guard, client-address trust; no network or keys
```

Dependencies are pinned by `package-lock.json`; CI and the Dockerfile use `npm ci`.

## Evaluate

```
npm run eval -- http://localhost:3000 <staff name> <ADMIN_PASSCODE>   # server must be running; the last two arguments enable the internal-scope case
```

Runs `eval/questions.json` (60 cases: 34 resident and 8 investor questions across English, Pidgin, Hausa, Yoruba and Igbo, 12 refusal and safety cases including an injection attempt and grouped identity numbers, and one internal-document case) through the engine and writes a scored result to `eval/results/`. The build plan's launch bar is zero invented figures and at least 95 percent on the rubric. Pass an account's email and password (or, on a fresh server, a name and the passcode) as the last two arguments.

## What is prototype-grade

- Accounts are email and password with roles; there is no single sign-on, two-factor or password-reset email yet. An admin resets passwords.
- The Pidgin, Hausa, Yoruba and Igbo interface strings and refusal messages are drafts awaiting native-speaker review, and the pages say so.
- Rate-limit buckets are in memory; a multi-server deployment should move them to Postgres or Redis.
- Alerts are outbound only; there is no inbound SMS or WhatsApp channel.
- Voice input uses the browser's speech recognition. Hausa, Yoruba and Igbo recognition is experimental; the plan's speech-to-text bake-off has not been run.
- Refusal messages in Hausa, Yoruba and Igbo have not had native-speaker review.
- Photo evidence is by link only; there is no upload store yet.
- The register block is sent whole to the model. For an LGA with thousands of records, switch to retrieval-only for the registers too.
