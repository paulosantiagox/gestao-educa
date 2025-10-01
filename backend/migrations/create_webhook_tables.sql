-- ==========================================
-- WEBHOOK INTEGRATION - DATABASE TABLES
-- ==========================================

-- 1. WEBHOOK LOGS
CREATE TABLE webhook_logs (
  id SERIAL PRIMARY KEY,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL DEFAULT 'POST',
  headers JSONB,
  body JSONB NOT NULL,
  response_status INTEGER,
  response_body JSONB,
  processing_status VARCHAR(50) DEFAULT 'pending', -- 'success', 'error', 'pending'
  error_message TEXT,
  created_sale_id INTEGER REFERENCES sales(id) ON DELETE SET NULL,
  created_student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
  ip_address VARCHAR(100),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. WEBHOOK SETTINGS
CREATE TABLE webhook_settings (
  id SERIAL PRIMARY KEY,
  log_retention_days INTEGER DEFAULT 30,
  auto_cleanup_enabled BOOLEAN DEFAULT true,
  webhook_token VARCHAR(255) NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT INTO webhook_settings (log_retention_days, auto_cleanup_enabled) 
VALUES (30, true);

-- 3. INDEXES FOR PERFORMANCE
CREATE INDEX idx_webhook_logs_created_at ON webhook_logs(created_at DESC);
CREATE INDEX idx_webhook_logs_status ON webhook_logs(processing_status);
CREATE INDEX idx_webhook_logs_endpoint ON webhook_logs(endpoint);

-- 4. TRIGGER FOR updated_at
CREATE TRIGGER update_webhook_settings_updated_at BEFORE UPDATE ON webhook_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
