CREATE TABLE IF NOT EXISTS lgas (
  id text PRIMARY KEY,
  name text NOT NULL,
  state text NOT NULL,
  headquarters text,
  population integer,
  lat double precision,
  lng double precision,
  intro text,
  demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS services (
  id text PRIMARY KEY,
  lga_id text NOT NULL REFERENCES lgas(id),
  name text NOT NULL,
  category text NOT NULL,
  summary text,
  eligibility text,
  documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  office text,
  role text,
  contact text,
  turnaround text,
  source text NOT NULL,
  source_url text,
  approval text NOT NULL DEFAULT 'draft',
  last_verified text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id text PRIMARY KEY,
  lga_id text NOT NULL REFERENCES lgas(id),
  name text NOT NULL,
  type text NOT NULL,
  ward text,
  lat double precision,
  lng double precision,
  sponsor text NOT NULL,
  budget_year integer,
  budget_line text,
  amount_ngn bigint,
  contractor text,
  start_date text,
  expected_completion text,
  status text NOT NULL DEFAULT 'unknown',
  status_note text,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  source text NOT NULL,
  source_url text,
  approval text NOT NULL DEFAULT 'draft',
  last_verified text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS status_updates (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  project_id text NOT NULL REFERENCES projects(id),
  old_status text,
  new_status text NOT NULL,
  note text,
  by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS photo_reports (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  project_id text NOT NULL REFERENCES projects(id),
  lga_id text NOT NULL,
  note text NOT NULL,
  image_url text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assets (
  id text PRIMARY KEY,
  lga_id text NOT NULL REFERENCES lgas(id),
  name text NOT NULL,
  type text NOT NULL,
  ward text,
  lat double precision,
  lng double precision,
  condition text,
  last_inspected text,
  notes text,
  source text NOT NULL,
  source_url text,
  approval text NOT NULL DEFAULT 'draft',
  last_verified text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profile_sections (
  id text PRIMARY KEY,
  lga_id text NOT NULL REFERENCES lgas(id),
  section text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  ord integer NOT NULL DEFAULT 0,
  source text NOT NULL,
  source_url text,
  approval text NOT NULL DEFAULT 'draft',
  last_verified text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
  id text PRIMARY KEY,
  lga_id text NOT NULL REFERENCES lgas(id),
  title text NOT NULL,
  kind text NOT NULL,
  visibility text NOT NULL DEFAULT 'public',
  body text NOT NULL,
  source text NOT NULL,
  source_url text,
  approval text NOT NULL DEFAULT 'draft',
  review_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chunks (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  document_id text NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  lga_id text NOT NULL,
  visibility text NOT NULL,
  ord integer NOT NULL,
  text text NOT NULL,
  tsv tsvector GENERATED ALWAYS AS (to_tsvector('simple', text)) STORED
);
CREATE INDEX IF NOT EXISTS chunks_tsv_idx ON chunks USING GIN (tsv);
CREATE INDEX IF NOT EXISTS chunks_lga_idx ON chunks (lga_id, visibility);

CREATE TABLE IF NOT EXISTS questions (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  lga_id text NOT NULL,
  audience text NOT NULL DEFAULT 'resident',
  scope text NOT NULL DEFAULT 'public',
  language text,
  question text NOT NULL,
  answer text,
  citations jsonb NOT NULL DEFAULT '[]'::jsonb,
  answered boolean NOT NULL DEFAULT false,
  escalated boolean NOT NULL DEFAULT false,
  latency_ms integer,
  feedback text,
  flagged boolean NOT NULL DEFAULT false,
  flag_note text,
  flag_resolved boolean NOT NULL DEFAULT false,
  gap_status text,
  gap_resolution text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS questions_lga_idx ON questions (lga_id, created_at DESC);

CREATE TABLE IF NOT EXISTS tickets (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  lga_id text NOT NULL,
  question_id integer,
  summary text NOT NULL,
  contact text,
  assigned_to text,
  status text NOT NULL DEFAULT 'open',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS investor_enquiries (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  lga_id text NOT NULL,
  organisation text,
  sector text NOT NULL,
  summary text NOT NULL,
  contact text,
  routed_to text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);
