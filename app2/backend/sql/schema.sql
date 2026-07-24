CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS geocode_cache (
  address_text TEXT PRIMARY KEY,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  provider TEXT NOT NULL DEFAULT 'nlsc',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  address_text TEXT NOT NULL,
  district TEXT,
  building_type TEXT,
  total_price BIGINT,
  unit_price_m2 DOUBLE PRECISION,
  unit_price_ping DOUBLE PRECISION,
  building_age_years DOUBLE PRECISION,
  tx_date DATE,
  rooms INT,
  halls INT,
  baths INT,
  has_elevator BOOLEAN,
  note_flag BOOLEAN NOT NULL DEFAULT FALSE,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  geom GEOGRAPHY(POINT, 4326),
  source_file TEXT NOT NULL DEFAULT '',
  detail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (address_text, source_file)
);

CREATE INDEX IF NOT EXISTS idx_transactions_geom ON transactions USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_transactions_district ON transactions (district);
CREATE INDEX IF NOT EXISTS idx_transactions_tx_date ON transactions (tx_date);
CREATE INDEX IF NOT EXISTS idx_transactions_address ON transactions (address_text);

CREATE TABLE IF NOT EXISTS price_buckets (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  p10 DOUBLE PRECISION NOT NULL,
  p50 DOUBLE PRECISION NOT NULL,
  p90 DOUBLE PRECISION NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
