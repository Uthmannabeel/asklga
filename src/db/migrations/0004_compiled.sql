-- An LGA whose records were compiled by AskLGA from published sources (council website, dated
-- news reports, state announcements) but not yet confirmed by the council's data owner.
-- Pages show a banner saying so. Idempotent: safe to run on every start.

ALTER TABLE lgas ADD COLUMN IF NOT EXISTS compiled boolean NOT NULL DEFAULT false
