export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS invoices_cache (
  invoice_id TEXT PRIMARY KEY,
  generation_id TEXT UNIQUE NOT NULL,
  request_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  charge_tinybars INTEGER NOT NULL,
  charge_hbar TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invoices_generation_id ON invoices_cache (generation_id);

CREATE TABLE IF NOT EXISTS payment_attempts (
  payment_id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  generation_id TEXT NOT NULL,
  payload_digest TEXT NOT NULL,
  raw_payload TEXT NOT NULL,
  state TEXT NOT NULL,
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (invoice_id) REFERENCES invoices_cache (invoice_id)
);

CREATE INDEX IF NOT EXISTS idx_attempts_invoice_id ON payment_attempts (invoice_id);
CREATE INDEX IF NOT EXISTS idx_attempts_digest ON payment_attempts (payload_digest);

CREATE TABLE IF NOT EXISTS settlement_records (
  transaction_id TEXT PRIMARY KEY,
  invoice_id TEXT UNIQUE NOT NULL,
  generation_id TEXT NOT NULL,
  payer_account TEXT NOT NULL,
  receiver_account TEXT NOT NULL,
  amount_tinybars INTEGER NOT NULL,
  consensus_timestamp TEXT NOT NULL,
  mirror_status TEXT NOT NULL,
  hashscan_url TEXT NOT NULL,
  confirmed_at TEXT NOT NULL,
  FOREIGN KEY (invoice_id) REFERENCES invoices_cache (invoice_id)
);

CREATE INDEX IF NOT EXISTS idx_settlements_generation_id ON settlement_records (generation_id);

CREATE TABLE IF NOT EXISTS outbox_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  retry_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT NOT NULL,
  last_error TEXT,
  created_at TEXT NOT NULL,
  sent_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_outbox_status_next ON outbox_events (status, next_attempt_at);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  generation_id TEXT NOT NULL,
  response_status INTEGER NOT NULL,
  response_headers TEXT NOT NULL,
  response_body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;
