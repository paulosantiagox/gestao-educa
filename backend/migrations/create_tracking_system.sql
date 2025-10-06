-- ==========================================
-- SISTEMA DE TRACKING WEB - ESTRUTURA DO BANCO DE DADOS
-- ==========================================

-- 1. DOMÍNIOS RASTREADOS
CREATE TABLE tracking_domains (
  id SERIAL PRIMARY KEY,
  domain VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  tracking_key VARCHAR(100) NOT NULL UNIQUE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. SESSÕES DE USUÁRIOS
CREATE TABLE tracking_sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(100) NOT NULL,
  domain_id INTEGER REFERENCES tracking_domains(id) ON DELETE CASCADE,
  
  -- Dados do usuário/dispositivo
  ip_address INET,
  user_agent TEXT,
  device_type VARCHAR(50), -- 'desktop', 'mobile', 'tablet'
  browser VARCHAR(100),
  browser_version VARCHAR(50),
  os VARCHAR(100),
  os_version VARCHAR(50),
  screen_resolution VARCHAR(20),
  
  -- Dados de geolocalização
  country VARCHAR(100),
  country_code VARCHAR(2),
  region VARCHAR(100),
  city VARCHAR(100),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  timezone VARCHAR(50),
  
  -- Dados de referência
  referrer TEXT,
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  utm_term VARCHAR(255),
  utm_content VARCHAR(255),
  
  -- Controle de sessão
  first_visit BOOLEAN DEFAULT true,
  session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  session_end TIMESTAMP,
  total_pageviews INTEGER DEFAULT 0,
  total_time_spent INTEGER DEFAULT 0, -- em segundos
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. VISUALIZAÇÕES DE PÁGINA
CREATE TABLE tracking_pageviews (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES tracking_sessions(id) ON DELETE CASCADE,
  
  -- Dados da página
  page_url TEXT NOT NULL,
  page_title VARCHAR(500),
  page_path VARCHAR(500),
  
  -- Métricas de tempo
  time_on_page INTEGER, -- em segundos
  scroll_depth INTEGER DEFAULT 0, -- porcentagem máxima de scroll
  
  -- Dados técnicos
  load_time INTEGER, -- tempo de carregamento em ms
  
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. INTERAÇÕES DO USUÁRIO
CREATE TABLE tracking_interactions (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES tracking_sessions(id) ON DELETE CASCADE,
  pageview_id INTEGER REFERENCES tracking_pageviews(id) ON DELETE CASCADE,
  
  -- Tipo de interação
  interaction_type VARCHAR(50) NOT NULL, -- 'click', 'scroll', 'form_submit', 'download', 'video_play', etc.
  
  -- Dados do elemento
  element_type VARCHAR(50), -- 'button', 'link', 'form', 'image', etc.
  element_id VARCHAR(255),
  element_class VARCHAR(255),
  element_text TEXT,
  element_href TEXT,
  
  -- Posição do clique (para clicks)
  click_x INTEGER,
  click_y INTEGER,
  
  -- Dados específicos por tipo
  scroll_position INTEGER, -- para scroll events
  form_data JSONB, -- para form submissions
  
  -- Contexto
  page_url TEXT,
  
  interaction_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. EVENTOS PERSONALIZADOS
CREATE TABLE tracking_events (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES tracking_sessions(id) ON DELETE CASCADE,
  
  -- Dados do evento
  event_name VARCHAR(100) NOT NULL,
  event_category VARCHAR(100),
  event_action VARCHAR(100),
  event_label VARCHAR(255),
  event_value DECIMAL(10,2),
  
  -- Dados adicionais
  custom_data JSONB,
  page_url TEXT,
  
  event_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. CACHE DE GEOLOCALIZAÇÃO (para otimizar consultas)
CREATE TABLE tracking_ip_cache (
  id SERIAL PRIMARY KEY,
  ip_address INET NOT NULL UNIQUE,
  
  -- Dados de geolocalização
  country VARCHAR(100),
  country_code VARCHAR(2),
  region VARCHAR(100),
  city VARCHAR(100),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  timezone VARCHAR(50),
  isp VARCHAR(255),
  
  -- Controle de cache
  cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
);

-- 7. ÍNDICES PARA PERFORMANCE
CREATE INDEX idx_tracking_sessions_domain ON tracking_sessions(domain_id);
CREATE INDEX idx_tracking_sessions_ip ON tracking_sessions(ip_address);
CREATE INDEX idx_tracking_sessions_session_id ON tracking_sessions(session_id);
CREATE INDEX idx_tracking_sessions_created_at ON tracking_sessions(created_at);

CREATE INDEX idx_tracking_pageviews_session ON tracking_pageviews(session_id);
CREATE INDEX idx_tracking_pageviews_url ON tracking_pageviews(page_url);
CREATE INDEX idx_tracking_pageviews_viewed_at ON tracking_pageviews(viewed_at);

CREATE INDEX idx_tracking_interactions_session ON tracking_interactions(session_id);
CREATE INDEX idx_tracking_interactions_pageview ON tracking_interactions(pageview_id);
CREATE INDEX idx_tracking_interactions_type ON tracking_interactions(interaction_type);
CREATE INDEX idx_tracking_interactions_at ON tracking_interactions(interaction_at);

CREATE INDEX idx_tracking_events_session ON tracking_events(session_id);
CREATE INDEX idx_tracking_events_name ON tracking_events(event_name);
CREATE INDEX idx_tracking_events_at ON tracking_events(event_at);

CREATE INDEX idx_tracking_ip_cache_ip ON tracking_ip_cache(ip_address);
CREATE INDEX idx_tracking_ip_cache_expires ON tracking_ip_cache(expires_at);

-- 8. TRIGGERS PARA updated_at
CREATE TRIGGER update_tracking_domains_updated_at BEFORE UPDATE ON tracking_domains
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tracking_sessions_updated_at BEFORE UPDATE ON tracking_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. FUNÇÃO PARA GERAR TRACKING KEY
CREATE OR REPLACE FUNCTION generate_tracking_key() RETURNS VARCHAR(100) AS $$
BEGIN
  RETURN 'tk_' || encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql;

-- 10. DADOS INICIAIS - DOMÍNIO PRINCIPAL
INSERT INTO tracking_domains (domain, name, tracking_key) VALUES
  ('ejaeducabrasil.com', 'EJA Educa Brasil', generate_tracking_key());

-- 11. FUNÇÃO PARA LIMPEZA AUTOMÁTICA DE DADOS ANTIGOS (opcional)
CREATE OR REPLACE FUNCTION cleanup_old_tracking_data() RETURNS void AS $$
BEGIN
  -- Remove dados de mais de 2 anos
  DELETE FROM tracking_interactions WHERE interaction_at < CURRENT_TIMESTAMP - INTERVAL '2 years';
  DELETE FROM tracking_pageviews WHERE viewed_at < CURRENT_TIMESTAMP - INTERVAL '2 years';
  DELETE FROM tracking_events WHERE event_at < CURRENT_TIMESTAMP - INTERVAL '2 years';
  
  -- Remove sessões órfãs
  DELETE FROM tracking_sessions WHERE id NOT IN (
    SELECT DISTINCT session_id FROM tracking_pageviews WHERE session_id IS NOT NULL
  ) AND session_start < CURRENT_TIMESTAMP - INTERVAL '1 year';
  
  -- Remove cache de IP expirado
  DELETE FROM tracking_ip_cache WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;