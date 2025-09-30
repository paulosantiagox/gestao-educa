# Migração das Etapas do Processo de Certificação

## ✅ Alterações Realizadas

O sistema foi atualizado com novas etapas do processo de certificação para refletir melhor o fluxo real:

### Etapas Antigas → Novas Etapas

| Status Antigo | Novo Status | Prazo Padrão |
|--------------|-------------|--------------|
| Pendente | **Boas-Vindas** (`welcome`) | 1 dia |
| - | **Prova em Andamento** (`exam_in_progress`) | 7 dias |
| Documentos Enviados | **Documentação Solicitada** (`documents_requested`) | 7 dias |
| Em Análise | **Documentação em Análise** (`documents_under_review`) | 7 dias |
| Aprovado | **Certificação Iniciada** (`certification_started`) | 45 dias |
| Certificado Emitido | **Certificado Digital Emitido e Enviado** (`digital_certificate_sent`) | 2 dias |
| Certificado Enviado | **Certificado Físico Enviado** (`physical_certificate_sent`) | 45 dias |
| Concluído | **Concluído** (`completed`) | - |

## 🔄 Descrição das Etapas

1. **Boas-Vindas** - O aluno recebe seus dados de acesso e uma mensagem de recepção
2. **Prova em Andamento** - O aluno é notificado sobre a realização e conclusão da prova
3. **Documentação Solicitada** - Solicitamos ao aluno o envio dos documentos necessários
4. **Documentação em Análise** - A equipe verifica os documentos recebidos ou aguarda documentos pendentes
5. **Certificação Iniciada** - Os documentos são enviados à certificadora, que inicia o processo
6. **Certificado Digital Emitido e Enviado** - O certificado digital é emitido e enviado ao aluno
7. **Certificado Físico Enviado** - Caso solicitado, o certificado é impresso e enviado fisicamente
8. **Concluído** - O processo de certificação é finalizado com sucesso

## 📋 Componentes Atualizados

### Frontend
- ✅ `src/components/forms/SLAConfigForm.tsx` - Configuração de SLA com novos status e prazos padrão
- ✅ `src/components/CertificationTimeline.tsx` - Timeline visual com novas etapas
- ✅ `src/components/MiniTimeline.tsx` - Mini timeline com indicadores SLA
- ✅ `src/components/forms/CertificationStatusUpdate.tsx` - Formulário de atualização de status
- ✅ `src/pages/CertificationProcess.tsx` - Página principal com tabela e filtros
- ✅ `src/pages/Dashboard.tsx` - Dashboard com estatísticas atualizadas

### Backend (Migrations)
- ✅ `backend/migrations/update_certification_status_fields.sql` - Adiciona novos campos de data
- ✅ `backend/migrations/update_certification_sla_defaults.sql` - Insere configurações SLA padrão

## 🔧 Próximos Passos

### 1. Executar Migrations no Banco de Dados

Execute as migrations SQL no seu banco de dados na seguinte ordem:

```bash
# 1. Adicionar novos campos de data
psql -d seu_banco -f backend/migrations/update_certification_status_fields.sql

# 2. Atualizar configurações SLA
psql -d seu_banco -f backend/migrations/update_certification_sla_defaults.sql
```

### 2. Migração de Dados Existentes (Opcional)

Se você tem processos de certificação em andamento com os status antigos, descomente e execute as queries de UPDATE na migration `update_certification_status_fields.sql` para:

- Mapear os status antigos para os novos
- Copiar as datas dos campos antigos para os novos campos

**⚠️ IMPORTANTE:** Faça backup do banco de dados antes de executar as migrations de atualização de dados!

### 3. Atualização da API Backend

Certifique-se de que a API backend está atualizada para:
- Aceitar os novos status ao criar/atualizar processos de certificação
- Retornar os novos campos de data nas respostas
- Atualizar os campos de data corretos ao mudar status

Exemplo de campos esperados na resposta da API:
```json
{
  "id": 1,
  "student_id": 123,
  "status": "documents_requested",
  "created_at": "2025-01-01T00:00:00Z",
  "exam_started_at": "2025-01-02T00:00:00Z",
  "documents_requested_at": "2025-01-05T00:00:00Z",
  "documents_under_review_at": null,
  "certification_started_at": null,
  "digital_certificate_sent_at": null,
  "physical_certificate_sent_at": null,
  "completed_at": null,
  "physical_tracking_code": null
}
```

## ✨ Funcionalidades Mantidas

- ✅ Configuração editável de prazos (SLA)
- ✅ Alertas visuais de processos atrasados ou próximos do vencimento
- ✅ Timeline visual do progresso
- ✅ Mini timeline na tabela de processos
- ✅ Exportação para CSV e Excel com todas as etapas
- ✅ Dashboard com estatísticas e gráficos
- ✅ Filtros por certificadora, status e certificado físico
- ✅ Paginação (10, 30, 50, 100, 500 registros)

## 📝 Observações

- Todos os prazos são editáveis através da tela de Configuração de SLA
- O sistema calcula automaticamente os alertas baseado nos prazos configurados
- Os prazos sugeridos são valores padrão e podem ser ajustados conforme necessário
- A nomenclatura foi atualizada para refletir melhor o fluxo real do processo
