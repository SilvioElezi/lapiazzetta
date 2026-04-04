-- Global settings table (platform-wide config like SMTP)
CREATE TABLE IF NOT EXISTS global_settings (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_global_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_global_settings_updated
  BEFORE UPDATE ON global_settings
  FOR EACH ROW EXECUTE FUNCTION update_global_settings_timestamp();
