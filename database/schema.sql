CREATE SCHEMA IF NOT EXISTS spunk;
CREATE TABLE IF NOT EXISTS spunk.players (
 id text PRIMARY KEY, name text NOT NULL, pin_hash text NOT NULL,
 balance bigint NOT NULL DEFAULT 0 CHECK(balance BETWEEN 0 AND 9000000000000),
 daily_at timestamptz, free_at timestamptz, first_case_day date, last_action_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS players_name_unique ON spunk.players(lower(name));
CREATE TABLE IF NOT EXISTS spunk.sessions (token_hash text PRIMARY KEY, player_id text REFERENCES spunk.players(id) ON DELETE CASCADE, role text NOT NULL CHECK(role IN ('player','admin')), expires_at timestamptz NOT NULL, CHECK((role='player' AND player_id IS NOT NULL) OR (role='admin' AND player_id IS NULL)));
CREATE INDEX IF NOT EXISTS sessions_expiry ON spunk.sessions(expires_at);
CREATE TABLE IF NOT EXISTS spunk.rate_limits (key text PRIMARY KEY, count integer NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS spunk.items (id text PRIMARY KEY, name text NOT NULL, rarity text NOT NULL CHECK(rarity IN ('COMMON','UNCOMMON','RARE','EPIC','LEGENDARY','MYTHIC')), image text NOT NULL);
CREATE TABLE IF NOT EXISTS spunk.cases (id text PRIMARY KEY, name text NOT NULL, price integer NOT NULL CHECK(price>0), enabled boolean NOT NULL DEFAULT true);
CREATE TABLE IF NOT EXISTS spunk.case_items (case_id text REFERENCES spunk.cases(id), item_id text REFERENCES spunk.items(id), weight double precision NOT NULL CHECK(weight>0 AND weight<=1000000), PRIMARY KEY(case_id,item_id));
CREATE TABLE IF NOT EXISTS spunk.lines (id text PRIMARY KEY, name text NOT NULL, reward integer NOT NULL CHECK(reward>=0));
CREATE TABLE IF NOT EXISTS spunk.line_items (line_id text REFERENCES spunk.lines(id), item_id text REFERENCES spunk.items(id), PRIMARY KEY(line_id,item_id));
CREATE TABLE IF NOT EXISTS spunk.settings (id integer PRIMARY KEY CHECK(id=1), value jsonb NOT NULL, version integer NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS spunk.player_items (player_id text REFERENCES spunk.players(id), item_id text REFERENCES spunk.items(id), quantity integer NOT NULL CHECK(quantity>0), first_obtained_at timestamptz NOT NULL DEFAULT now(), last_obtained_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(player_id,item_id));
CREATE TABLE IF NOT EXISTS spunk.completions (player_id text REFERENCES spunk.players(id), kind text NOT NULL CHECK(kind IN ('rarity','line')), key text NOT NULL, amount integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(player_id,kind,key));
CREATE TABLE IF NOT EXISTS spunk.requests (player_id text REFERENCES spunk.players(id), key text NOT NULL, fingerprint text NOT NULL, response jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(player_id,key));
CREATE TABLE IF NOT EXISTS spunk.history (id text PRIMARY KEY, player_id text REFERENCES spunk.players(id), kind text NOT NULL, amount bigint NOT NULL, detail jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS history_player_date ON spunk.history(player_id,created_at DESC);
CREATE TABLE IF NOT EXISTS spunk.case_openings (id text PRIMARY KEY REFERENCES spunk.history(id), player_id text REFERENCES spunk.players(id), case_id text REFERENCES spunk.cases(id), item_id text REFERENCES spunk.items(id), duplicate boolean NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS openings_date ON spunk.case_openings(created_at DESC);
CREATE TABLE IF NOT EXISTS spunk.ledger (id text PRIMARY KEY, player_id text REFERENCES spunk.players(id), amount bigint NOT NULL, balance_before bigint NOT NULL, balance_after bigint NOT NULL CHECK(balance_after>=0), type text NOT NULL, reference_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), CHECK(balance_after=balance_before+amount));
CREATE INDEX IF NOT EXISTS ledger_player_date ON spunk.ledger(player_id,created_at DESC);
CREATE TABLE IF NOT EXISTS spunk.admin_audit (id text PRIMARY KEY, action text NOT NULL, detail jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS spunk.admin_requests (key text PRIMARY KEY, fingerprint text NOT NULL, response jsonb NOT NULL);
-- No browser access, including Supabase anonymous/authenticated API users.
REVOKE ALL ON SCHEMA spunk FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA spunk FROM PUBLIC;
DO $$ DECLARE t record; BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='spunk' LOOP
 EXECUTE format('ALTER TABLE spunk.%I ENABLE ROW LEVEL SECURITY', t.tablename);
 END LOOP;
END $$;

-- Additive card storage; original inventory rows stay intact.
CREATE TABLE IF NOT EXISTS spunk.discoveries (player_id text REFERENCES spunk.players(id),item_id text REFERENCES spunk.items(id),created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(player_id,item_id));
CREATE TABLE IF NOT EXISTS spunk.card_effects (player_id text REFERENCES spunk.players(id),item_id text REFERENCES spunk.items(id),effect text NOT NULL CHECK(effect IN ('NONE','SPUNK','POO','SMEGMA')),quantity integer NOT NULL CHECK(quantity>0),PRIMARY KEY(player_id,item_id,effect));
INSERT INTO spunk.discoveries(player_id,item_id) SELECT player_id,item_id FROM spunk.player_items ON CONFLICT DO NOTHING;
INSERT INTO spunk.discoveries(player_id,item_id) SELECT player_id,item_id FROM spunk.case_openings ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION spunk.remember_discovery() RETURNS trigger LANGUAGE plpgsql SET search_path=spunk,pg_temp AS $$ BEGIN
 INSERT INTO spunk.discoveries(player_id,item_id) VALUES(NEW.player_id,NEW.item_id) ON CONFLICT DO NOTHING; RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS remember_discovery ON spunk.player_items;
CREATE TRIGGER remember_discovery AFTER INSERT OR UPDATE ON spunk.player_items FOR EACH ROW EXECUTE FUNCTION spunk.remember_discovery();
ALTER TABLE spunk.discoveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE spunk.card_effects ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON spunk.discoveries,spunk.card_effects FROM PUBLIC;
REVOKE ALL ON FUNCTION spunk.remember_discovery() FROM PUBLIC;

-- Card-specific pricing and mystery collection support.
ALTER TABLE spunk.items ADD COLUMN IF NOT EXISTS value integer CHECK(value>0);
ALTER TABLE spunk.items ADD COLUMN IF NOT EXISTS mystery boolean NOT NULL DEFAULT false;
