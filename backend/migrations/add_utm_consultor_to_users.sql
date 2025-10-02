-- ==========================================
-- MIGRAÇÃO: Adicionar campo utm_consultor à tabela users
-- Data: 2024-01-XX
-- Descrição: Adiciona campo utm_consultor para identificar vendedoras
-- ==========================================

-- Adicionar campo utm_consultor à tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS utm_consultor VARCHAR(50);

-- Criar índice para performance nas consultas
CREATE INDEX IF NOT EXISTS idx_users_utm_consultor ON users(utm_consultor);

-- Comentário para documentação
COMMENT ON COLUMN users.utm_consultor IS 'Código UTM da vendedora/consultora (ex: vkm, vtp, vjs)';

-- Exemplos de como popular o campo (descomente e ajuste conforme necessário):
-- UPDATE users SET utm_consultor = 'vkm' WHERE email = 'vendedora1@exemplo.com';
-- UPDATE users SET utm_consultor = 'vtp' WHERE email = 'vendedora2@exemplo.com';
-- UPDATE users SET utm_consultor = 'vjs' WHERE email = 'vendedora3@exemplo.com';