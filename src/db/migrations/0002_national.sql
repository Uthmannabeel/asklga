-- National layer: every LGA in the country on the directory, monthly allocations, published eval runs.
-- Idempotent: safe to run on every start.

ALTER TABLE lgas ADD COLUMN IF NOT EXISTS zone text;
ALTER TABLE lgas ADD COLUMN IF NOT EXISTS wards jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE lgas ADD COLUMN IF NOT EXISTS population_year integer;
ALTER TABLE lgas ADD COLUMN IF NOT EXISTS population_source text;
ALTER TABLE lgas ADD COLUMN IF NOT EXISTS joined_at timestamptz;

CREATE INDEX IF NOT EXISTS lgas_state_idx ON lgas (state, name);

-- Federation Account (FAAC) allocations to each LGA, one row per LGA per month, from the
-- published monthly tables. gross = statutory + VAT + other before deductions; net = amount paid.
CREATE TABLE IF NOT EXISTS allocations (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  lga_id text NOT NULL REFERENCES lgas(id),
  period text NOT NULL,
  gross_ngn bigint,
  net_ngn bigint,
  source text NOT NULL,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lga_id, period)
);
CREATE INDEX IF NOT EXISTS allocations_period_idx ON allocations (period);

-- Published accuracy: one row per eval run per LGA, shown on the public scoreboard.
CREATE TABLE IF NOT EXISTS eval_runs (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  lga_id text NOT NULL REFERENCES lgas(id),
  ran_at timestamptz NOT NULL DEFAULT now(),
  cases integer NOT NULL,
  pass integer NOT NULL,
  accuracy integer NOT NULL,
  figure_failures integer NOT NULL DEFAULT 0,
  model text,
  note text
);
CREATE INDEX IF NOT EXISTS eval_runs_lga_idx ON eval_runs (lga_id, ran_at DESC);
