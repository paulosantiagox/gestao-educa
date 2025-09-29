# ENDPOINTS NECESSÁRIOS NO BACKEND

Adicione estes endpoints no seu backend Express seguindo o padrão que você já usa.

## 1. CERTIFICADORAS (`/api/certifiers`)

```javascript
// GET /api/certifiers - Listar todas
// POST /api/certifiers - Criar nova
// PUT /api/certifiers/:id - Atualizar
// DELETE /api/certifiers/:id - Deletar
```

**Body exemplo (POST/PUT):**
```json
{
  "name": "Certificadora ABC",
  "contact_email": "contato@abc.com",
  "contact_phone": "(11) 99999-9999",
  "active": true
}
```

## 2. MÉTODOS DE PAGAMENTO (`/api/payment-methods`)

```javascript
// GET /api/payment-methods - Listar todos
// POST /api/payment-methods - Criar novo
// PUT /api/payment-methods/:id - Atualizar
// DELETE /api/payment-methods/:id - Deletar
```

**Body exemplo (POST/PUT):**
```json
{
  "name": "PIX",
  "type": "pix",
  "active": true
}
```

## 3. ALUNOS (`/api/students`)

```javascript
// GET /api/students - Listar todos (com paginação e filtros)
// GET /api/students/:id - Buscar um aluno
// POST /api/students - Criar novo aluno
// PUT /api/students/:id - Atualizar aluno
// DELETE /api/students/:id - Deletar aluno
// GET /api/students/search?q=termo - Buscar por nome, email ou CPF
```

**Body exemplo (POST/PUT):**
```json
{
  "name": "João Silva",
  "email": "joao@email.com",
  "phone": "(11) 98888-8888",
  "cpf": "123.456.789-00",
  "birth_date": "1990-01-15",
  "zip_code": "01234-567",
  "street": "Rua Exemplo",
  "number": "123",
  "complement": "Apto 45",
  "neighborhood": "Centro",
  "city": "São Paulo",
  "state": "SP",
  "documents_link": "https://drive.google.com/...",
  "active": true
}
```

## 4. VENDAS (`/api/sales`)

```javascript
// GET /api/sales - Listar todas (com paginação e filtros)
// GET /api/sales/:id - Buscar uma venda (com alunos associados)
// POST /api/sales - Criar nova venda
// PUT /api/sales/:id - Atualizar venda
// DELETE /api/sales/:id - Deletar venda
// GET /api/sales/search?q=termo - Buscar por código, pagador ou aluno
```

**Body exemplo (POST/PUT):**
```json
{
  "sale_code": "VND-2025-001",
  "payer_name": "Maria Silva",
  "payer_email": "maria@email.com",
  "payer_phone": "(11) 97777-7777",
  "payer_cpf": "987.654.321-00",
  "total_amount": 1500.00,
  "payment_method_id": 1,
  "student_ids": [1, 2, 3]
}
```

## 5. ASSOCIAR ALUNO À VENDA (`/api/student-sales`)

```javascript
// POST /api/student-sales - Associar aluno a uma venda
// DELETE /api/student-sales/:id - Remover associação
```

**Body exemplo (POST):**
```json
{
  "student_id": 1,
  "sale_id": 5
}
```

## 6. PAGAMENTOS PARCIAIS (`/api/payments`)

```javascript
// GET /api/payments/sale/:sale_id - Listar pagamentos de uma venda
// POST /api/payments - Registrar novo pagamento
// DELETE /api/payments/:id - Deletar pagamento
```

**Body exemplo (POST):**
```json
{
  "sale_id": 5,
  "amount": 500.00,
  "payment_date": "2025-01-15",
  "payment_method_id": 1,
  "notes": "Primeira parcela"
}
```

**IMPORTANTE:** Ao criar um pagamento, atualize o `paid_amount` da venda e o `payment_status`:
- Se `paid_amount < total_amount` → `payment_status = 'partial'`
- Se `paid_amount >= total_amount` → `payment_status = 'completed'`

## 7. PROCESSO DE CERTIFICAÇÃO (`/api/certification`)

```javascript
// GET /api/certification/student/:student_id - Buscar processo do aluno
// POST /api/certification - Iniciar processo para um aluno
// PUT /api/certification/:student_id/status - Atualizar status
// GET /api/certification/stats - Estatísticas do dashboard
```

**Body exemplo (PUT status):**
```json
{
  "status": "exam_taken",
  "exam_result": "approved",
  "exam_result_at": "2025-01-20T10:30:00Z"
}
```

**Status possíveis:**
- `enrolled` - Matriculado
- `welcomed` - Boas-vindas enviadas
- `exam_taken` - Prova realizada
- `exam_approved` - Prova aprovada
- `exam_failed` - Prova reprovada
- `documents_sent` - Documentos enviados
- `requested_to_certifier` - Solicitado à certificadora
- `in_certification` - Em processo de certificação
- `digital_delivered` - Certificado digital entregue
- `wants_physical` - Quer certificado físico
- `physical_shipping` - Certificado físico em envio
- `physical_tracking` - Código de rastreio informado
- `physical_delivered` - Certificado físico entregue
- `completed` - Processo concluído

## 8. DASHBOARD (`/api/dashboard/stats`)

```javascript
// GET /api/dashboard/stats - Retorna estatísticas gerais
```

**Resposta esperada:**
```json
{
  "total_students": 150,
  "certified_students": 80,
  "in_progress": 70,
  "completion_rate": 53.33,
  "status_breakdown": {
    "enrolled": 10,
    "welcomed": 15,
    "exam_taken": 20,
    "documents_sent": 15,
    "in_certification": 10,
    "completed": 80
  },
  "recent_activities": [
    {
      "student_name": "João Silva",
      "action": "Certificado digital entregue",
      "date": "2025-01-20T14:30:00Z"
    }
  ]
}
```

## OBSERVAÇÕES IMPORTANTES:

1. **Autenticação**: Todos os endpoints devem usar o middleware `requireAuth` que você já tem
2. **Validação**: Valide todos os campos obrigatórios
3. **Tratamento de erros**: Retorne erros padronizados como você já faz
4. **CORS**: Configure CORS se o frontend estiver em domínio diferente
5. **Paginação**: Para listagens grandes, adicione suporte a `page` e `limit` via query params
