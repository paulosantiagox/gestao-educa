/**
 * SISTEMA DE TRACKING WEB - EJA EDUCA BRASIL
 * Script para coleta de dados de interação dos usuários
 * Versão: 1.0.0
 * 
 * INSTRUÇÕES DE USO:
 * 1. Adicione este script no <head> ou antes do </body> do seu site WordPress
 * 2. Configure o domínio correto na variável TRACKING_CONFIG
 * 3. O script iniciará automaticamente o tracking
 */

(function() {
    'use strict';
    
    // ==========================================
    // CONFIGURAÇÕES
    // ==========================================
    const TRACKING_CONFIG = {
        API_BASE_URL: 'https://gestao-educa.autoflixtreinamentos.com/api/tracking',
        DOMAIN: window.location.hostname,
        SESSION_DURATION: 30 * 60 * 1000, // 30 minutos em ms
        HEARTBEAT_INTERVAL: 30 * 1000, // 30 segundos
        SCROLL_THRESHOLD: 5, // % mínimo de scroll para registrar
        TIME_THRESHOLD: 5 // segundos mínimos na página
    };
    
    // ==========================================
    // VARIÁVEIS GLOBAIS
    // ==========================================
    let sessionId = null;
    let currentPageviewId = null;
    let pageStartTime = Date.now();
    let maxScrollDepth = 0;
    let timeOnPage = 0;
    let heartbeatInterval = null;
    let isTracking = false;
    
    // ==========================================
    // UTILITÁRIOS
    // ==========================================
    
    // Gerar ID único
    function generateId() {
        return 'xxxx-xxxx-4xxx-yxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    // Obter ou criar session ID
    function getSessionId() {
        let sessionId = localStorage.getItem('eja_tracking_session');
        const sessionTime = localStorage.getItem('eja_tracking_session_time');
        const now = Date.now();
        
        // Verificar se a sessão expirou
        if (!sessionId || !sessionTime || (now - parseInt(sessionTime)) > TRACKING_CONFIG.SESSION_DURATION) {
            sessionId = generateId();
            localStorage.setItem('eja_tracking_session', sessionId);
        }
        
        localStorage.setItem('eja_tracking_session_time', now.toString());
        return sessionId;
    }
    
    // Detectar informações do dispositivo
    function getDeviceInfo() {
        const ua = navigator.userAgent;
        let deviceType = 'desktop';
        
        if (/tablet|ipad|playbook|silk/i.test(ua)) {
            deviceType = 'tablet';
        } else if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(ua)) {
            deviceType = 'mobile';
        }
        
        // Detectar browser
        let browser = 'unknown';
        let browserVersion = '';
        
        if (ua.indexOf('Chrome') > -1) {
            browser = 'Chrome';
            browserVersion = ua.match(/Chrome\/([0-9.]+)/)?.[1] || '';
        } else if (ua.indexOf('Firefox') > -1) {
            browser = 'Firefox';
            browserVersion = ua.match(/Firefox\/([0-9.]+)/)?.[1] || '';
        } else if (ua.indexOf('Safari') > -1) {
            browser = 'Safari';
            browserVersion = ua.match(/Version\/([0-9.]+)/)?.[1] || '';
        } else if (ua.indexOf('Edge') > -1) {
            browser = 'Edge';
            browserVersion = ua.match(/Edge\/([0-9.]+)/)?.[1] || '';
        }
        
        // Detectar OS
        let os = 'unknown';
        let osVersion = '';
        
        if (ua.indexOf('Windows') > -1) {
            os = 'Windows';
            osVersion = ua.match(/Windows NT ([0-9.]+)/)?.[1] || '';
        } else if (ua.indexOf('Mac') > -1) {
            os = 'macOS';
            osVersion = ua.match(/Mac OS X ([0-9_.]+)/)?.[1]?.replace(/_/g, '.') || '';
        } else if (ua.indexOf('Linux') > -1) {
            os = 'Linux';
        } else if (ua.indexOf('Android') > -1) {
            os = 'Android';
            osVersion = ua.match(/Android ([0-9.]+)/)?.[1] || '';
        } else if (ua.indexOf('iOS') > -1) {
            os = 'iOS';
            osVersion = ua.match(/OS ([0-9_]+)/)?.[1]?.replace(/_/g, '.') || '';
        }
        
        return {
            device_type: deviceType,
            browser: browser,
            browser_version: browserVersion,
            os: os,
            os_version: osVersion,
            screen_resolution: `${screen.width}x${screen.height}`,
            user_agent: ua
        };
    }
    
    // Obter parâmetros UTM
    function getUtmParams() {
        const urlParams = new URLSearchParams(window.location.search);
        return {
            utm_source: urlParams.get('utm_source'),
            utm_medium: urlParams.get('utm_medium'),
            utm_campaign: urlParams.get('utm_campaign'),
            utm_term: urlParams.get('utm_term'),
            utm_content: urlParams.get('utm_content')
        };
    }
    
    // Fazer requisição para API
    async function apiRequest(endpoint, data) {
        try {
            const response = await fetch(`${TRACKING_CONFIG.API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.warn('Tracking API error:', error);
            return null;
        }
    }
    
    // ==========================================
    // FUNÇÕES DE TRACKING
    // ==========================================
    
    // Inicializar sessão
    async function initSession() {
        if (isTracking) return;
        
        sessionId = getSessionId();
        const deviceInfo = getDeviceInfo();
        const utmParams = getUtmParams();
        
        const sessionData = {
            session_id: sessionId,
            domain: TRACKING_CONFIG.DOMAIN,
            ...deviceInfo,
            referrer: document.referrer || null,
            ...utmParams
        };
        
        const result = await apiRequest('/session', sessionData);
        if (result && result.success) {
            isTracking = true;
            console.log('Tracking session initialized:', sessionId);
        }
    }
    
    // Registrar pageview
    async function trackPageview() {
        if (!isTracking || !sessionId) return;
        
        const pageData = {
            session_id: sessionId,
            page_url: window.location.href,
            page_title: document.title,
            page_path: window.location.pathname,
            load_time: performance.timing ? 
                (performance.timing.loadEventEnd - performance.timing.navigationStart) : null
        };
        
        const result = await apiRequest('/pageview', pageData);
        if (result && result.success) {
            currentPageviewId = result.pageview.id;
            console.log('Pageview tracked:', currentPageviewId);
        }
    }
    
    // Registrar interação
    async function trackInteraction(interactionData) {
        if (!isTracking || !sessionId) return;
        
        const data = {
            session_id: sessionId,
            pageview_id: currentPageviewId,
            page_url: window.location.href,
            ...interactionData
        };
        
        await apiRequest('/interaction', data);
    }
    
    // Registrar evento personalizado
    async function trackEvent(eventData) {
        if (!isTracking || !sessionId) return;
        
        const data = {
            session_id: sessionId,
            page_url: window.location.href,
            ...eventData
        };
        
        await apiRequest('/event', data);
    }
    
    // Atualizar tempo na página
    async function updatePageTime() {
        if (!isTracking || !sessionId || !currentPageviewId) return;
        
        timeOnPage = Math.floor((Date.now() - pageStartTime) / 1000);
        
        const data = {
            session_id: sessionId,
            pageview_id: currentPageviewId,
            time_on_page: timeOnPage,
            scroll_depth: maxScrollDepth
        };
        
        await apiRequest('/page-time', data);
    }
    
    // ==========================================
    // EVENT LISTENERS
    // ==========================================
    
    // Tracking de cliques
    function setupClickTracking() {
        document.addEventListener('click', function(e) {
            const element = e.target;
            const rect = element.getBoundingClientRect();
            
            trackInteraction({
                interaction_type: 'click',
                element_type: element.tagName.toLowerCase(),
                element_id: element.id || null,
                element_class: element.className || null,
                element_text: element.textContent?.substring(0, 200) || null,
                element_href: element.href || null,
                click_x: Math.round(e.clientX),
                click_y: Math.round(e.clientY)
            });
        });
    }
    
    // Tracking de scroll
    function setupScrollTracking() {
        let scrollTimeout;
        
        window.addEventListener('scroll', function() {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(function() {
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const documentHeight = Math.max(
                    document.body.scrollHeight,
                    document.body.offsetHeight,
                    document.documentElement.clientHeight,
                    document.documentElement.scrollHeight,
                    document.documentElement.offsetHeight
                );
                const windowHeight = window.innerHeight;
                const scrollPercent = Math.round((scrollTop + windowHeight) / documentHeight * 100);
                
                if (scrollPercent > maxScrollDepth && scrollPercent >= TRACKING_CONFIG.SCROLL_THRESHOLD) {
                    maxScrollDepth = scrollPercent;
                    
                    trackInteraction({
                        interaction_type: 'scroll',
                        scroll_position: scrollPercent
                    });
                }
            }, 250);
        });
    }
    
    // Tracking de formulários
    function setupFormTracking() {
        document.addEventListener('submit', function(e) {
            const form = e.target;
            if (form.tagName.toLowerCase() === 'form') {
                const formData = new FormData(form);
                const formFields = {};
                
                for (let [key, value] of formData.entries()) {
                    // Não capturar dados sensíveis
                    if (!key.toLowerCase().includes('password') && 
                        !key.toLowerCase().includes('credit') &&
                        !key.toLowerCase().includes('card')) {
                        formFields[key] = typeof value === 'string' ? value.substring(0, 100) : value;
                    }
                }
                
                trackInteraction({
                    interaction_type: 'form_submit',
                    element_type: 'form',
                    element_id: form.id || null,
                    element_class: form.className || null,
                    form_data: formFields
                });
            }
        });
    }
    
    // Tracking de saída da página
    function setupPageExitTracking() {
        window.addEventListener('beforeunload', function() {
            updatePageTime();
        });
        
        // Para dispositivos móveis
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'hidden') {
                updatePageTime();
            }
        });
    }
    
    // ==========================================
    // INICIALIZAÇÃO
    // ==========================================
    
    function init() {
        // Aguardar DOM estar pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }
        
        // Inicializar tracking
        initSession().then(() => {
            if (isTracking) {
                trackPageview();
                setupClickTracking();
                setupScrollTracking();
                setupFormTracking();
                setupPageExitTracking();
                
                // Heartbeat para manter sessão ativa
                heartbeatInterval = setInterval(updatePageTime, TRACKING_CONFIG.HEARTBEAT_INTERVAL);
                
                console.log('EJA Tracking initialized successfully');
            }
        });
    }
    
    // Expor funções globais para uso manual
    window.EJATracking = {
        trackEvent: trackEvent,
        trackInteraction: trackInteraction,
        getSessionId: () => sessionId
    };
    
    // Inicializar
    init();
    
})();

/**
 * EXEMPLOS DE USO MANUAL:
 * 
 * // Rastrear evento personalizado
 * EJATracking.trackEvent({
 *     event_name: 'video_play',
 *     event_category: 'engagement',
 *     event_action: 'play',
 *     event_label: 'intro_video',
 *     event_value: 1
 * });
 * 
 * // Rastrear interação personalizada
 * EJATracking.trackInteraction({
 *     interaction_type: 'download',
 *     element_type: 'button',
 *     element_text: 'Download PDF'
 * });
 * 
 * // Obter ID da sessão atual
 * const sessionId = EJATracking.getSessionId();
 */