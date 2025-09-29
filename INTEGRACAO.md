# 🚀 GUIA DE INTEGRAÇÃO - EDUCA BRASIL

## 📋 O QUE FOI CRIADO

### 1️⃣ Estrutura de Banco de Dados
**Arquivo:** `database-schema.sql`

Execute este arquivo no seu PostgreSQL para criar:
- ✅ Tabela `certifiers` - Certificadoras
- ✅ Tabela `payment_methods` - Métodos de pagamento (com dados iniciais)
- ✅ Tabela `students` - Alunos (com endereço completo)
- ✅ Tabela `sales` - Vendas
- ✅ Tabela `student_sales` - Associação aluno-venda
- ✅ Tabela `payments` - Pagamentos parciais
- ✅ Tabela `certification_process` - Processo de certificação completo
- ✅ Índices para performance
- ✅ Triggers para atualização automática de `updated_at`

**Como executar:**
```bash
psql -U seu_usuario -d seu_banco < database-schema.sql
```

---

### 2️⃣ Documentação dos Endpoints
**Arquivo:** `backend-endpoints.md`

Documentação completa de todos os endpoints que você precisa criar no seu backend Express. Inclui:
- Métodos HTTP (GET, POST, PUT, DELETE)
- Estrutura do body
- Exemplos de requisição/resposta
- Observações importantes

---

### 3️⃣ Cliente de API no Frontend
**Arquivo:** `src/lib/api.ts`

Cliente completo para comunicação com seu backend. Inclui todas as funções:
- Autenticação (login, logout, getMe)
- CRUD de alunos
- CRUD de vendas
- CRUD de certificadoras
- CRUD de métodos de pagamento
- Pagamentos parciais
- Processo de certificação
- Estatísticas do dashboard

**Configuração da URL:**
O cliente usa a variável de ambiente `VITE_API_URL`. Crie um arquivo `.env` na raiz:
```
VITE_API_URL=http://localhost:3000
```

---

### 4️⃣ Formulários Prontos

#### 📝 StudentForm (`src/components/forms/StudentForm.tsx`)
Formulário completo de cadastro de aluno com:
- Dados pessoais (nome, email, telefone, CPF, data de nascimento)
- Endereço completo (CEP, rua, número, complemento, bairro, cidade, estado)
- Link para documentos no Google Drive
- Validação com Zod
- Integração automática com a API

#### 💰 SaleForm (`src/components/forms/SaleForm.tsx`)
Formulário de cadastro de venda com:
- Código da venda
- Valor total
- Método de pagamento (select carregado da API)
- Dados do pagador (nome, email, telefone, CPF)
- Validação com Zod
- Integração automática com a API

#### 🏢 CertifierForm (`src/components/forms/CertifierForm.tsx`)
Formulário de cadastro de certificadora com:
- Nome da certificadora
- Email de contato
- Telefone de contato
- Status ativo/inativo (switch)
- Validação com Zod

#### 💳 PaymentMethodForm (`src/components/forms/PaymentMethodForm.tsx`)
Formulário de cadastro de método de pagamento com:
- Nome do método
- Tipo (PIX, Boleto, Cartão, etc.)
- Status ativo/inativo (switch)
- Validação com Zod

---

## 🔧 PRÓXIMOS PASSOS

### 1. No Backend (Express)
1. Execute o `database-schema.sql` no PostgreSQL
2. Implemente os endpoints documentados em `backend-endpoints.md`
3. Use o padrão que você já tem (middleware `requireAuth`, tratamento de erros)
4. Configure CORS se necessário

### 2. No Frontend (Lovable)
1. Crie o arquivo `.env` com a URL da sua API
2. Os formulários já estão prontos para uso
3. Integre os formulários nas páginas quando precisar

---

## 📦 EXEMPLO DE USO DOS FORMULÁRIOS

```tsx
import { StudentForm } from "@/components/forms/StudentForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function MinhaPage() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Aluno</DialogTitle>
        </DialogHeader>
        <StudentForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
```

---

## 🎯 STATUS DO PROJETO

### ✅ Concluído
- [x] Estrutura do banco de dados
- [x] Documentação dos endpoints
- [x] Cliente de API no frontend
- [x] Formulário de cadastro de alunos
- [x] Formulário de cadastro de vendas
- [x] Formulário de certificadoras
- [x] Formulário de métodos de pagamento

### 🔄 Próximo
- [ ] Implementar endpoints no backend
- [ ] Integrar formulários nas páginas
- [ ] Timeline de certificação
- [ ] Sistema de pagamentos parciais
- [ ] Pesquisa avançada com filtros
- [ ] Dashboard com dados reais

---

## 💡 DICAS IMPORTANTES

1. **Autenticação:** Todos os endpoints devem usar `requireAuth` (você já tem implementado)
2. **Validação:** Valide todos os campos no backend também
3. **Erros:** Use o padrão de erros que você já tem (`{ error: "codigo_erro" }`)
4. **Cookies:** O frontend envia cookies automaticamente com `credentials: 'include'`
5. **CORS:** Configure CORS no Express se frontend e backend estiverem em domínios diferentes

---

## 🆘 SUPORTE

Se tiver dúvidas sobre qualquer parte da integração, me avise! Posso ajudar com:
- Implementação específica de endpoints
- Ajustes nos formulários
- Novas funcionalidades
- Integração de componentes
