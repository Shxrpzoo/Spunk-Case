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
