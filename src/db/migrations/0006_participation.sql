-- Resident participation: a public problem register with a status timeline, a monthly
-- residents' report card on the nine Fourth Schedule functions, and the officials register.
-- Idempotent: safe to run on every start.

CREATE TABLE IF NOT EXISTS issues (
  id text PRIMARY KEY,
  lga_id text NOT NULL REFERENCES lgas(id),
  fn text NOT NULL,
  title text NOT NULL,
  detail text NOT NULL,
  ward text,
  place text,
  photo_url text,
  status text NOT NULL DEFAULT 'received',
  response text,
  responded_at timestamptz,
  resolved_at timestamptz,
  hidden boolean NOT NULL DEFAULT false,
  hide_reason text,
  supports integer NOT NULL DEFAULT 0,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS issues_lga_created ON issues (lga_id, created_at DESC);
CREATE INDEX IF NOT EXISTS issues_created ON issues (created_at DESC);

CREATE TABLE IF NOT EXISTS issue_updates (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  issue_id text NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  note text,
  by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS issue_updates_issue ON issue_updates (issue_id, created_at);

CREATE TABLE IF NOT EXISTS ratings (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  lga_id text NOT NULL REFERENCES lgas(id),
  month text NOT NULL,
  email_hash text NOT NULL,
  scores jsonb NOT NULL,
  comment text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ratings_one_per_month ON ratings (lga_id, month, email_hash);
CREATE INDEX IF NOT EXISTS ratings_lga_month ON ratings (lga_id, month);

CREATE TABLE IF NOT EXISTS officials (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  lga_id text NOT NULL REFERENCES lgas(id),
  role text NOT NULL,
  name text NOT NULL,
  title text,
  ward text,
  since text,
  until text,
  ord integer NOT NULL DEFAULT 0,
  source text NOT NULL,
  source_url text,
  approval text NOT NULL DEFAULT 'draft',
  last_verified text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS officials_lga ON officials (lga_id, ord)
