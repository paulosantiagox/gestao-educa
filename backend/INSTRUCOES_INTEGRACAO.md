# 📋 Instruções de Integração - Backend

## 1️⃣ Adicionar Avatar na Tabela Users

Execute este SQL no seu PostgreSQL:

```sql
-- Adiciona campo avatar_url na tabela users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
```

## 2️⃣ Criar Todas as Tabelas do Sistema

Execute o arquivo `database-schema.sql` completo no seu banco:

```bash
psql -U sistema_educa -d sistema_educa -f database-schema.sql
```

Ou copie e execute manualmente todas as queries do arquivo.

## 3️⃣ Adicionar as Rotas no seu index.js

No seu arquivo `backend/index.js`, adicione estas importações no topo:

```javascript
import studentsRouter from './routes/students.js';
import salesRouter from './routes/sales.js';
import certifiersRouter from './routes/certifiers.js';
import paymentMethodsRouter from './routes/payment-methods.js';
import paymentsRouter from './routes/payments.js';
import certificationRouter from './routes/certification.js';
import dashboardRouter from './routes/dashboard.js';
import studentSalesRouter from './routes/student-sales.js';
```

Depois, adicione estas linhas ANTES do `app.listen()`:

```javascript
// Rotas do sistema
app.use('/api/students', studentsRouter);
app.use('/api/sales', salesRouter);
app.use('/api/certifiers', certifiersRouter);
app.use('/api/payment-methods', paymentMethodsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/certification', certificationRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/student-sales', studentSalesRouter);
```

## 4️⃣ Atualizar a Rota /api/auth/me

No seu arquivo `backend/routes/auth.js`, atualize a rota GET /me para incluir o avatar:

```javascript
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, avatar_url, created_at FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});
```

## 5️⃣ Configurar CORS (se ainda não tiver)

No seu `backend/index.js`, adicione CORS para aceitar o frontend:

```javascript
import cors from 'cors';

// Adicione antes das rotas
app.use(cors({
  origin: 'http://localhost:8080', // URL do Lovable
  credentials: true
}));
```

Se ainda não tiver o pacote cors instalado:

```bash
npm install cors
```

## 6️⃣ Testar a API

Após fazer deploy ou reiniciar o servidor local, teste os endpoints:

```bash
# Listar métodos de pagamento (já vem com dados iniciais)
curl http://localhost:3000/api/payment-methods \
  -H "Cookie: token=SEU_TOKEN_JWT"

# Criar certificadora
curl -X POST http://localhost:3000/api/certifiers \
  -H "Cookie: token=SEU_TOKEN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"name":"SEBRAE","contact_email":"contato@sebrae.com.br"}'

# Ver estatísticas
curl http://localhost:3000/api/dashboard/stats \
  -H "Cookie: token=SEU_TOKEN_JWT"
```

## 7️⃣ Estrutura de Pastas Esperada

```
backend/
├── index.js
├── db.js
├── middleware/
│   └── auth.js
└── routes/
    ├── auth.js
    ├── users.js
    ├── students.js          ← NOVO
    ├── sales.js             ← NOVO
    ├── certifiers.js        ← NOVO
    ├── payment-methods.js   ← NOVO
    ├── payments.js          ← NOVO
    ├── certification.js     ← NOVO
    ├── dashboard.js         ← NOVO
    └── student-sales.js     ← NOVO
```

## ✅ Checklist

- [ ] Executei a migration `add_avatar_to_users.sql`
- [ ] Executei todo o `database-schema.sql`
- [ ] Copiei todos os arquivos de rotas para `backend/routes/`
- [ ] Adicionei as importações no `index.js`
- [ ] Adicionei os `app.use()` no `index.js`
- [ ] Atualizei a rota `/api/auth/me` para incluir `avatar_url`
- [ ] Configurei CORS no `index.js`
- [ ] Reiniciei o servidor backend
- [ ] Testei pelo menos um endpoint novo

## 🚀 Próximos Passos

Após concluir a integração do backend, o frontend já está pronto para:

1. Fazer login e mostrar avatar do usuário
2. Cadastrar alunos, vendas, certificadoras
3. Gerenciar métodos de pagamento
4. Ver dashboard com estatísticas
5. Acompanhar processos de certificação

## ⚠️ Importante

- Todos os endpoints exigem autenticação (JWT via cookie httpOnly)
- Valide os dados no backend antes de salvar
- As transações de pagamento usam BEGIN/COMMIT para garantir consistência
- O frontend está configurado para `https://sistema-educa.autoflixtreinamentos.com`
