-- ==========================================
-- ADICIONAR CAMPO DE OBSERVAÇÕES/NOTAS
-- ==========================================

-- Adicionar campo notes na tabela students
ALTER TABLE students 
ADD COLUMN notes TEXT;

-- Adicionar campo notes na tabela sales
ALTER TABLE sales 
ADD COLUMN notes TEXT;

-- Criar índice para melhor performance em buscas (opcional)
CREATE INDEX idx_students_notes ON students USING gin(to_tsvector('portuguese', notes));
CREATE INDEX idx_sales_notes ON sales USING gin(to_tsvector('portuguese', notes));
