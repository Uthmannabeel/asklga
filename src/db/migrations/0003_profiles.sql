-- LGA profile facts from published sources (census, boundary data), each with its source.
-- Idempotent: safe to run on every start.

ALTER TABLE lgas ADD COLUMN IF NOT EXISTS area_km2 double precision;
ALTER TABLE lgas ADD COLUMN IF NOT EXISTS created_year integer;
ALTER TABLE lgas ADD COLUMN IF NOT EXISTS senatorial_district text;
-- {field: source URL} for every profile fact, so each figure on a page links to where it came from.
ALTER TABLE lgas ADD COLUMN IF NOT EXISTS fact_sources jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Statutory deductions between gross and net, when the published table breaks them out.
ALTER TABLE allocations ADD COLUMN IF NOT EXISTS deductions_ngn bigint
