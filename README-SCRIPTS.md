# 📋 Scripts de Automação - Gestão Educa

Este projeto possui scripts automatizados para facilitar o desenvolvimento e deploy.

## 🚀 Scripts Disponíveis

### 1. `deploy.sh` - Deploy Automático
**Função:** Faz deploy completo da aplicação (frontend + backend)

```bash
./deploy.sh
```

**O que faz:**
- ✅ Limpa build anterior
- ✅ Constrói frontend com Vite
- ✅ Cria nova imagem Docker do frontend
- ✅ Remove serviço frontend antigo
- ✅ Faz deploy do stack
- ✅ **Força atualização do backend**
- ✅ Aguarda inicialização (20s)
- ✅ Testa se o deploy funcionou

### 2. `commit-push.sh` - Commit e Push Automático
**Função:** Automatiza todo o processo de commit e push para GitHub

```bash
./commit-push.sh "sua mensagem de commit"
```

**Exemplos de uso:**
```bash
./commit-push.sh "feat: adicionar nova funcionalidade"
./commit-push.sh "fix: corrigir bug na tela de estudantes"
./commit-push.sh "docs: atualizar documentação"
```

**O que faz:**
- ✅ Verifica se é um repositório Git válido
- ✅ Mostra arquivos modificados
- ✅ Pede confirmação antes de continuar
- ✅ Adiciona todos os arquivos (`git add .`)
- ✅ Faz commit com a mensagem fornecida
- ✅ Faz push para `origin main`
- ✅ Verifica se a sincronização foi bem-sucedida
- ✅ Mostra resumo completo da operação

**Recursos especiais:**
- 🎨 **Interface colorida** para melhor visualização
- 🔍 **Verificações de segurança** antes de cada operação
- ⚠️ **Avisos e confirmações** para evitar erros
- 📊 **Resumo detalhado** ao final
- 🔄 **Detecção automática** se há mudanças ou commits pendentes

## 🛡️ Segurança e Validações

### `commit-push.sh` inclui:
- Validação de repositório Git
- Verificação de mensagem de commit obrigatória
- Confirmação antes de executar operações
- Detecção de erros em cada etapa
- Verificação de sincronização final

## 📝 Convenções de Commit

Recomendamos usar estas convenções para mensagens de commit:

- `feat:` - Nova funcionalidade
- `fix:` - Correção de bug
- `docs:` - Documentação
- `style:` - Formatação, sem mudança de código
- `refactor:` - Refatoração de código
- `test:` - Adição ou correção de testes
- `chore:` - Tarefas de manutenção

## 🔧 Fluxo de Trabalho Recomendado

1. **Desenvolver** suas modificações
2. **Testar** localmente
3. **Commit e Push:**
   ```bash
   ./commit-push.sh "feat: sua descrição aqui"
   ```
4. **Deploy:**
   ```bash
   ./deploy.sh
   ```

## 🆘 Solução de Problemas

### Erro de permissão:
```bash
chmod +x commit-push.sh
chmod +x deploy.sh
```

### Erro de Git:
- Verifique se está no diretório correto
- Verifique suas credenciais do Git
- Verifique conexão com internet

### Erro de Docker:
- Verifique se o Docker está rodando
- Verifique se tem permissões para Docker

## 📞 Suporte

Se encontrar problemas, verifique:
1. Permissões dos scripts (`chmod +x`)
2. Conexão com internet
3. Credenciais do Git configuradas
4. Docker rodando (para deploy)

---
*Scripts criados para automatizar e simplificar o desenvolvimento do Gestão Educa* 🎓