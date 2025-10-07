(function() {
  'use strict';

  // Configurações do popup
  const CONFIG = {
    API_BASE_URL: 'https://gestao-educa.autoflixtreinamentos.com/api',
    WEBHOOK_URL: 'https://gestao-educa.autoflixtreinamentos.com/api/webhook-consultor',
    USE_BUTTONS_MODE: false // Modo direto para WhatsApp
  };

  // Utilitários
  const qs = (selector, context = document) => context.querySelector(selector);
  const normalizeDigits = (str) => (str || '').replace(/\D/g, '');

  // Dados dos consultores (serão carregados da API)
  let consultoresData = {
    google: [],
    meta: []
  };

  // Carregar dados dos consultores
  async function carregarConsultores() {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/consultores-redirect`);
      const data = await response.json();
      
      if (data.success) {
        consultoresData.google = data.data.google || [];
        consultoresData.meta = data.data.meta || [];
      }
    } catch (error) {
      console.error('Erro ao carregar consultores:', error);
    }
  }

  // Selecionar consultor ativo aleatório
  function selecionarConsultor(plataforma) {
    const consultores = consultoresData[plataforma] || [];
    const ativos = consultores.filter(c => c.ativo);
    
    if (ativos.length === 0) {
      console.warn(`Nenhum consultor ${plataforma} ativo encontrado`);
      return null;
    }
    
    return ativos[Math.floor(Math.random() * ativos.length)];
  }

  // Construir payload para webhook
  function buildPayload(whatsComDDD, campos) {
    return {
      timestamp: new Date().toISOString(),
      phone: whatsComDDD,
      platform: campos.plataforma || 'consultor',
      consultant: campos.consultor || 'N/A',
      source: campos.source || window.location.hostname,
      userAgent: navigator.userAgent,
      referrer: document.referrer || 'direct'
    };
  }

  // Enviar dados para webhook
  function sendPayloadFireAndForget(payload) {
    try {
      fetch(CONFIG.WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {}); // Fire and forget
    } catch (error) {
      console.error('Erro ao enviar payload:', error);
    }
  }

  // Aplicar máscara no telefone
  function applyPhoneMask(input) {
    input.addEventListener('input', function() {
      let value = normalizeDigits(this.value);
      if (value.length <= 11) {
        if (value.length <= 2) {
          this.value = value;
        } else if (value.length <= 7) {
          this.value = `(${value.slice(0,2)}) ${value.slice(2)}`;
        } else {
          this.value = `(${value.slice(0,2)}) ${value.slice(2,7)}-${value.slice(7)}`;
        }
      }
    });
  }

  // Criar HTML do popup
  function createPopupHTML() {
    return `
      <div id="consultor-chat-overlay" aria-hidden="true" style="display: none;">
        <div class="consultor-chat-modal" role="dialog" aria-label="Consultor - Chat">
          <!-- Cabeçalho -->
          <div class="consultor-chat-header">
            <div class="consultor-brand">
              <div class="consultor-logo-wrap">
                <div class="consultor-avatar">👨‍💼</div>
              </div>
              <div class="consultor-titles">
                <div class="consultor-name">Consultor Especialista <span class="consultor-verified">✅</span></div>
                <div class="consultor-status">Online agora</div>
              </div>
            </div>
            <button class="consultor-close" aria-label="Fechar chat">✕</button>
          </div>

          <!-- Conteúdo -->
          <div class="consultor-chat-body" id="consultorChatBody">
            <!-- Seleção de Plataforma -->
            <div id="consultorPlatformSelect">
              <div class="bubble bot">Olá! 👋 Sou seu consultor especialista.</div>
              <div class="bubble bot">Para qual plataforma você gostaria de receber consultoria?</div>
              
              <div class="platform-buttons">
                <button class="platform-btn google-btn" data-platform="google">
                  <span class="platform-icon">🔍</span>
                  <span class="platform-text">Google Ads</span>
                </button>
                <button class="platform-btn meta-btn" data-platform="meta">
                  <span class="platform-icon">📱</span>
                  <span class="platform-text">Meta Ads</span>
                </button>
              </div>
            </div>

            <!-- Formulário do número -->
            <div id="consultorPhoneSection" class="hidden">
              <div class="bubble user" id="selectedPlatformMsg"></div>
              <div class="bubble bot">Perfeito! Me confirma seu número de WhatsApp com DDD, por favor 👇</div>

              <form id="consultorPhoneForm" class="consultor-phone-row" autocomplete="off">
                <div class="ddi-box">+<input id="consultorDDI" name="ddi" inputmode="numeric" value="55" maxlength="3" aria-label="DDI" /></div>
                <input id="consultorPhone" name="phone" inputmode="numeric" placeholder="WhatsApp com DDD" aria-label="WhatsApp com DDD" />
                <button class="send" type="submit" aria-label="Confirmar número">➜</button>
              </form>
            </div>

            <!-- Confirmação -->
            <div id="consultorConfirmRow" class="hidden">
              <div class="bubble ok">🔒 Número confirmado e seguro!</div>
              <div class="bubble bot">Vou te direcionar para nosso consultor especialista no WhatsApp!</div>
            </div>
          </div>

          <div class="consultor-chat-footer">Consultoria Especializada</div>
        </div>
      </div>
    `;
  }

  // Criar CSS do popup
  function createPopupCSS() {
    return `
      <style>
        #consultor-chat-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          z-index: 999999;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
        }

        #consultor-chat-overlay.show {
          opacity: 1;
          visibility: visible;
        }

        .consultor-chat-modal {
          background: #ffffff;
          border-radius: 16px;
          width: 90%;
          max-width: 400px;
          max-height: 90vh;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          transform: scale(0.9) translateY(20px);
          transition: all 0.3s ease;
        }

        #consultor-chat-overlay.show .consultor-chat-modal {
          transform: scale(1) translateY(0);
        }

        .consultor-chat-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .consultor-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .consultor-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }

        .consultor-name {
          font-weight: 600;
          font-size: 16px;
        }

        .consultor-status {
          font-size: 12px;
          opacity: 0.9;
        }

        .consultor-verified {
          font-size: 14px;
        }

        .consultor-close {
          background: none;
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .consultor-close:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .consultor-chat-body {
          padding: 20px;
          max-height: 400px;
          overflow-y: auto;
        }

        .bubble {
          margin: 12px 0;
          padding: 12px 16px;
          border-radius: 18px;
          max-width: 85%;
          word-wrap: break-word;
        }

        .bubble.user {
          background: #007bff;
          color: white;
          margin-left: auto;
          border-bottom-right-radius: 4px;
        }

        .bubble.bot {
          background: #f1f3f4;
          color: #333;
          border-bottom-left-radius: 4px;
        }

        .bubble.ok {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .platform-buttons {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin: 16px 0;
        }

        .platform-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border: 2px solid #e9ecef;
          border-radius: 12px;
          background: white;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 16px;
        }

        .platform-btn:hover {
          border-color: #007bff;
          background: #f8f9ff;
        }

        .google-btn:hover {
          border-color: #4285f4;
          background: #f8f9ff;
        }

        .meta-btn:hover {
          border-color: #1877f2;
          background: #f8f9ff;
        }

        .platform-icon {
          font-size: 24px;
        }

        .platform-text {
          font-weight: 500;
          color: #333;
        }

        .consultor-phone-row {
          display: flex;
          gap: 8px;
          margin: 16px 0;
          align-items: center;
        }

        .ddi-box {
          display: flex;
          align-items: center;
          background: #f8f9fa;
          border: 2px solid #e9ecef;
          border-radius: 8px;
          padding: 0 8px;
          font-weight: 500;
        }

        .ddi-box input {
          border: none;
          background: none;
          width: 40px;
          text-align: center;
          font-weight: 500;
          outline: none;
        }

        #consultorPhone {
          flex: 1;
          padding: 12px;
          border: 2px solid #e9ecef;
          border-radius: 8px;
          font-size: 16px;
          outline: none;
          transition: border-color 0.2s;
        }

        #consultorPhone:focus {
          border-color: #007bff;
        }

        .send {
          background: #007bff;
          color: white;
          border: none;
          padding: 12px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 18px;
          transition: background 0.2s;
        }

        .send:hover {
          background: #0056b3;
        }

        .consultor-chat-footer {
          background: #f8f9fa;
          padding: 12px;
          text-align: center;
          font-size: 12px;
          color: #6c757d;
          border-top: 1px solid #e9ecef;
        }

        .hidden {
          display: none !important;
        }

        /* Responsivo */
        @media (max-width: 480px) {
          .consultor-chat-modal {
            width: 95%;
            margin: 10px;
          }
          
          .consultor-chat-body {
            padding: 16px;
          }
        }
      </style>
    `;
  }

  // Inicializar popup
  function initPopup(plataforma = null) {
    // Adicionar CSS se não existir
    if (!qs('#consultor-popup-styles')) {
      const styleElement = document.createElement('div');
      styleElement.id = 'consultor-popup-styles';
      styleElement.innerHTML = createPopupCSS();
      document.head.appendChild(styleElement);
    }

    // Adicionar HTML se não existir
    if (!qs('#consultor-chat-overlay')) {
      const popupElement = document.createElement('div');
      popupElement.innerHTML = createPopupHTML();
      document.body.appendChild(popupElement.firstElementChild);
    }

    const overlay = qs('#consultor-chat-overlay');
    const platformSelect = qs('#consultorPlatformSelect');
    const phoneSection = qs('#consultorPhoneSection');
    const confirmRow = qs('#consultorConfirmRow');
    const form = qs('#consultorPhoneForm');
    const inputDDI = qs('#consultorDDI');
    const inputPhone = qs('#consultorPhone');
    const closeBtn = qs('.consultor-close');

    let selectedPlatform = plataforma;
    let selectedConsultor = null;

    // Aplicar máscara no telefone
    applyPhoneMask(inputPhone);

    // Se plataforma específica, pular seleção
    if (plataforma) {
      platformSelect.classList.add('hidden');
      phoneSection.classList.remove('hidden');
      qs('#selectedPlatformMsg').textContent = `Quero consultoria para ${plataforma === 'google' ? 'Google Ads' : 'Meta Ads'}`;
      selectedConsultor = selecionarConsultor(plataforma);
    }

    // Event listeners para seleção de plataforma
    qs('.google-btn')?.addEventListener('click', () => {
      selectedPlatform = 'google';
      selectedConsultor = selecionarConsultor('google');
      platformSelect.classList.add('hidden');
      phoneSection.classList.remove('hidden');
      qs('#selectedPlatformMsg').textContent = 'Quero consultoria para Google Ads';
    });

    qs('.meta-btn')?.addEventListener('click', () => {
      selectedPlatform = 'meta';
      selectedConsultor = selecionarConsultor('meta');
      platformSelect.classList.add('hidden');
      phoneSection.classList.remove('hidden');
      qs('#selectedPlatformMsg').textContent = 'Quero consultoria para Meta Ads';
    });

    // Event listener para fechar
    closeBtn?.addEventListener('click', () => {
      overlay.classList.remove('show');
      setTimeout(() => {
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden', 'true');
      }, 300);
    });

    // Fechar ao clicar fora
    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeBtn.click();
      }
    });

    // Event listener para o formulário
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      
      if (!selectedConsultor) {
        alert('Erro: Nenhum consultor disponível no momento.');
        return;
      }

      const ddi = normalizeDigits(inputDDI.value) || '55';
      const phoneDigits = normalizeDigits(inputPhone.value);
      
      if (phoneDigits.length < 10) {
        inputPhone.focus();
        return;
      }

      const whatsComDDD = `(${ddi}) (${phoneDigits.slice(0,2)}) ${phoneDigits.slice(2,7)}-${phoneDigits.slice(7)}`;
      const campos = {
        plataforma: selectedPlatform,
        consultor: selectedConsultor.nome,
        numeroConsultor: selectedConsultor.numero,
        source: window.location.hostname
      };

      const payload = buildPayload(whatsComDDD, campos);
      const numeroConsultor = normalizeDigits(selectedConsultor.numero);
      const baseWA = `https://wa.me/55${numeroConsultor}`;
      
      const mensagem = selectedPlatform === 'google' 
        ? 'Olá! Quero consultoria especializada em Google Ads. 🚀'
        : 'Olá! Quero consultoria especializada em Meta Ads. 📱';

      // Enviar dados e redirecionar
      sendPayloadFireAndForget(payload);
      
      // Mostrar confirmação
      phoneSection.classList.add('hidden');
      confirmRow.classList.remove('hidden');
      
      // Redirecionar após 2 segundos
      setTimeout(() => {
        window.open(`${baseWA}?text=${encodeURIComponent(mensagem)}`, '_blank');
        closeBtn.click();
      }, 2000);
    });

    // Mostrar popup
    overlay.style.display = 'flex';
    overlay.setAttribute('aria-hidden', 'false');
    setTimeout(() => {
      overlay.classList.add('show');
    }, 10);
  }

  // Função para abrir popup específico
  function abrirPopupGoogle() {
    initPopup('google');
  }

  function abrirPopupMeta() {
    initPopup('meta');
  }

  function abrirPopupConsultor() {
    initPopup();
  }

  // Inicialização quando DOM estiver pronto
  function init() {
    // Carregar dados dos consultores
    carregarConsultores();

    // Configurar event listeners para os botões
    const btnGoogle = qs('#abrirPopupGoogle');
    const btnMeta = qs('#abrirPopupMeta');
    const btnConsultor = qs('#abrirPopupConsultor');

    if (btnGoogle) {
      btnGoogle.addEventListener('click', abrirPopupGoogle);
    }

    if (btnMeta) {
      btnMeta.addEventListener('click', abrirPopupMeta);
    }

    if (btnConsultor) {
      btnConsultor.addEventListener('click', abrirPopupConsultor);
    }
  }

  // Expor funções globalmente para uso externo
  window.PopupConsultor = {
    abrirGoogle: abrirPopupGoogle,
    abrirMeta: abrirPopupMeta,
    abrirUnificado: abrirPopupConsultor,
    init: init
  };

  // Auto-inicializar quando DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();