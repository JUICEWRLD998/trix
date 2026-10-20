-- Every UW response, stored once per (endpoint, params). Tests and the demo replay from here.
-- Never store request headers: the API key travels only in the Authorization header.
CREATE TABLE IF NOT EXISTS uw_raw (
  id          BIGSERIAL PRIMARY KEY,
  endpoint    TEXT        NOT NULL,            -- path with ids filled in, e.g. /api/stock/UNH/oi-change
  params_hash TEXT        NOT NULL,            -- sha256 of the sorted, canonical query string
  params      JSONB       NOT NULL,
  status      INTEGER     NOT NULL,
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  body        JSONB       NOT NULL,
  UNIQUE (endpoint, params_hash, fetched_at)
);
CREATE INDEX IF NOT EXISTS uw_raw_lookup ON uw_raw (endpoint, params_hash, fetched_at DESC);
