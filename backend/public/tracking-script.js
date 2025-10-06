(function() {
  'use strict';
  
  // Configuração global
  window.EJATracking = window.EJATracking || [];
  
  // Função para obter parâmetros da URL do script
  function getScriptParams() {
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      const src = scripts[i].src;
      if (src && src.includes('tracking/script.js')) {
        const url = new URL(src);
        return {
          trackingId: url.searchParams.get('id'),
          domain: url.searchParams.get('domain') || window.location.host
        };
      }
    }
    return null;
  }
  
  // Configuração do tracking
  const config = getScriptParams();
  if (!config || !config.trackingId) {
    console.warn('EJA Tracking: ID de tracking não encontrado');
    return;
  }
  
  const API_BASE = 'https://gestao-educa.autoflixtreinamentos.com/api/tracking';
  let sessionId = null;
  let pageviewId = null;
  let startTime = Date.now();
  
  // Função para obter parâmetros da URL
  function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  }
  
  // Função para fazer requisições
  function makeRequest(endpoint, data) {
    return fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    }).catch(error => {
      console.error('EJA Tracking Error:', error);
    });
  }
  
  // Função para obter informações do dispositivo
  function getDeviceInfo() {
    const ua = navigator.userAgent;
    let deviceType = 'desktop';
    
    if (/Mobile|Android|iPhone|iPad/.test(ua)) {
      deviceType = /iPad/.test(ua) ? 'tablet' : 'mobile';
    }
    
    return {
      userAgent: ua,
      deviceType: deviceType,
      screenResolution: `${screen.width}x${screen.height}`,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }
  
  // Criar sessão
  async function createSession() {
    const deviceInfo = getDeviceInfo();
    
    // Gerar session_id único
    const sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const sessionData = {
      session_id: sessionId,
      domain: config.domain,
      user_agent: deviceInfo.userAgent,
      device_type: deviceInfo.deviceType,
      screen_resolution: deviceInfo.screenResolution,
      language: deviceInfo.language,
      timezone: deviceInfo.timezone,
      referrer: document.referrer || null,
      utm_source: getUrlParameter('utm_source') || null,
      utm_medium: getUrlParameter('utm_medium') || null,
      utm_campaign: getUrlParameter('utm_campaign') || null,
      utm_term: getUrlParameter('utm_term') || null,
      utm_content: getUrlParameter('utm_content') || null
    };
    
    try {
      const response = await makeRequest('/session', sessionData);
      if (response && response.ok) {
        const result = await response.json();
        return result.session_id || sessionId;
      }
    } catch (error) {
      console.error('Erro ao criar sessão:', error);
    }
    
    return null;
  }
  
  // Registrar pageview
  async function trackPageview() {
    if (!sessionId) return;
    
    const pageviewData = {
      session_id: sessionId,
      page_url: window.location.href,
      page_title: document.title,
      referrer: document.referrer || null
    };
    
    try {
      const response = await makeRequest('/pageview', pageviewData);
      if (response && response.ok) {
        const result = await response.json();
        pageviewId = result.pageview_id;
        return pageviewId;
      }
    } catch (error) {
      console.error('Erro ao registrar pageview:', error);
    }
    
    return null;
  }
  
  // Registrar interação
  function trackInteraction(type, element, details = {}) {
    if (!sessionId) return;
    
    const interactionData = {
      session_id: sessionId,
      interaction_type: type,
      element_type: element.tagName?.toLowerCase() || 'unknown',
      element_id: element.id || null,
      element_class: element.className || null,
      element_text: element.textContent?.substring(0, 100) || null,
      page_url: window.location.href,
      ...details
    };
    
    makeRequest('/interaction', interactionData);
  }
  
  // Registrar evento customizado
  function trackEvent(eventName, eventData = {}) {
    if (!sessionId) return;
    
    const eventPayload = {
      session_id: sessionId,
      event_name: eventName,
      event_category: eventData.category || 'custom',
      event_action: eventData.action || eventName,
      event_label: eventData.label || null,
      event_value: eventData.value || null,
      custom_data: eventData.customData || null,
      page_url: window.location.href
    };
    
    makeRequest('/event', eventPayload);
  }
  
  // Atualizar tempo na página
  function updatePageTime() {
    if (!pageviewId) return;
    
    const timeOnPage = Math.floor((Date.now() - startTime) / 1000);
    
    fetch(`${API_BASE}/pageview/${pageviewId}/time`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ time_on_page: timeOnPage })
    }).catch(error => {
      console.error('Erro ao atualizar tempo na página:', error);
    });
  }
  
  // Event listeners
  function setupEventListeners() {
    // Cliques
    document.addEventListener('click', function(e) {
      trackInteraction('click', e.target, {
        x_position: e.clientX,
        y_position: e.clientY
      });
    });
    
    // Submissão de formulários
    document.addEventListener('submit', function(e) {
      trackInteraction('form_submit', e.target);
    });
    
    // Scroll
    let scrollTimeout;
    document.addEventListener('scroll', function() {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollPercent = Math.round(
          (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
        );
        
        if (scrollPercent > 0 && scrollPercent % 25 === 0) {
          trackEvent('scroll', {
            category: 'engagement',
            action: 'scroll',
            label: `${scrollPercent}%`,
            value: scrollPercent
          });
        }
      }, 100);
    });
    
    // Tempo na página (atualizar a cada 30 segundos)
    setInterval(updatePageTime, 30000);
    
    // Antes de sair da página
    window.addEventListener('beforeunload', updatePageTime);
    
    // Visibilidade da página
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'hidden') {
        updatePageTime();
      }
    });
  }
  
  // API pública
  window.EJATracking.push = function(command) {
    if (Array.isArray(command) && command.length >= 2) {
      const [action, ...args] = command;
      
      switch (action) {
        case 'event':
          trackEvent(args[0], args[1]);
          break;
        case 'interaction':
          trackInteraction(args[0], args[1], args[2]);
          break;
        default:
          console.warn('EJA Tracking: Comando desconhecido:', action);
      }
    }
  };
  
  // Processar comandos em fila
  const queue = window.EJATracking.slice();
  queue.forEach(command => {
    if (typeof window.EJATracking.push === 'function') {
      window.EJATracking.push(command);
    }
  });
  
  // Inicialização
  async function init() {
    try {
      await createSession();
      if (sessionId) {
        await trackPageview();
        setupEventListeners();
        
        // Evento de carregamento da página
        trackEvent('page_load', {
          category: 'navigation',
          action: 'load',
          label: document.title
        });
      }
    } catch (error) {
      console.error('Erro na inicialização do tracking:', error);
    }
  }
  
  // Iniciar quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();