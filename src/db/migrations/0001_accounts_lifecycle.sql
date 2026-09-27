-- Per-officer accounts with roles, gap/flag lifecycle fields, and connected-source fields.
-- Idempotent: safe to run on every start.

CREATE TABLE IF NOT EXISTS staff_users (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'editor',
  lga_id text REFERENCES lgas(id),
  password_hash text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_sign_in timestamptz
);

ALTER TABLE questions ADD COLUMN IF NOT EXISTS gap_owner text;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS gap_resolved_at timestamptz;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS flag_fault text;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS flag_resolved_at timestamptz;

ALTER TABLE documents ADD COLUMN IF NOT EXISTS fetched_at timestamptz;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS content_hash text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS fetch_note text;

CREATE INDEX IF NOT EXISTS questions_gap_idx ON questions (lga_id, gap_status);
CREATE INDEX IF NOT EXISTS questions_flag_idx ON questions (lga_id, flagged, flag_resolved);
