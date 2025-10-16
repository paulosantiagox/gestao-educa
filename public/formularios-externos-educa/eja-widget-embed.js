/**
 * EJA Educa Brasil - Widget Externo
 * Para incorporar em qualquer página externa
 * 
 * Uso:
 * 1. Inclua este script na sua página
 * 2. Adicione um botão com class="eja-popup-trigger" ou id="eja-popup-trigger"
 * 3. O popup será aberto automaticamente ao clicar
 */

(function() {
    'use strict';

    // Configurações do widget
    const EJA_CONFIG = {
        backendUrl: 'https://gestao-educa.autoflixtreinamentos.com',
        webhookUrl: 'https://n8n.centrodaautomacao.net/webhook/eja-webhook',
        widgetUrl: 'https://gestao-educa.autoflixtreinamentos.com/formularios-externos-educa/eja-popup-widget.html'
    };

    // Verificar se já foi carregado
    if (window.EJAWidgetLoaded) {
        return;
    }
    window.EJAWidgetLoaded = true;

    // Criar e inserir CSS
    const css = `
        .eja-external-trigger {
            background: linear-gradient(135deg, #009639 0%, #00b347 100%);
            color: #fff !important;
            border: none;
            padding: 12px 24px;
            border-radius: 25px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
            box-shadow: 0 2px 10px rgba(0, 150, 57, 0.2);
            text-decoration: none !important;
            display: inline-block;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .eja-external-trigger:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0, 150, 57, 0.3);
            color: #fff !important;
            text-decoration: none !important;
        }

        .eja-external-trigger:active {
            transform: translateY(0);
        }

        .eja-widget-overlay {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: rgba(0, 0, 0, 0.7) !important;
            z-index: 2147483647 !important;
            display: none !important;
            justify-content: center !important;
            align-items: center !important;
            padding: 10px !important;
        }

        .eja-widget-overlay.show {
            display: flex !important;
        }

        .eja-widget-iframe {
            width: 100% !important;
            height: 100% !important;
            max-width: 450px !important;
            max-height: 650px !important;
            border: none !important;
            border-radius: 15px !important;
            background: white !important;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3) !important;
        }

        @media (max-width: 768px) {
            .eja-external-trigger {
                padding: 10px 20px;
                font-size: 13px;
            }
            
            .eja-widget-overlay {
                padding: 5px !important;
            }
            
            .eja-widget-iframe {
                width: 100% !important;
                height: 95% !important;
                max-width: none !important;
                max-height: none !important;
                border-radius: 10px !important;
            }
        }

        @media (max-width: 480px) {
            .eja-widget-iframe {
                width: 100% !important;
                height: 98% !important;
                border-radius: 8px !important;
            }
        }
    `;

    // Inserir CSS no head
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    // Classe principal do widget externo
    class EJAExternalWidget {
        constructor() {
            this.iframe = null;
            this.isOpen = false;
            this.init();
        }

        init() {
            // Aguardar DOM estar pronto
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setupTriggers());
            } else {
                this.setupTriggers();
            }

            // Escutar mensagens do iframe
            window.addEventListener('message', (event) => this.handleMessage(event));
        }

        setupTriggers() {
            // Encontrar todos os elementos trigger
            const triggers = document.querySelectorAll('.eja-popup-trigger, #eja-popup-trigger, [data-eja-popup]');
            
            triggers.forEach(trigger => {
                // Adicionar classe de estilo se não tiver
                if (!trigger.classList.contains('eja-external-trigger')) {
                    trigger.classList.add('eja-external-trigger');
                }

                // Adicionar evento de clique
                trigger.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('Botão clicado, abrindo widget...');
                    this.openWidget();
                });

                // Se não tiver texto, adicionar texto padrão
                if (!trigger.textContent.trim()) {
                    trigger.textContent = '🎓 Concluir Ensino Médio EAD';
                }
            });

            console.log(`EJA Widget: ${triggers.length} trigger(s) configurado(s)`);
        }

        openWidget() {
            console.log('openWidget chamado');
            if (this.isOpen) {
                console.log('Widget já está aberto');
                return;
            }

            // Criar overlay se não existir
            if (!this.overlay) {
                console.log('Criando overlay...');
                this.createOverlay();
            }
            
            if (this.overlay) {
                console.log('Mostrando overlay...');
                this.overlay.classList.add('show');
                this.isOpen = true;
                document.body.style.overflow = 'hidden';
                
                // Enviar dados UTM para o iframe
                setTimeout(() => {
                    this.sendUTMData();
                }, 1000);
            } else {
                console.error('ERRO: Overlay não foi criado!');
            }
        }

        closeWidget() {
            if (!this.isOpen) return;

            this.overlay.classList.remove('show');
            this.isOpen = false;
            document.body.style.overflow = 'auto';
        }

        createOverlay() {
            console.log('createOverlay chamado');
            
            // Criar overlay
            this.overlay = document.createElement('div');
            this.overlay.className = 'eja-widget-overlay';
            
            // Criar iframe
            this.iframe = document.createElement('iframe');
            this.iframe.className = 'eja-widget-iframe';
            this.iframe.src = EJA_CONFIG.widgetUrl;
            this.iframe.allow = 'clipboard-write';
            
            // Adicionar apenas o iframe ao overlay (sem botão de fechar duplicado)
            this.overlay.appendChild(this.iframe);
            
            // Adicionar overlay ao body
            document.body.appendChild(this.overlay);
            
            console.log('Overlay criado e adicionado ao DOM');

            // Fechar ao pressionar ESC
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    this.closeWidget();
                }
            });

            // Fechar ao clicar no overlay (fora do iframe) - área corrigida
            this.overlay.addEventListener('click', (e) => {
                // Só fechar se clicar diretamente no overlay, não no iframe
                if (e.target === this.overlay) {
                    this.closeWidget();
                }
            });
        }

        sendUTMData() {
            if (!this.iframe) return;

            // Capturar parâmetros UTM da URL atual
            const urlParams = new URLSearchParams(window.location.search);
            const utmData = {};

            ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'var1', 'var2', 'var3'].forEach(param => {
                const value = urlParams.get(param);
                if (value) {
                    utmData[param] = value;
                }
            });

            // Enviar dados para o iframe
            this.iframe.contentWindow.postMessage({
                type: 'EJA_UTM_DATA',
                data: utmData,
                referrer: window.location.href
            }, '*');
        }

        handleMessage(event) {
            // Verificar origem por segurança
            if (!event.data || typeof event.data !== 'object') return;

            switch (event.data.type) {
                case 'EJA_CLOSE_WIDGET':
                    this.closeWidget();
                    break;

                case 'EJA_WIDGET_READY':
                    this.sendUTMData();
                    break;

                case 'EJA_REDIRECT_WHATSAPP':
                    // Redirecionar para WhatsApp e fechar widget
                    if (event.data.url) {
                        window.open(event.data.url, '_blank');
                        this.closeWidget();
                    }
                    break;
            }
        }
    }

    // Inicializar widget
    window.EJAExternalWidget = new EJAExternalWidget();

    // Função global para abrir o widget programaticamente
    window.openEJAWidget = function() {
        window.EJAExternalWidget.openWidget();
    };

    // Função global para fechar o widget programaticamente
    window.closeEJAWidget = function() {
        window.EJAExternalWidget.closeWidget();
    };

    console.log('EJA Widget Externo carregado com sucesso!');

})();