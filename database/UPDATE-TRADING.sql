-- Run AFTER UPDATE-GOON.sql in the existing Supabase SQL Editor.
-- Additive and rerunnable. No player progress is reset. Offers have no expiry.
BEGIN;
CREATE TABLE IF NOT EXISTS spunk.trades (
 id text PRIMARY KEY,
 party_a text NOT NULL REFERENCES spunk.players(id),
 party_b text NOT NULL REFERENCES spunk.players(id),
 offered_by text NOT NULL REFERENCES spunk.players(id),
 awaiting_id text NOT NULL REFERENCES spunk.players(id),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined')),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 proposal jsonb NOT NULL CHECK(jsonb_typeof(proposal)='object'),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz,
 CHECK(party_a<>party_b),
 CHECK(offered_by IN (party_a,party_b) AND awaiting_id IN (party_a,party_b) AND offered_by<>awaiting_id)
);
CREATE INDEX IF NOT EXISTS trades_party_a ON spunk.trades(party_a,status,updated_at DESC);
CREATE INDEX IF NOT EXISTS trades_party_b ON spunk.trades(party_b,status,updated_at DESC);
CREATE TABLE IF NOT EXISTS spunk.trade_events (
 id text PRIMARY KEY,
 trade_id text NOT NULL REFERENCES spunk.trades(id),
 actor_id text NOT NULL REFERENCES spunk.players(id),
 kind text NOT NULL CHECK(kind IN ('offered','countered','accepted','declined')),
 revision integer NOT NULL,
 proposal jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trade_events_trade ON spunk.trade_events(trade_id,created_at);
CREATE TABLE IF NOT EXISTS spunk.notifications (
 id text PRIMARY KEY,
 player_id text NOT NULL REFERENCES spunk.players(id),
 kind text NOT NULL CHECK(kind IN ('trade-offer','trade-counter','trade-accepted','trade-declined','nuggets-received')),
 title text NOT NULL,
 trade_id text REFERENCES spunk.trades(id),
 detail jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(),
 read_at timestamptz
);
CREATE INDEX IF NOT EXISTS notifications_player_date ON spunk.notifications(player_id,created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread ON spunk.notifications(player_id) WHERE read_at IS NULL;
ALTER TABLE spunk.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE spunk.trade_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE spunk.notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON spunk.trades,spunk.trade_events,spunk.notifications FROM PUBLIC;
COMMIT;
SELECT 'Trading ready; existing player progress preserved' AS result;
