// Script frontend V2 para redirecionamento balanceado diário
// Uso:
//   window.initRedirectV2({
//     buttonSelector: '#btnWhatsapp',
//     platform: 'whatsapp',
//     leadData: { nome: 'Fulano', email: 'x@y.com' },
//     autoRedirect: false
//   });

(function(){
  function fetchNextRedirect(platform){
    const url = `/api/public-v2/next-redirect?platform=${encodeURIComponent(platform || 'whatsapp')}`;
    return fetch(url, { method: 'GET', credentials: 'include' })
      .then(r => r.json());
  }

  function confirmRedirect(payload){
    return fetch('/api/public-v2/confirm-redirect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    }).then(r => r.json());
  }

  function openWhatsapp(numero){
    // Normaliza número só com dígitos
    const digits = String(numero).replace(/\D/g, '');
    const link = `https://wa.me/${digits}`;
    window.open(link, '_blank');
  }

  function attachHandler(opts){
    const button = document.querySelector(opts.buttonSelector);
    if (!button) return;

    button.addEventListener('click', async function(ev){
      try {
        button.disabled = true;
        const res = await fetchNextRedirect(opts.platform);
        if (!res || !res.success || !res.data) throw new Error('Falha ao obter consultor');
        const { numero, token, plataforma } = res.data;

        // Abre WhatsApp ou executa ação custom
        openWhatsapp(numero);

        // Confirmação assíncrona
        confirmRedirect({
          token,
          numero,
          plataforma,
          lead_data: opts.leadData || {}
        }).catch(() => {});
      } catch (e) {
        console.error('[redirect-v2] erro:', e);
      } finally {
        button.disabled = false;
      }
    });
  }

  window.initRedirectV2 = function initRedirectV2(options){
    const opts = Object.assign({
      buttonSelector: null,
      platform: 'whatsapp',
      leadData: {},
      autoRedirect: false
    }, options || {});

    if (opts.buttonSelector) {
      attachHandler(opts);
    } else if (opts.autoRedirect) {
      // Auto consulta + abre link
      fetchNextRedirect(opts.platform).then(res => {
        if (res && res.success && res.data) {
          const { numero, token, plataforma } = res.data;
          openWhatsapp(numero);
          confirmRedirect({ token, numero, plataforma, lead_data: opts.leadData || {} }).catch(() => {});
        }
      }).catch(err => console.error('[redirect-v2] auto erro:', err));
    }
  };
})();