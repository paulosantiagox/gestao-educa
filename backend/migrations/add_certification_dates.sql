-- Adicionar campos de data que faltam na tabela certification_process
ALTER TABLE certification_process 
ADD COLUMN IF NOT EXISTS under_review_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
