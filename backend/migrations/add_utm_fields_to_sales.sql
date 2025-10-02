-- ==========================================
-- MIGRAÇÃO: Adicionar campos UTM à tabela sales
-- Data: 2024-01-XX
-- Descrição: Adiciona campos UTM para rastreamento de vendas por consultores
-- ==========================================

-- Adicionar campos UTM à tabela sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS utm_consultor VARCHAR(50);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS utm_source VARCHAR(100);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(100);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(100);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS utm_content VARCHAR(100);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS utm_term VARCHAR(100);

-- Criar índices para performance nas consultas de ranking
CREATE INDEX IF NOT EXISTS idx_sales_utm_consultor ON sales(utm_consultor);
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);

-- Comentários para documentação
COMMENT ON COLUMN sales.utm_consultor IS 'Código da vendedora responsável (ex: vkm, vtp)';
COMMENT ON COLUMN sales.utm_source IS 'Fonte da venda (ex: google, facebook, direct)';
COMMENT ON COLUMN sales.utm_medium IS 'Meio da venda (ex: cpc, organic, email)';
COMMENT ON COLUMN sales.utm_campaign IS 'Campanha específica';
COMMENT ON COLUMN sales.utm_content IS 'Conteúdo específico da campanha';
COMMENT ON COLUMN sales.utm_term IS 'Termo de busca (para campanhas pagas)';