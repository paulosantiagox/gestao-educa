import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

// Função para obter geolocalização por IP
async function getGeolocationByIP(ip) {
  try {
    // Primeiro verifica se já temos no cache
    const cacheResult = await pool.query(
      'SELECT * FROM tracking_ip_cache WHERE ip_address = $1 AND expires_at > NOW()',
      [ip]
    );
    
    if (cacheResult.rows.length > 0) {
      return cacheResult.rows[0];
    }
    
    // Se não tem no cache, busca na API externa
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,city,lat,lon,timezone,isp`);
    const data = await response.json();
    
    if (data.status === 'success') {
      // Salva no cache
      const insertResult = await pool.query(`
        INSERT INTO tracking_ip_cache (ip_address, country, country_code, region, city, latitude, longitude, timezone, isp)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (ip_address) DO UPDATE SET
          country = EXCLUDED.country,
          country_code = EXCLUDED.country_code,
          region = EXCLUDED.region,
          city = EXCLUDED.city,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          timezone = EXCLUDED.timezone,
          isp = EXCLUDED.isp,
          cached_at = CURRENT_TIMESTAMP,
          expires_at = CURRENT_TIMESTAMP + INTERVAL '30 days'
        RETURNING *
      `, [ip, data.country, data.countryCode, data.region, data.city, data.lat, data.lon, data.timezone, data.isp]);
      
      return insertResult.rows[0];
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao obter geolocalização:', error);
    return null;
  }
}

// Função para detectar informações do dispositivo
function parseUserAgent(userAgent) {
  const deviceInfo = {
    device_type: 'desktop',
    browser: 'unknown',
    browser_version: 'unknown',
    os: 'unknown',
    os_version: 'unknown'
  };
  
  // Detectar tipo de dispositivo
  if (/Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
    if (/iPad/i.test(userAgent)) {
      deviceInfo.device_type = 'tablet';
    } else {
      deviceInfo.device_type = 'mobile';
    }
  }
  
  // Detectar navegador
  if (userAgent.includes('Chrome')) {
    deviceInfo.browser = 'Chrome';
    const match = userAgent.match(/Chrome\/([0-9.]+)/);
    if (match) deviceInfo.browser_version = match[1];
  } else if (userAgent.includes('Firefox')) {
    deviceInfo.browser = 'Firefox';
    const match = userAgent.match(/Firefox\/([0-9.]+)/);
    if (match) deviceInfo.browser_version = match[1];
  } else if (userAgent.includes('Safari')) {
    deviceInfo.browser = 'Safari';
    const match = userAgent.match(/Version\/([0-9.]+)/);
    if (match) deviceInfo.browser_version = match[1];
  } else if (userAgent.includes('Edge')) {
    deviceInfo.browser = 'Edge';
    const match = userAgent.match(/Edge\/([0-9.]+)/);
    if (match) deviceInfo.browser_version = match[1];
  }
  
  // Detectar sistema operacional
  if (userAgent.includes('Windows')) {
    deviceInfo.os = 'Windows';
    if (userAgent.includes('Windows NT 10.0')) deviceInfo.os_version = '10';
    else if (userAgent.includes('Windows NT 6.3')) deviceInfo.os_version = '8.1';
    else if (userAgent.includes('Windows NT 6.1')) deviceInfo.os_version = '7';
  } else if (userAgent.includes('Mac OS X')) {
    deviceInfo.os = 'macOS';
    const match = userAgent.match(/Mac OS X ([0-9_]+)/);
    if (match) deviceInfo.os_version = match[1].replace(/_/g, '.');
  } else if (userAgent.includes('Linux')) {
    deviceInfo.os = 'Linux';
  } else if (userAgent.includes('Android')) {
    deviceInfo.os = 'Android';
    const match = userAgent.match(/Android ([0-9.]+)/);
    if (match) deviceInfo.os_version = match[1];
  } else if (userAgent.includes('iOS')) {
    deviceInfo.os = 'iOS';
    const match = userAgent.match(/OS ([0-9_]+)/);
    if (match) deviceInfo.os_version = match[1].replace(/_/g, '.');
  }
  
  return deviceInfo;
}

// POST /api/tracking/session - Iniciar/atualizar sessão
router.post('/session', async (req, res) => {
  try {
    const {
      session_id,
      domain,
      referrer,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      screen_resolution
    } = req.body;
    
    const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'] || '';
    
    console.log('🔄 [TRACKING] Nova sessão recebida:', {
      session_id,
      domain,
      ip: ip?.substring(0, 10) + '...',
      device: userAgent?.substring(0, 50) + '...',
      referrer,
      utm_source,
      timestamp: new Date().toISOString()
    });
    
    // Verificar se o domínio existe
    const domainResult = await pool.query('SELECT id FROM tracking_domains WHERE domain = $1 AND is_active = true', [domain]);
    if (domainResult.rows.length === 0) {
      console.log('❌ [TRACKING] Domínio não autorizado:', domain);
      return res.status(400).json({ error: 'Domínio não autorizado' });
    }
    
    const domainId = domainResult.rows[0].id;
    
    // Obter geolocalização
    const geoData = await getGeolocationByIP(ip);
    
    // Parse do user agent
    const deviceInfo = parseUserAgent(userAgent);
    
    // Verificar se a sessão já existe
    const existingSession = await pool.query('SELECT id FROM tracking_sessions WHERE session_id = $1', [session_id]);
    
    let sessionResult;
    
    if (existingSession.rows.length > 0) {
      // Atualizar sessão existente
      console.log('🔄 [TRACKING] Atualizando sessão existente:', session_id);
      sessionResult = await pool.query(`
        UPDATE tracking_sessions SET
          last_activity = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE session_id = $1
        RETURNING *
      `, [session_id]);
    } else {
      // Criar nova sessão
      console.log('✅ [TRACKING] Criando nova sessão:', {
        session_id,
        domain,
        device: deviceInfo.device_type,
        browser: deviceInfo.browser,
        country: geoData?.country,
        city: geoData?.city
      });
      sessionResult = await pool.query(`
        INSERT INTO tracking_sessions (
          session_id, domain, ip_address, user_agent,
          device_type, browser, browser_version, os, screen_resolution,
          country, region, city, latitude, longitude, timezone,
          referrer, utm_source, utm_medium, utm_campaign, utm_term, utm_content,
          is_new_visitor
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, true)
        RETURNING *
      `, [
        session_id, domain, ip, userAgent,
        deviceInfo.device_type, deviceInfo.browser, deviceInfo.browser_version, 
        deviceInfo.os, screen_resolution,
        geoData?.country, geoData?.region, geoData?.city,
        geoData?.latitude, geoData?.longitude, geoData?.timezone,
        referrer, utm_source, utm_medium, utm_campaign, utm_term, utm_content
      ]);
    }
    
    res.json({ 
      success: true, 
      session: sessionResult.rows[0],
      geo: geoData ? {
        country: geoData.country,
        city: geoData.city,
        region: geoData.region
      } : null
    });
    
  } catch (error) {
    console.error('Erro ao processar sessão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/tracking/pageview - Registrar visualização de página
router.post('/pageview', async (req, res) => {
  try {
    const {
      session_id,
      page_url,
      page_title,
      page_path,
      load_time
    } = req.body;
    
    console.log('📄 [TRACKING] Nova pageview recebida:', {
      session_id,
      page_url,
      page_title,
      page_path,
      load_time: load_time ? `${load_time}ms` : 'N/A',
      timestamp: new Date().toISOString()
    });
    
    // Verificar se a sessão existe
    const sessionResult = await pool.query('SELECT id FROM tracking_sessions WHERE session_id = $1', [session_id]);
    if (sessionResult.rows.length === 0) {
      console.log('❌ [TRACKING] Sessão não encontrada para pageview:', session_id);
      return res.status(400).json({ error: 'Sessão não encontrada' });
    }
    
    const sessionDbId = sessionResult.rows[0].id;
    
    // Registrar pageview
    const pageviewResult = await pool.query(`
      INSERT INTO tracking_pageviews (session_id, page_url, page_title, page_path, load_time)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [sessionDbId, page_url, page_title, page_path, load_time]);
    
    console.log('✅ [TRACKING] Pageview registrada com sucesso:', {
      id: pageviewResult.rows[0].id,
      session_id,
      page_path,
      timestamp: pageviewResult.rows[0].created_at
    });
    
    // Atualizar contador de pageviews na sessão
    await pool.query(`
      UPDATE tracking_sessions SET 
        page_views_count = page_views_count + 1,
        last_activity = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [sessionDbId]);
    
    res.json({ success: true, pageview: pageviewResult.rows[0] });
    
  } catch (error) {
    console.error('Erro ao registrar pageview:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/tracking/interaction - Registrar interação do usuário
router.post('/interaction', async (req, res) => {
  try {
    const {
      session_id,
      pageview_id,
      interaction_type,
      element_type,
      element_id,
      element_class,
      element_text,
      element_href,
      click_x,
      click_y,
      scroll_position,
      form_data,
      page_url
    } = req.body;
    
    console.log('🖱️ [TRACKING] Nova interação recebida:', {
      session_id,
      interaction_type,
      element_type,
      element_id: element_id || 'N/A',
      element_text: element_text?.substring(0, 30) + '...' || 'N/A',
      page_url,
      timestamp: new Date().toISOString()
    });
    
    // Verificar se a sessão existe
    const sessionResult = await pool.query('SELECT id FROM tracking_sessions WHERE session_id = $1', [session_id]);
    if (sessionResult.rows.length === 0) {
      console.log('❌ [TRACKING] Sessão não encontrada para interação:', session_id);
      return res.status(400).json({ error: 'Sessão não encontrada' });
    }
    
    const sessionDbId = sessionResult.rows[0].id;
    
    // Registrar interação
    const interactionResult = await pool.query(`
      INSERT INTO tracking_interactions (
        session_id, pageview_id, interaction_type, element_type, element_id, element_class,
        element_text, element_href, click_x, click_y, scroll_position, form_data, page_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      sessionDbId, pageview_id, interaction_type, element_type, element_id, element_class,
      element_text, element_href, click_x, click_y, scroll_position, 
      form_data ? JSON.stringify(form_data) : null, page_url
    ]);
    
    console.log('✅ [TRACKING] Interação registrada com sucesso:', {
      id: interactionResult.rows[0].id,
      session_id,
      interaction_type,
      element_type,
      timestamp: interactionResult.rows[0].created_at
    });
    
    // Atualizar última atividade da sessão
    await pool.query(`
      UPDATE tracking_sessions SET 
        last_activity = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [sessionDbId]);
    
    res.json({ success: true, interaction: interactionResult.rows[0] });
    
  } catch (error) {
    console.error('Erro ao registrar interação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/tracking/event - Registrar evento personalizado
router.post('/event', async (req, res) => {
  try {
    const {
      session_id,
      event_name,
      event_category,
      event_action,
      event_label,
      event_value,
      custom_data,
      page_url
    } = req.body;
    
    console.log('🎯 [TRACKING] Novo evento recebido:', {
      session_id,
      event_name,
      event_category,
      event_action,
      event_label,
      event_value,
      page_url,
      timestamp: new Date().toISOString()
    });
    
    // Verificar se a sessão existe
    const sessionResult = await pool.query('SELECT id FROM tracking_sessions WHERE session_id = $1', [session_id]);
    if (sessionResult.rows.length === 0) {
      console.log('❌ [TRACKING] Sessão não encontrada para evento:', session_id);
      return res.status(400).json({ error: 'Sessão não encontrada' });
    }
    
    const sessionDbId = sessionResult.rows[0].id;
    
    // Registrar evento
    const eventResult = await pool.query(`
      INSERT INTO tracking_events (
        session_id, event_name, event_category, event_action, event_label, event_value, custom_data, page_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      sessionDbId, event_name, event_category, event_action, event_label, event_value,
      custom_data ? JSON.stringify(custom_data) : null, page_url
    ]);
    
    console.log('✅ [TRACKING] Evento registrado com sucesso:', {
      id: eventResult.rows[0].id,
      session_id,
      event_name,
      event_category,
      timestamp: eventResult.rows[0].created_at
    });
    
    res.json({ success: true, event: eventResult.rows[0] });
    
  } catch (error) {
    console.error('Erro ao registrar evento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/tracking/pageview/:id/time - Atualizar tempo gasto na página
router.put('/pageview/:id/time', async (req, res) => {
  try {
    const { id } = req.params;
    const { time_on_page, scroll_depth } = req.body;
    
    const result = await pool.query(`
      UPDATE tracking_pageviews SET 
        time_on_page = $1,
        scroll_depth = GREATEST(scroll_depth, $2)
      WHERE id = $3
      RETURNING *
    `, [time_on_page, scroll_depth, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pageview não encontrado' });
    }
    
    res.json({ success: true, pageview: result.rows[0] });
    
  } catch (error) {
    console.error('Erro ao atualizar tempo na página:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar domínios disponíveis
router.get('/domains', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tracking_domains WHERE is_active = true');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar domínios:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/tracking/domains - Adicionar novo domínio
router.post('/domains', async (req, res) => {
  try {
    const { domain, name } = req.body;
    
    if (!domain || !name) {
      return res.status(400).json({ error: 'Domínio e nome são obrigatórios' });
    }
    
    // Gerar código de tracking único
    const trackingCode = `eja_${domain.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
    
    // Inserir novo domínio
    const result = await pool.query(`
      INSERT INTO tracking_domains (domain, tracking_code, is_active, settings)
      VALUES ($1, $2, true, $3)
      RETURNING *
    `, [domain, trackingCode, JSON.stringify({
      track_forms: true,
      track_clicks: true,
      track_scroll: true,
      name: name
    })]);
    
    res.status(201).json({
      success: true,
      domain: result.rows[0],
      message: 'Domínio adicionado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao adicionar domínio:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(409).json({ error: 'Este domínio já está cadastrado' });
    } else {
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
});

// GET /api/tracking/analytics - Obter dados analíticos
router.get('/analytics', async (req, res) => {
  try {
    const { domain, start_date, end_date, period = '7d' } = req.query;
    
    let whereClause = 'WHERE ts.created_at >= CURRENT_TIMESTAMP - INTERVAL \'7 days\'';
    let params = [];
    
    if (domain) {
      whereClause += ' AND ts.domain = $' + (params.length + 1);
      params.push(domain);
    }
    
    if (start_date && end_date) {
      whereClause = 'WHERE ts.created_at BETWEEN $' + (params.length + 1) + '::date AND $' + (params.length + 2) + '::date + INTERVAL \'1 day\'';
      params.push(start_date, end_date);
      
      if (domain) {
        whereClause += ' AND ts.domain = $' + (params.length + 1);
        params.push(domain);
      }
    }
    
    // Estatísticas gerais
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT ts.session_id) as total_sessions,
        COUNT(DISTINCT ts.ip_address) as unique_visitors,
        COUNT(tp.id) as total_pageviews,
        AVG(tp.time_on_page) as avg_time_on_page,
        AVG(tp.scroll_depth) as avg_scroll_depth,
        COUNT(CASE WHEN ts.is_new_visitor = true THEN 1 END) as new_visitors
      FROM tracking_sessions ts
      LEFT JOIN tracking_pageviews tp ON ts.id = tp.session_id
      ${whereClause}
    `;
    
    const statsResult = await pool.query(statsQuery, params);
    
    // Top páginas
    const topPagesQuery = `
      SELECT 
        tp.page_path,
        tp.page_title,
        COUNT(*) as views,
        AVG(tp.time_on_page) as avg_time,
        AVG(tp.scroll_depth) as avg_scroll
      FROM tracking_pageviews tp
      JOIN tracking_sessions ts ON tp.session_id = ts.id
      ${whereClause}
      GROUP BY tp.page_path, tp.page_title
      ORDER BY views DESC
      LIMIT 10
    `;
    
    const topPagesResult = await pool.query(topPagesQuery, params);
    
    // Dados geográficos
    const geoQuery = `
      SELECT 
        ts.country,
        ts.city,
        COUNT(DISTINCT ts.session_id) as sessions
      FROM tracking_sessions ts
      ${whereClause}
      AND ts.country IS NOT NULL
      GROUP BY ts.country, ts.city
      ORDER BY sessions DESC
      LIMIT 20
    `;
    
    const geoResult = await pool.query(geoQuery, params);
    
    // Sessões recentes com datetime
    const recentSessionsQuery = `
      SELECT 
        ts.session_id,
        ts.domain,
        ts.ip_address,
        ts.country,
        ts.city,
        ts.device_type,
        ts.browser,
        ts.utm_source,
        ts.utm_medium,
        ts.utm_campaign,
        ts.referrer,
        ts.created_at,
        ts.last_activity,
        ts.is_active
      FROM tracking_sessions ts
      ${whereClause}
      ORDER BY ts.created_at DESC
      LIMIT 15
    `;
    
    const recentSessionsResult = await pool.query(recentSessionsQuery, params);

    // Pageviews recentes com datetime
    const recentPageviewsQuery = `
      SELECT 
        tp.id,
        tp.session_id,
        tp.page_url,
        tp.page_title,
        tp.time_on_page,
        tp.scroll_depth,
        tp.viewed_at,
        ts.domain,
        ts.device_type,
        ts.country,
        ts.city
      FROM tracking_pageviews tp
      JOIN tracking_sessions ts ON tp.session_id = ts.id
      ${whereClause}
      ORDER BY tp.viewed_at DESC
      LIMIT 15
    `;
    
    const recentPageviewsResult = await pool.query(recentPageviewsQuery, params);

    // Interações recentes com datetime
    const recentInteractionsQuery = `
      SELECT 
        ti.id,
        ti.session_id,
        ti.interaction_type,
        ti.element_type,
        ti.element_text,
        ti.click_x,
        ti.click_y,
        ti.page_url,
        ti.interaction_at,
        ts.domain,
        ts.device_type
      FROM tracking_interactions ti
      JOIN tracking_sessions ts ON ti.session_id = ts.id
      ${whereClause}
      ORDER BY ti.interaction_at DESC
      LIMIT 15
    `;
    
    const recentInteractionsResult = await pool.query(recentInteractionsQuery, params);

    // Eventos recentes com datetime
    const recentEventsQuery = `
      SELECT 
        te.id,
        te.session_id,
        te.event_name,
        te.event_category,
        te.event_action,
        te.event_label,
        te.event_value,
        te.page_url,
        te.event_at,
        ts.domain,
        ts.device_type
      FROM tracking_events te
      JOIN tracking_sessions ts ON te.session_id = ts.id
      ${whereClause}
      ORDER BY te.event_at DESC
      LIMIT 15
    `;
    
    const recentEventsResult = await pool.query(recentEventsQuery, params);

    // Formatando dados para compatibilidade com o frontend
    const formattedStats = {
      totalSessions: parseInt(statsResult.rows[0].total_sessions) || 0,
      uniqueVisitors: parseInt(statsResult.rows[0].unique_visitors) || 0,
      totalPageviews: parseInt(statsResult.rows[0].total_pageviews) || 0,
      averageSessionDuration: parseFloat(statsResult.rows[0].avg_time_on_page) || 0,
      bounceRate: 0, // Calcular se necessário
      topPages: topPagesResult.rows.map(page => ({
        page: page.page_path || page.page_title || 'N/A',
        views: parseInt(page.views),
        percentage: 0 // Calcular se necessário
      })),
      deviceTypes: [], // Adicionar se necessário
      browsers: [], // Adicionar se necessário
      countries: geoResult.rows.map(geo => ({
        country: geo.country || 'N/A',
        count: parseInt(geo.sessions),
        percentage: 0 // Calcular se necessário
      })),
      hourlyTraffic: [], // Adicionar se necessário
      dailyTraffic: [], // Adicionar se necessário
      interactions: [], // Adicionar se necessário
      events: [], // Adicionar se necessário
      // Novos dados detalhados com datetime
      recentSessions: recentSessionsResult.rows,
      recentPageviews: recentPageviewsResult.rows,
      recentInteractions: recentInteractionsResult.rows,
      recentEvents: recentEventsResult.rows
    };
    
    res.json(formattedStats);
    
  } catch (error) {
    console.error('Erro ao obter analytics:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;