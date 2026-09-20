-- Adds explicit case ordering so display order no longer depends on the case id text.
-- Run this entire file once in the Supabase SQL Editor.
BEGIN;
CREATE TABLE IF NOT EXISTS spunk.migrations (id text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE spunk.migrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON spunk.migrations FROM PUBLIC;
SELECT pg_advisory_xact_lock(761912);
DO $order$ BEGIN
IF EXISTS(SELECT 1 FROM spunk.migrations WHERE id='004-case-order') THEN RETURN; END IF;
ALTER TABLE spunk.cases ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 100;
UPDATE spunk.cases SET sort_order=1 WHERE id='basic';
UPDATE spunk.cases SET sort_order=2 WHERE id='ash';
UPDATE spunk.cases SET sort_order=3 WHERE id='satchel';
UPDATE spunk.cases SET sort_order=4 WHERE id='goon';
INSERT INTO spunk.migrations(id) VALUES('004-case-order');
END $order$;
COMMIT;
