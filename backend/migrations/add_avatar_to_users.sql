-- Adiciona campo avatar_url na tabela users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);

-- Atualiza a trigger para incluir o novo campo
-- (não precisa alterar a trigger, ela já pega todos os campos automaticamente)
