# 📊 Sistema de Tracking Web - EJA Educa Brasil

## 🎯 Visão Geral

Este sistema de tracking foi desenvolvido para coletar dados detalhados sobre o comportamento dos usuários nos sites WordPress, permitindo análises avançadas de conversão, engajamento e otimização de performance. O sistema suporta **múltiplos domínios** e oferece um dashboard completo para visualização dos dados.

## 🚀 Funcionalidades

### ✅ Dados Coletados Automaticamente
- **Sessões de usuário** com geolocalização por IP
- **Pageviews** com tempo de permanência
- **Cliques** em elementos da página
- **Scroll depth** (profundidade de rolagem)
- **Submissões de formulários**
- **Informações do dispositivo** (browser, OS, resolução)
- **Parâmetros UTM** para campanhas
- **Dados de referência** (de onde veio o usuário)

### 📱 Compatibilidade
- ✅ Desktop, Mobile e Tablet
- ✅ Todos os browsers modernos
- ✅ WordPress (qualquer versão)
- ✅ Sites estáticos (HTML/JS)
- ✅ **Múltiplos domínios** com controle centralizado
- ✅ Não impacta performance do site

### 📊 Dashboard Analytics
- **Métricas em tempo real**: Pageviews, visitantes únicos, sessões
- **Análise temporal**: Gráficos por hora, dia, semana, mês
- **Análise geográfica**: Visitantes por país e cidade
- **Análise de dispositivos**: Tipos de dispositivo e browsers
- **Páginas mais visitadas**: Ranking de conteúdo
- **Taxa de rejeição** e duração média das sessões
- **Eventos customizados** e interações dos usuários

## 🌐 Expansão Multi-Domínios

### Configuração de Novos Domínios

1. **Adicionar domínio no sistema:**
   ```sql
   INSERT INTO tracking_domains (domain, tracking_code, is_active, settings) 
   VALUES ('seunovodominio.com', 'CODIGO_UNICO_GERADO', true, '{}');
   ```

2. **Configurar no site:**
   - Use o mesmo script de tracking
   - O sistema detecta automaticamente o domínio
   - Cada domínio tem dados isolados e seguros

### Gerenciamento Centralizado
- **Dashboard único** para todos os domínios
- **Filtros por domínio** nas análises
- **Configurações independentes** por site
- **Códigos de tracking únicos** para segurança

## 📋 Instalação

### Opção 1: Plugin WordPress (Recomendado)

1. **Faça upload do plugin:**
   ```bash
   # Copie o arquivo tracking-wordpress-plugin.php para:
   /wp-content/plugins/eja-tracking/eja-tracking.php
   ```

2. **Ative o plugin:**
   - Acesse `Plugins > Plugins Instalados`
   - Ative "EJA Tracking System"

3. **Configure:**
   - Vá em `Configurações > EJA Tracking`
   - Verifique se está ativado
   - Confirme a URL da API: `https://gestao-educa.autoflixtreinamentos.com/api/tracking`

### Opção 2: Script Manual

1. **Adicione no `<head>` do seu tema:**
   ```html
   <script src="https://gestao-educa.autoflixtreinamentos.com/tracking-script.js"></script>
   ```

2. **Ou use a versão minificada:**
   ```html
   <script src="https://gestao-educa.autoflixtreinamentos.com/tracking-script-minified.js"></script>
   ```

3. **Ou inclua o código inline:**
   ```html
   <script>
   // Cole aqui o conteúdo do arquivo tracking-script.js
   </script>
   ```

## 🔧 Configuração Avançada

### Personalizar Configurações

```javascript
// Sobrescrever configurações padrão
window.EJA_TRACKING_CONFIG = {
    API_BASE_URL: 'https://gestao-educa.autoflixtreinamentos.com/api/tracking',
    DOMAIN: 'meusite.com',
    SESSION_DURATION: 30 * 60 * 1000, // 30 minutos
    HEARTBEAT_INTERVAL: 30 * 1000,    // 30 segundos
    SCROLL_THRESHOLD: 5,              // % mínimo de scroll
    TIME_THRESHOLD: 5,                // segundos mínimos na página
    DEBUG: false                      // logs no console
};
```

### Excluir Páginas do Tracking

```javascript
// Adicionar antes do script de tracking
if (window.location.pathname.includes('/admin/') || 
    window.location.pathname.includes('/wp-admin/')) {
    window.EJA_TRACKING_DISABLED = true;
}
```

## 📊 Uso Manual (Eventos Personalizados)

### Rastrear Eventos

```javascript
// Evento básico
EJATracking.trackEvent({
    event_name: 'download',
    event_category: 'engagement',
    event_action: 'click',
    event_label: 'ebook_matematica'
});

// Evento com valor
EJATracking.trackEvent({
    event_name: 'purchase',
    event_category: 'conversion',
    event_action: 'buy',
    event_label: 'curso_premium',
    event_value: 197.00
});

// Evento com dados customizados
EJATracking.trackEvent({
    event_name: 'video_interaction',
    event_category: 'media',
    event_action: 'play',
    event_label: 'aula_introducao',
    custom_data: {
        video_duration: 300,
        video_position: 45,
        video_quality: '720p'
    }
});
```

### Rastrear Interações

```javascript
// Interação personalizada
EJATracking.trackInteraction({
    interaction_type: 'video_play',
    element_type: 'video',
    element_id: 'intro-video',
    element_text: 'Vídeo de Introdução'
});

// Clique em botão específico
EJATracking.trackInteraction({
    interaction_type: 'cta_click',
    element_type: 'button',
    element_class: 'btn-primary',
    element_text: 'Inscreva-se Agora'
});
```

## 🎯 Exemplos de Uso Prático

### 1. E-commerce / Vendas

```javascript
// Produto visualizado
EJATracking.trackEvent({
    event_name: 'product_view',
    event_category: 'ecommerce',
    event_action: 'view',
    event_label: 'curso_matematica_basica',
    event_value: 97.00
});

// Adicionado ao carrinho
EJATracking.trackEvent({
    event_name: 'add_to_cart',
    event_category: 'ecommerce',
    event_action: 'add',
    event_label: 'curso_matematica_basica',
    event_value: 97.00
});

// Compra finalizada
EJATracking.trackEvent({
    event_name: 'purchase',
    event_category: 'conversion',
    event_action: 'buy',
    event_label: 'curso_matematica_basica',
    event_value: 97.00,
    custom_data: {
        transaction_id: 'TXN123456',
        payment_method: 'credit_card',
        installments: 3
    }
});
```

### 2. Formulários e Leads

```javascript
// Lead capturado
EJATracking.trackEvent({
    event_name: 'lead_generated',
    event_category: 'conversion',
    event_action: 'form_submit',
    event_label: 'newsletter_signup'
});

// Download de material
EJATracking.trackEvent({
    event_name: 'download',
    event_category: 'engagement',
    event_action: 'click',
    event_label: 'ebook_dicas_enem',
    custom_data: {
        file_type: 'pdf',
        file_size: '2.5MB'
    }
});
```

### 3. Engajamento com Conteúdo

```javascript
// Tempo de leitura
setTimeout(() => {
    EJATracking.trackEvent({
        event_name: 'content_engagement',
        event_category: 'engagement',
        event_action: 'time_spent',
        event_label: 'artigo_dicas_matematica',
        event_value: 120 // segundos
    });
}, 120000); // após 2 minutos

// Compartilhamento social
EJATracking.trackEvent({
    event_name: 'social_share',
    event_category: 'engagement',
    event_action: 'share',
    event_label: 'facebook',
    custom_data: {
        content_type: 'article',
        content_title: 'Dicas de Matemática para o ENEM'
    }
});
```

## 🔍 Monitoramento e Debug

### Verificar se está funcionando

```javascript
// Verificar se o tracking está ativo
console.log('Tracking ativo:', typeof EJATracking !== 'undefined');

// Obter ID da sessão atual
console.log('Session ID:', EJATracking.getSessionId());

// Ativar modo debug (adicionar antes do script)
window.EJA_TRACKING_CONFIG = { DEBUG: true };
```

### Logs no Console

Com debug ativado, você verá:
```
EJA Tracking initialized successfully
Tracking session initialized: xxxx-xxxx-4xxx-yxxx
Pageview tracked: 123
```

## 📈 Dados Disponíveis na API

### Endpoints Disponíveis

- `GET /api/tracking/domains` - Lista domínios cadastrados
- `GET /api/tracking/analytics` - Dados de analytics
- `POST /api/tracking/session` - Criar/atualizar sessão
- `POST /api/tracking/pageview` - Registrar pageview
- `POST /api/tracking/interaction` - Registrar interação
- `POST /api/tracking/event` - Registrar evento personalizado

### Exemplo de Consulta

```javascript
// Buscar analytics do último mês
fetch('https://gestao-educa.autoflixtreinamentos.com/api/tracking/analytics?period=30d')
    .then(response => response.json())
    .then(data => console.log(data));
```

## 🛡️ Privacidade e LGPD

### Dados Coletados
- ✅ **Anônimos**: IPs são hasheados, não identificam pessoas
- ✅ **Agregados**: Focamos em padrões, não indivíduos
- ✅ **Temporários**: Dados antigos são limpos automaticamente
- ✅ **Seguros**: Transmissão criptografada (HTTPS)

### Conformidade
- ✅ Não coleta dados pessoais identificáveis
- ✅ Não usa cookies de terceiros
- ✅ Respeita configurações de "Do Not Track"
- ✅ Permite opt-out via localStorage

### Opt-out para Usuários

```javascript
// Desativar tracking para o usuário atual
localStorage.setItem('eja_tracking_optout', 'true');

// Reativar
localStorage.removeItem('eja_tracking_optout');
```

## 🚨 Solução de Problemas

### Tracking não funciona

1. **Verificar console do browser:**
   ```javascript
   // Deve retornar true
   console.log(typeof EJATracking !== 'undefined');
   ```

2. **Verificar rede:**
   - Abra DevTools > Network
   - Procure por requisições para `/api/tracking/`
   - Status deve ser 200

3. **Verificar configuração:**
   ```javascript
   console.log(window.EJA_TRACKING_CONFIG);
   ```

### Dados não aparecem

1. **Aguardar processamento:** Dados podem levar alguns minutos
2. **Verificar domínio:** Deve estar cadastrado no sistema
3. **Verificar API:** Testar endpoint manualmente

## ⚡ Performance e Otimização

### Métricas de Performance
- **Tempo de resposta da API**: < 50ms (otimizado com índices)
- **Tamanho do script**: 8KB minificado
- **Impacto no site**: < 1% no tempo de carregamento
- **Cache de geolocalização**: 30 dias para reduzir consultas

### Otimizações Implementadas
- **Índices de banco de dados** para consultas rápidas
- **Cache de IP geolocalização** para evitar APIs externas
- **Compressão gzip** nos scripts
- **Lazy loading** de dados não críticos
- **Batch processing** para múltiplas interações

### Monitoramento
- **Logs de erro** centralizados
- **Métricas de API** em tempo real
- **Alertas automáticos** para falhas
- **Dashboard de performance** integrado

## 🔮 Próximos Passos

### Funcionalidades Planejadas

1. **Análise Avançada:**
   - Funis de conversão personalizados
   - Segmentação de usuários
   - A/B testing integrado
   - Análise de cohort

2. **Integrações:**
   - Google Analytics 4
   - Facebook Pixel
   - WhatsApp Business API
   - CRM integrations

3. **Automação:**
   - Alertas por email/SMS
   - Relatórios automáticos
   - Triggers baseados em comportamento
   - Machine learning para predições

4. **Expansão:**
   - API pública para desenvolvedores
   - Webhooks para integrações
   - SDK para mobile apps
   - Suporte a e-commerce avançado

### Roadmap Técnico

- **Q1 2025**: Análise de funis e segmentação
- **Q2 2025**: Integrações com terceiros
- **Q3 2025**: Machine learning e predições
- **Q4 2025**: API pública e SDK mobile

---

## 📞 Suporte

Para dúvidas ou suporte técnico:
- **Email**: suporte@ejaeducabrasil.com
- **Dashboard**: https://gestao-educa.autoflixtreinamentos.com/tracking
- **Documentação**: Sempre atualizada neste arquivo

---

*Última atualização: Janeiro 2025*
*Versão do sistema: 1.0.0*