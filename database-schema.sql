-- ==========================================
-- EDUCA BRASIL - ESTRUTURA DO BANCO DE DADOS
-- ==========================================

-- 1. CERTIFICADORAS
CREATE TABLE certifiers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. MÉTODOS DE PAGAMENTO
CREATE TABLE payment_methods (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'pix', 'boleto', 'cartao', 'transferencia'
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. ALUNOS
CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50),
  cpf VARCHAR(14) UNIQUE,
  birth_date DATE,
  
  -- Endereço completo
  zip_code VARCHAR(9),
  street VARCHAR(255),
  number VARCHAR(20),
  complement VARCHAR(100),
  neighborhood VARCHAR(100),
  city VARCHAR(100),
  state VARCHAR(2),
  
  -- Links de documentos
  documents_link TEXT,
  
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. VENDAS
CREATE TABLE sales (
  id SERIAL PRIMARY KEY,
  sale_code VARCHAR(50) UNIQUE NOT NULL,
  
  -- Dados do pagador (pode ser diferente do aluno)
  payer_name VARCHAR(255) NOT NULL,
  payer_email VARCHAR(255),
  payer_phone VARCHAR(50),
  payer_cpf VARCHAR(14),
  
  -- Valores
  total_amount DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  
  -- Método de pagamento
  payment_method_id INTEGER REFERENCES payment_methods(id),
  
  -- Status
  payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'partial', 'completed'
  
  sale_date DATE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. ASSOCIAÇÃO ALUNO-VENDA (um aluno pode estar em várias vendas)
CREATE TABLE student_sales (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, sale_id)
);

-- 6. PAGAMENTOS PARCIAIS
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method_id INTEGER REFERENCES payment_methods(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. PROCESSO DE CERTIFICAÇÃO
CREATE TABLE certification_process (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE UNIQUE,
  certifier_id INTEGER REFERENCES certifiers(id),
  
  -- Status do processo (cada etapa)
  status VARCHAR(50) DEFAULT 'enrolled', -- 'enrolled', 'welcomed', 'exam_taken', 'exam_approved', 'exam_failed', 'documents_sent', 'requested_to_certifier', 'in_certification', 'digital_delivered', 'wants_physical', 'physical_shipping', 'physical_tracking', 'physical_delivered', 'completed'
  
  -- Datas de cada etapa
  enrolled_at TIMESTAMP,
  welcomed_at TIMESTAMP,
  exam_taken_at TIMESTAMP,
  exam_result VARCHAR(50), -- 'approved', 'failed'
  exam_result_at TIMESTAMP,
  documents_sent_at TIMESTAMP,
  requested_to_certifier_at TIMESTAMP,
  in_certification_at TIMESTAMP,
  digital_delivered_at TIMESTAMP,
  wants_physical BOOLEAN DEFAULT false,
  physical_shipping_at TIMESTAMP,
  physical_tracking_code VARCHAR(100),
  physical_delivered_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. ÍNDICES PARA PERFORMANCE
CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_students_cpf ON students(cpf);
CREATE INDEX idx_sales_code ON sales(sale_code);
CREATE INDEX idx_sales_status ON sales(payment_status);
CREATE INDEX idx_student_sales_student ON student_sales(student_id);
CREATE INDEX idx_student_sales_sale ON student_sales(sale_id);
CREATE INDEX idx_certification_student ON certification_process(student_id);
CREATE INDEX idx_certification_status ON certification_process(status);

-- 9. FUNÇÃO PARA ATUALIZAR updated_at AUTOMATICAMENTE
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. TRIGGERS PARA updated_at
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_certifiers_updated_at BEFORE UPDATE ON certifiers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_certification_process_updated_at BEFORE UPDATE ON certification_process
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. DADOS INICIAIS - MÉTODOS DE PAGAMENTO
INSERT INTO payment_methods (name, type) VALUES
  ('PIX', 'pix'),
  ('Boleto', 'boleto'),
  ('Cartão de Crédito', 'cartao'),
  ('Transferência Bancária', 'transferencia'),
  ('Dinheiro', 'dinheiro');
