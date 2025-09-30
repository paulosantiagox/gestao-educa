-- Migração para atualizar a tabela certification_sla com os novos status e prazos padrão

-- Deletar configurações antigas (opcional - ajustar conforme necessário)
-- DELETE FROM certification_sla WHERE status IN ('pending', 'documents_sent', 'under_review', 'approved', 'certificate_issued', 'certificate_sent');

-- Inserir novos status com prazos padrão sugeridos
INSERT INTO certification_sla (status, days_limit, warning_days) 
VALUES 
  ('welcome', 1, 1),
  ('exam_in_progress', 7, 2),
  ('documents_requested', 7, 2),
  ('documents_under_review', 7, 2),
  ('certification_started', 45, 7),
  ('digital_certificate_sent', 2, 1),
  ('physical_certificate_sent', 45, 7),
  ('completed', 0, 0)
ON CONFLICT (status) 
DO UPDATE SET 
  days_limit = EXCLUDED.days_limit,
  warning_days = EXCLUDED.warning_days;
