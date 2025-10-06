# 🚀 Guia Prático de Instalação - Sistema de Tracking

## 📋 O que você precisa fazer?

Você tem **2 opções** para instalar o tracking no seu site:

### 🎯 **OPÇÃO 1: Script Universal (Mais Simples)**
✅ **Recomendado para qualquer site**  
✅ **Instalação em 2 minutos**  
✅ **Funciona em WordPress, HTML, React, etc.**

### 🔌 **OPÇÃO 2: Plugin WordPress (Mais Completo)**
✅ **Só para sites WordPress**  
✅ **Interface visual no painel**  
✅ **Configurações avançadas**

---

## 🎯 OPÇÃO 1: Script Universal (MAIS FÁCIL)

### Passo 1: Cadastrar seu domínio
1. Acesse: https://gestao-educa.autoflixtreinamentos.com/tracking
2. Faça login com:
   - **Email**: paulo@gmail.com
   - **Senha**: 123456
3. Vá em **"Configurações"** → **"Domínios"**
4. Clique em **"Adicionar Novo Domínio"**
5. Digite o endereço do seu site (ex: `meusite.com`)
6. Clique em **"Salvar"**

### Passo 2: Copiar o código
Após cadastrar, você verá um código assim:
```html
<script>
(function(w,d,s,l,i){
  w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
  var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
  j.async=true;j.src='https://gestao-educa.autoflixtreinamentos.com/api/tracking/script.js?id='+i+dl;
  f.parentNode.insertBefore(j,f);
})(window,document,'script','EJATracking','SEU_ID_AQUI');
</script>
```

### Passo 3: Instalar no seu site

#### 🌐 **Para WordPress:**
1. Vá no painel do WordPress
2. **Aparência** → **Editor de Temas**
3. Abra o arquivo **header.php**
4. Cole o código **ANTES** da tag `</head>`
5. Clique em **"Atualizar Arquivo"**

#### 📄 **Para site HTML:**
1. Abra o arquivo **index.html** (ou template principal)
2. Cole o código **ANTES** da tag `</head>`
3. Salve o arquivo
4. Faça upload para o servidor

#### ⚛️ **Para React/Next.js:**
1. Abra o arquivo **public/index.html**
2. Cole o código **ANTES** da tag `</head>`
3. Ou adicione no componente principal usando `dangerouslySetInnerHTML`

### ✅ Pronto! Já está funcionando!

---

## 🔌 OPÇÃO 2: Plugin WordPress (MAIS COMPLETO)

### Passo 1: Baixar o plugin
1. Baixe o arquivo: `tracking-wordpress-plugin.php`
2. Ou copie o código completo do plugin

### Passo 2: Instalar no WordPress

#### **Método 1: Upload direto**
1. Vá no painel do WordPress
2. **Plugins** → **Adicionar Novo**
3. Clique em **"Enviar Plugin"**
4. Escolha o arquivo `tracking-wordpress-plugin.php`
5. Clique em **"Instalar Agora"**
6. Clique em **"Ativar Plugin"**

#### **Método 2: FTP/cPanel**
1. Acesse seu servidor via FTP ou cPanel
2. Vá para a pasta: `/wp-content/plugins/`
3. Crie uma pasta: `eja-tracking`
4. Faça upload do arquivo `tracking-wordpress-plugin.php` dentro desta pasta
5. Renomeie para: `eja-tracking.php`
6. No WordPress: **Plugins** → **Plugins Instalados**
7. Ative o **"EJA Tracking System"**

### Passo 3: Configurar o plugin
1. Vá em **Configurações** → **EJA Tracking**
2. Configure:
   - ✅ **Ativar Tracking**: Marcado
   - **URL da API**: `https://gestao-educa.autoflixtreinamentos.com/api/tracking`
   - **Domínio**: Seu site (ex: `meusite.com`)
   - ✅ **Excluir Administradores**: Marcado (recomendado)
3. Clique em **"Salvar Alterações"**

### ✅ Pronto! Plugin instalado e configurado!

---

## 🔍 Como Verificar se Está Funcionando?

### Teste 1: Console do Navegador
1. Abra seu site
2. Pressione **F12** (DevTools)
3. Vá na aba **Console**
4. Digite: `console.log(typeof EJATracking)`
5. Deve retornar: `"object"`

### Teste 2: Aba Network
1. Abra seu site com **F12** aberto
2. Vá na aba **Network**
3. Recarregue a página
4. Procure por requisições para `/api/tracking/`
5. Status deve ser **200** (verde)

### Teste 3: Dashboard
1. Acesse: https://gestao-educa.autoflixtreinamentos.com/tracking
2. Vá em **"Analytics"** → **"Tempo Real"**
3. Navegue no seu site em outra aba
4. Deve aparecer atividade em tempo real

---

## 🎯 Qual Opção Escolher?

### 🌐 **Use o Script Universal se:**
- ✅ Quer algo rápido e simples
- ✅ Não precisa de configurações avançadas
- ✅ Tem qualquer tipo de site (não só WordPress)
- ✅ Quer instalar em 2 minutos

### 🔌 **Use o Plugin WordPress se:**
- ✅ Tem site WordPress
- ✅ Quer interface visual para configurar
- ✅ Precisa de configurações avançadas
- ✅ Quer excluir páginas específicas do tracking
- ✅ Quer ver estatísticas no painel do WordPress

---

## 🚨 Problemas Comuns e Soluções

### ❌ "Tracking não funciona"
**Solução:**
1. Verifique se o código está no `<head>` do site
2. Confirme se o domínio está cadastrado no sistema
3. Teste em modo anônimo do navegador
4. Verifique se não há bloqueadores de anúncios ativos

### ❌ "Dados não aparecem no dashboard"
**Solução:**
1. Aguarde 2-3 minutos (processamento)
2. Verifique se está logado no dashboard correto
3. Confirme se o domínio está ativo
4. Teste fazer algumas navegações no site

### ❌ "Plugin não aparece no WordPress"
**Solução:**
1. Verifique se o arquivo está na pasta correta: `/wp-content/plugins/eja-tracking/`
2. Confirme se o arquivo se chama `eja-tracking.php`
3. Verifique as permissões do arquivo (644)
4. Ative o plugin em **Plugins** → **Plugins Instalados**

---

## 📞 Precisa de Ajuda?

### 🎯 **Suporte Rápido:**
- **WhatsApp**: [Seu número]
- **Email**: suporte@ejaeducabrasil.com
- **Dashboard**: https://gestao-educa.autoflixtreinamentos.com/tracking

### 📚 **Documentação Completa:**
- **Guia Técnico**: `INSTRUCOES_TRACKING.md`
- **Visão Geral**: `README_TRACKING_SYSTEM.md`

---

## ⏱️ Tempo de Instalação

- **Script Universal**: ⚡ 2-5 minutos
- **Plugin WordPress**: 🔧 5-10 minutos
- **Verificação**: ✅ 1-2 minutos

**Total**: Menos de 15 minutos para ter tudo funcionando!

---

**🎉 Após a instalação, você terá:**
- ✅ Tracking completo de visitantes
- ✅ Analytics em tempo real
- ✅ Dados de geolocalização
- ✅ Métricas de engajamento
- ✅ Dashboard profissional
- ✅ Conformidade com LGPD

**Desenvolvido para EJA Educa Brasil** 🚀