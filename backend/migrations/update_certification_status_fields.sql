-- Migração para atualizar os campos de data da tabela certification_process
-- para refletir as novas etapas do processo de certificação

-- Adicionar novos campos de data
ALTER TABLE certification_process 
ADD COLUMN IF NOT EXISTS exam_started_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS documents_requested_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS documents_under_review_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS certification_started_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS digital_certificate_sent_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS physical_certificate_sent_at TIMESTAMP;

-- Comentário explicativo sobre a migração de dados antigos (opcional)
-- Se houver dados existentes com os status antigos, pode ser necessário mapear:
-- 'pending' -> 'welcome' (usa created_at)
-- 'documents_sent' -> 'documents_requested' (renomear campo se existir)
-- 'under_review' -> 'documents_under_review' (renomear campo se existir)
-- 'approved' -> 'certification_started'
-- 'certificate_issued' -> 'digital_certificate_sent'
-- 'certificate_sent' -> 'physical_certificate_sent'

-- Atualizar dados existentes (adaptar conforme necessário)
-- UPDATE certification_process 
-- SET 
--   exam_started_at = created_at,
--   documents_requested_at = documents_sent_at,
--   documents_under_review_at = under_review_at,
--   certification_started_at = approval_date,
--   digital_certificate_sent_at = certificate_issued_at,
--   physical_certificate_sent_at = certificate_sent_at
-- WHERE created_at IS NOT NULL;

-- Atualizar status antigos para novos (descomentar se necessário)
-- UPDATE certification_process SET status = 'welcome' WHERE status = 'pending';
-- UPDATE certification_process SET status = 'documents_requested' WHERE status = 'documents_sent';
-- UPDATE certification_process SET status = 'documents_under_review' WHERE status = 'under_review';
-- UPDATE certification_process SET status = 'certification_started' WHERE status = 'approved';
-- UPDATE certification_process SET status = 'digital_certificate_sent' WHERE status = 'certificate_issued';
-- UPDATE certification_process SET status = 'physical_certificate_sent' WHERE status = 'certificate_sent';
