-- Remove coluna webhook_token da tabela webhook_settings
-- O webhook agora é público e não requer autenticação

ALTER TABLE webhook_settings 
DROP COLUMN IF EXISTS webhook_token;
