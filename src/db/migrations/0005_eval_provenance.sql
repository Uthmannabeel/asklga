-- Evaluation runs scored by the server from stored answers. verified = true when the server
-- recomputed the score from the question log against the versioned test set (test_set is a
-- sha256 of JSON.stringify of the parsed eval/questions.json); results holds the per-case outcome so a run can be inspected.
-- Runs recorded before this migration keep verified = false and show as staff-reported.
-- Idempotent: safe to run on every start.

ALTER TABLE eval_runs ADD COLUMN IF NOT EXISTS test_set text;
ALTER TABLE eval_runs ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;
ALTER TABLE eval_runs ADD COLUMN IF NOT EXISTS results jsonb
