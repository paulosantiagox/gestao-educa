import express from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../requireAuth.js';

const router = express.Router();

// GET /api/leads - Lista todos os leads com busca
router.get('/', requireAuth, async (req, res) => {
  try {
    const { q = '', page = 1, limit = 50, sortBy = 'data_cadastro', sortOrder = 'desc' } = req.query;
    const offset = (page - 1) * limit;
    const searchQuery = `%${q}%`;
    
    // Validar campos de ordenação permitidos
    const allowedSortFields = ['id', 'nome', 'email', 'whatsapp', 'escola', 'data_cadastro', 'created_at', 'var1', 'var2'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'data_cadastro';
    const validSortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase()) ? sortOrder.toUpperCase() : 'DESC';
    
    // Query com ROW_NUMBER para calcular a posição real na lista completa
    const result = await pool.query(
      `WITH total_count AS (
         SELECT COUNT(*) as total FROM leads_educa 
         WHERE nome ILIKE $1 OR email ILIKE $1 OR whatsapp ILIKE $1 OR escola ILIKE $1
       ),
       numbered_leads AS (
         SELECT *, 
         (SELECT total FROM total_count) - ROW_NUMBER() OVER (ORDER BY data_cadastro DESC) + 1 as position
         FROM leads_educa 
         WHERE nome ILIKE $1 OR email ILIKE $1 OR whatsapp ILIKE $1 OR escola ILIKE $1
       )
       SELECT * FROM numbered_leads
       ORDER BY ${validSortBy} ${validSortOrder}
       LIMIT $2 OFFSET $3`,
      [searchQuery, limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM leads_educa 
       WHERE nome ILIKE $1 OR email ILIKE $1 OR whatsapp ILIKE $1 OR escola ILIKE $1`,
      [searchQuery]
    );

    res.json({
      leads: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(countResult.rows[0].count / limit)
    });

// GET /api/leads/analytics/export - Exportar dados para CSV/Excel
router.get('/analytics/export', requireAuth, async (req, res) => {
  try {
    const { 
      format = 'csv',
      startDate,
      endDate,
      source,
      responsible,
      search
    } = req.query;

    // Construir condições WHERE baseadas nos filtros
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Filtro de data
    if (startDate && endDate) {
      whereConditions.push(`DATE(created_at) BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      queryParams.push(startDate, endDate);
      paramIndex += 2;
    }

    // Filtro de fonte
    if (source) {
      whereConditions.push(`utm_source = $${paramIndex}`);
      queryParams.push(source);
      paramIndex++;
    }

    // Filtro de responsável
    if (responsible) {
      whereConditions.push(`var1 = $${paramIndex}`);
      queryParams.push(responsible);
      paramIndex++;
    }

    // Filtro de busca
    if (search) {
      whereConditions.push(`(nome ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR whatsapp ILIKE $${paramIndex} OR escola ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Buscar dados dos leads
    const exportQuery = `
      SELECT 
        id,
        nome,
        email,
        whatsapp,
        escola,
        COALESCE(utm_source, 'Direto') as fonte,
        COALESCE(var1, 'Não informado') as responsavel,
        utm_campaign as campanha,
        utm_medium as meio,
        utm_term as termo,
        utm_content as conteudo,
        created_at as data_cadastro,
        DATE(created_at) as data,
        EXTRACT(HOUR FROM created_at) as hora,
        TO_CHAR(created_at, 'Day') as dia_semana
      FROM leads_educa 
      ${whereClause}
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(exportQuery, queryParams);

    res.json({
      data: result.rows,
      total: result.rows.length,
      format: format
    });
  } catch (error) {
    console.error('Erro ao exportar dados:', error);
    res.status(500).json({ error: 'Erro ao exportar dados' });
  }
});

// GET /api/leads/analytics/weekday - Relatório por dia da semana
router.get('/analytics/weekday', requireAuth, async (req, res) => {
  try {
    const { 
      startDate,
      endDate,
      source,
      responsible
    } = req.query;

    // Construir condições WHERE baseadas nos filtros
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Filtro de data
    if (startDate && endDate) {
      whereConditions.push(`DATE(created_at) BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      queryParams.push(startDate, endDate);
      paramIndex += 2;
    } else {
      // Últimos 30 dias por padrão
      whereConditions.push(`created_at >= CURRENT_DATE - INTERVAL '30 days'`);
    }

    // Filtro de fonte
    if (source) {
      whereConditions.push(`utm_source = $${paramIndex}`);
      queryParams.push(source);
      paramIndex++;
    }

    // Filtro de responsável
    if (responsible) {
      whereConditions.push(`var1 = $${paramIndex}`);
      queryParams.push(responsible);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const weekdayQuery = `
      SELECT 
        EXTRACT(DOW FROM created_at) as day_number,
        CASE EXTRACT(DOW FROM created_at)
          WHEN 0 THEN 'Domingo'
          WHEN 1 THEN 'Segunda'
          WHEN 2 THEN 'Terça'
          WHEN 3 THEN 'Quarta'
          WHEN 4 THEN 'Quinta'
          WHEN 5 THEN 'Sexta'
          WHEN 6 THEN 'Sábado'
        END as weekday,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
      FROM leads_educa 
      ${whereClause}
      GROUP BY EXTRACT(DOW FROM created_at)
      ORDER BY day_number
    `;
    
    const result = await pool.query(weekdayQuery, queryParams);

    res.json({
      weekdayStats: result.rows,
      totalLeads: result.rows.reduce((sum, row) => sum + parseInt(row.count), 0)
    });
  } catch (error) {
    console.error('Erro ao buscar relatório por dia da semana:', error);
    res.status(500).json({ error: 'Erro ao buscar relatório por dia da semana' });
  }
});

// GET /api/leads/analytics/hourly - Relatório por horário
router.get('/analytics/hourly', requireAuth, async (req, res) => {
  try {
    const { 
      startDate,
      endDate,
      source,
      responsible
    } = req.query;

    // Construir condições WHERE baseadas nos filtros
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Filtro de data
    if (startDate && endDate) {
      whereConditions.push(`DATE(created_at) BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      queryParams.push(startDate, endDate);
      paramIndex += 2;
    } else {
      // Últimos 30 dias por padrão
      whereConditions.push(`created_at >= CURRENT_DATE - INTERVAL '30 days'`);
    }

    // Filtro de fonte
    if (source) {
      whereConditions.push(`utm_source = $${paramIndex}`);
      queryParams.push(source);
      paramIndex++;
    }

    // Filtro de responsável
    if (responsible) {
      whereConditions.push(`var1 = $${paramIndex}`);
      queryParams.push(responsible);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const hourlyQuery = `
      SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage,
        CASE 
          WHEN EXTRACT(HOUR FROM created_at) BETWEEN 6 AND 11 THEN 'Manhã'
          WHEN EXTRACT(HOUR FROM created_at) BETWEEN 12 AND 17 THEN 'Tarde'
          WHEN EXTRACT(HOUR FROM created_at) BETWEEN 18 AND 23 THEN 'Noite'
          ELSE 'Madrugada'
        END as period
      FROM leads_educa 
      ${whereClause}
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour
    `;
    
    const result = await pool.query(hourlyQuery, queryParams);

    // Agrupar por período
    const periodStats = result.rows.reduce((acc, row) => {
      const period = row.period;
      if (!acc[period]) {
        acc[period] = { period, count: 0, percentage: 0 };
      }
      acc[period].count += parseInt(row.count);
      acc[period].percentage += parseFloat(row.percentage);
      return acc;
    }, {});

    res.json({
      hourlyStats: result.rows,
      periodStats: Object.values(periodStats),
      totalLeads: result.rows.reduce((sum, row) => sum + parseInt(row.count), 0)
    });
  } catch (error) {
    console.error('Erro ao buscar relatório por horário:', error);
    res.status(500).json({ error: 'Erro ao buscar relatório por horário' });
  }
});
  } catch (error) {
    console.error('Erro ao buscar leads:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/leads/dashboard - Dashboard com estatísticas
router.get('/dashboard', async (req, res) => {
  try {
    const { 
      month = new Date().getMonth() + 1, 
      year = new Date().getFullYear(),
      startDate,
      endDate,
      source,
      responsible,
      status,
      search
    } = req.query;

    // Construir condições WHERE baseadas nos filtros
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Filtro de data
    if (startDate && endDate) {
      whereConditions.push(`DATE(data_cadastro) BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      queryParams.push(startDate, endDate);
      paramIndex += 2;
    } else {
      whereConditions.push(`EXTRACT(MONTH FROM data_cadastro) = $${paramIndex} AND EXTRACT(YEAR FROM data_cadastro) = $${paramIndex + 1}`);
      queryParams.push(month, year);
      paramIndex += 2;
    }

    // Filtro de fonte
    if (source) {
      whereConditions.push(`utm_source = $${paramIndex}`);
      queryParams.push(source);
      paramIndex++;
    }

    // Filtro de responsável
    if (responsible) {
      whereConditions.push(`var1 = $${paramIndex}`);
      queryParams.push(responsible);
      paramIndex++;
    }

    // Filtro de busca
    if (search) {
      whereConditions.push(`(nome ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR whatsapp ILIKE $${paramIndex} OR escola ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Total de leads
    const totalLeadsQuery = `SELECT COUNT(*) as total FROM leads_educa ${whereClause}`;
    const totalLeadsResult = await pool.query(totalLeadsQuery, queryParams);

    // Leads de hoje
    const todayLeadsQuery = `
      SELECT COUNT(*) as total 
      FROM leads_educa 
      WHERE DATE(data_cadastro) = CURRENT_DATE
      ${source ? `AND utm_source = '${source}'` : ''}
      ${responsible ? `AND var1 = '${responsible}'` : ''}
      ${search ? `AND (nome ILIKE '%${search}%' OR email ILIKE '%${search}%' OR whatsapp ILIKE '%${search}%' OR escola ILIKE '%${search}%')` : ''}
    `;
    const todayLeadsResult = await pool.query(todayLeadsQuery);

    // Leads da semana
    const weekLeadsQuery = `
      SELECT COUNT(*) as total 
      FROM leads_educa 
      WHERE data_cadastro >= CURRENT_DATE - INTERVAL '7 days'
      ${source ? `AND utm_source = '${source}'` : ''}
      ${responsible ? `AND var1 = '${responsible}'` : ''}
      ${search ? `AND (nome ILIKE '%${search}%' OR email ILIKE '%${search}%' OR whatsapp ILIKE '%${search}%' OR escola ILIKE '%${search}%')` : ''}
    `;
    const weekLeadsResult = await pool.query(weekLeadsQuery);

    // Leads do período
    const monthLeadsQuery = `SELECT COUNT(*) as total FROM leads_educa ${whereClause}`;
    const monthLeadsResult = await pool.query(monthLeadsQuery, queryParams);

    // Leads por dia do período
    const leadsByDayQuery = `
      SELECT 
        DATE(data_cadastro) as date,
        COUNT(*) as count,
        TO_CHAR(data_cadastro, 'Day') as weekday
      FROM leads_educa 
      ${whereClause}
      GROUP BY DATE(data_cadastro), TO_CHAR(data_cadastro, 'Day')
      ORDER BY DATE(data_cadastro)
    `;
    const leadsByDayResult = await pool.query(leadsByDayQuery, queryParams);

    // Leads por horário
    const leadsByHourQuery = `
      SELECT 
        EXTRACT(HOUR FROM data_cadastro) as hour,
        COUNT(*) as count
      FROM leads_educa 
      ${whereClause}
      GROUP BY EXTRACT(HOUR FROM data_cadastro)
      ORDER BY hour
    `;
    const leadsByHourResult = await pool.query(leadsByHourQuery, queryParams);

    // Leads por var1 (responsável)
    const leadsByVar1Query = `
      SELECT 
        COALESCE(var1, 'Não informado') as var1,
        COUNT(*) as count
      FROM leads_educa 
      ${whereClause}
      GROUP BY var1
      ORDER BY count DESC
    `;
    const leadsByVar1Result = await pool.query(leadsByVar1Query, queryParams);

    // Leads por fonte (utm_source)
    const leadsBySourceQuery = `
      SELECT 
        COALESCE(utm_source, 'Direto') as source,
        COUNT(*) as count
      FROM leads_educa 
      ${whereClause}
      GROUP BY utm_source
      ORDER BY count DESC
    `;
    const leadsBySourceResult = await pool.query(leadsBySourceQuery, queryParams);

    res.json({
      totalLeads: parseInt(totalLeadsResult.rows[0].total),
      todayLeads: parseInt(todayLeadsResult.rows[0].total),
      weekLeads: parseInt(weekLeadsResult.rows[0].total),
      monthLeads: parseInt(monthLeadsResult.rows[0].total),
      leadsByDay: leadsByDayResult.rows,
      leadsByHour: leadsByHourResult.rows,
      leadsByVar1: leadsByVar1Result.rows,
      leadsBySource: leadsBySourceResult.rows
    });
  } catch (error) {
    console.error('Erro ao buscar dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/leads/:id - Busca um lead específico
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM leads_educa WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({ error: 'Erro ao buscar lead' });
  }
});

// POST /api/leads - Cria um novo lead
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      whatsapp,
      escola,
      data_cadastro,
      var1,
      var2,
      utm_source,
      id_bot,
      nome,
      email,
      utm,
      utm_campaign,
      utm_term,
      utm_content,
      utm_medium,
      lancamento,
      apenas_data,
      var3,
      url_pagina,
      error,
      paired_item
    } = req.body;

    const result = await pool.query(
      `INSERT INTO leads_educa (
        whatsapp, escola, data_cadastro, var1, var2, utm_source, id_bot, nome, email, utm,
        utm_campaign, utm_term, utm_content, utm_medium, lancamento, apenas_data, var3,
        url_pagina, error, paired_item
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17,
        $18, $19, $20
      ) RETURNING *`,
      [
        whatsapp, escola, data_cadastro, var1, var2, utm_source, id_bot, nome, email, utm,
        utm_campaign, utm_term, utm_content, utm_medium, lancamento, apenas_data, var3,
        url_pagina, error, paired_item
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ error: 'Erro ao criar lead' });
  }
});

// PUT /api/leads/:id - Atualiza um lead
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      whatsapp,
      escola,
      data_cadastro,
      var1,
      var2,
      utm_source,
      id_bot,
      nome,
      email,
      utm,
      utm_campaign,
      utm_term,
      utm_content,
      utm_medium,
      lancamento,
      apenas_data,
      var3,
      url_pagina,
      error,
      paired_item
    } = req.body;

    const result = await pool.query(
      `UPDATE leads_educa SET
        whatsapp = $1, escola = $2, data_cadastro = $3, var1 = $4, var2 = $5,
        utm_source = $6, id_bot = $7, nome = $8, email = $9, utm = $10,
        utm_campaign = $11, utm_term = $12, utm_content = $13, utm_medium = $14,
        lancamento = $15, apenas_data = $16, var3 = $17, url_pagina = $18,
        error = $19, paired_item = $20
      WHERE id = $21 RETURNING *`,
      [
        whatsapp, escola, data_cadastro, var1, var2, utm_source, id_bot, nome, email, utm,
        utm_campaign, utm_term, utm_content, utm_medium, lancamento, apenas_data, var3,
        url_pagina, error, paired_item, id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ error: 'Erro ao atualizar lead' });
  }
});

// DELETE /api/leads/:id - Remove um lead
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM leads_educa WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }
    
    res.json({ message: 'Lead removido com sucesso' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ error: 'Erro ao remover lead' });
  }
});

// POST /api/leads/import - Importação em lote de leads
router.post('/import', requireAuth, async (req, res) => {
  try {
    const { leads } = req.body;
    
    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ error: 'Dados de leads inválidos ou vazios' });
    }

    const results = {
      success: 0,
      errors: 0,
      duplicates: 0,
      details: []
    };

    // Processar em lotes de 100 para melhor performance com grandes volumes
    const batchSize = 100;
    const totalBatches = Math.ceil(leads.length / batchSize);
    
    console.log(`Processando ${leads.length} leads em ${totalBatches} lotes de ${batchSize}`);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * batchSize;
      const endIndex = Math.min(startIndex + batchSize, leads.length);
      const batch = leads.slice(startIndex, endIndex);
      
      console.log(`Processando lote ${batchIndex + 1}/${totalBatches} (registros ${startIndex + 1}-${endIndex})`);

      for (let i = 0; i < batch.length; i++) {
        const lead = batch[i];
        const globalIndex = startIndex + i; // Índice global para relatório correto
        
        try {
          // Validação: apenas WhatsApp é obrigatório
          if (!lead.whatsapp || lead.whatsapp.toString().trim() === '') {
            results.errors++;
            results.details.push({
              line: globalIndex + 1,
              error: 'WhatsApp é obrigatório - lead não foi adicionado'
            });
            continue;
          }

          // Verificar duplicatas apenas por whatsapp
          const duplicateCheck = await pool.query(
            'SELECT id FROM leads_educa WHERE whatsapp = $1 LIMIT 1',
            [lead.whatsapp]
          );

          if (duplicateCheck?.rows.length > 0) {
            results.duplicates++;
            results.details.push({
              line: globalIndex + 1,
              error: 'WhatsApp já existe no sistema',
              existing_id: duplicateCheck.rows[0].id
            });
            continue;
          }

        // Função para converter data do formato DD/MM/YYYY HH:mm:ss para Date
        const parseDateTime = (dateStr) => {
          if (!dateStr) return null;
          
          try {
            // Formato esperado: DD/MM/YYYY HH:mm:ss
            const [datePart, timePart] = dateStr.split(' ');
            if (!datePart) return null;
            
            const [day, month, year] = datePart.split('/');
            if (!day || !month || !year) return null;
            
            // Se não tem parte de tempo, usar 00:00:00
            const time = timePart || '00:00:00';
            
            // Criar data no formato ISO: YYYY-MM-DD HH:mm:ss
            const isoString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${time}`;
            const date = new Date(isoString);
            
            // Verificar se a data é válida
            if (isNaN(date.getTime())) {
              return null;
            }
            
            return date;
          } catch (error) {
            console.error('Erro ao converter data:', dateStr, error);
            return null;
          }
        };

        // Mapear campos do CSV para campos da tabela
        const mappedLead = {
          whatsapp: lead.whatsapp || null,
          escola: lead.escola || null,
          data_cadastro: parseDateTime(lead.data_cadastro) || new Date(),
          var1: lead.var1 || null,
          var2: lead.var2 || null,
          utm_source: lead.utm_source || null,
          id_bot: lead['id-bot'] || lead.id_bot || null,
          nome: lead.nome || null,
          email: lead.email || null,
          utm: lead.utm || null,
          utm_campaign: lead.utm_campaign || null,
          utm_term: lead.utm_term || null,
          utm_content: lead.utm_content || null,
          utm_medium: lead.utm_medium || null,
          lancamento: lead.lancamento || null,
          var3: lead.var3 || null,
          url_pagina: lead['URL da página'] || lead.url_pagina || null,
          error: lead.error || null,
          paired_item: lead.pairedItem || lead.paired_item || null
        };

        // Inserir lead
        const insertResult = await pool.query(`
          INSERT INTO leads_educa (
            whatsapp, escola, data_cadastro, var1, var2, utm_source, id_bot,
            nome, email, utm, utm_campaign, utm_term, utm_content, utm_medium,
            lancamento, var3, url_pagina, error, paired_item
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
          ) RETURNING id
        `, [
          mappedLead.whatsapp, mappedLead.escola, mappedLead.data_cadastro,
          mappedLead.var1, mappedLead.var2, mappedLead.utm_source, mappedLead.id_bot,
          mappedLead.nome, mappedLead.email, mappedLead.utm, mappedLead.utm_campaign,
          mappedLead.utm_term, mappedLead.utm_content, mappedLead.utm_medium,
          mappedLead.lancamento, mappedLead.var3,
          mappedLead.url_pagina, mappedLead.error, mappedLead.paired_item
        ]);

        results.success++;
        results.details.push({
          line: globalIndex + 1,
          success: true,
          id: insertResult.rows[0].id
        });

      } catch (error) {
        console.error(`Error importing lead at line ${globalIndex + 1}:`, error);
        results.errors++;
        results.details.push({
          line: globalIndex + 1,
          error: error.message
        });
      }
    }
    }

    res.json({
      message: 'Importação concluída',
      results
    });

  } catch (error) {
    console.error('Error importing leads:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;