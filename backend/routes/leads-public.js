import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

// GET /api/leads-public/consultor-dia
// Retorna total de leads do mês atual por consultor (var1) dividido por dia
router.get('/consultor-dia', async (req, res) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month ?? (now.getMonth() + 1));
    const year = parseInt(req.query.year ?? now.getFullYear());
    const responsible = req.query.responsible ?? null; // opcional: filtrar por var1 específico

    let whereClause = `EXTRACT(MONTH FROM data_cadastro) = $1 AND EXTRACT(YEAR FROM data_cadastro) = $2`;
    const params = [month, year];

    if (responsible) {
      whereClause += ` AND var1 = $3`;
      params.push(responsible);
    }

    const query = `
      SELECT 
        COALESCE(var1, '') AS consultor,
        DATE(data_cadastro) AS dia,
        COUNT(*) AS total
      FROM leads_educa
      WHERE ${whereClause}
      GROUP BY consultor, dia
      ORDER BY consultor ASC, dia ASC
    `;

    const result = await pool.query(query, params);
    res.json({ success: true, month, year, data: result.rows });
  } catch (error) {
    console.error('Erro ao obter leads por consultor/dia:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

export default router;

// GET /api/leads-public/consultores-por-dia
// Retorna total de leads em uma data específica, agrupado por consultor (var1)
router.get('/consultores-por-dia', async (req, res) => {
  try {
    const { date } = req.query; // esperado formato YYYY-MM-DD
    let targetDate = date;

    // Permitir também month/year/day separados se não houver 'date'
    if (!targetDate) {
      const now = new Date();
      const day = parseInt(req.query.day ?? now.getDate());
      const month = parseInt(req.query.month ?? (now.getMonth() + 1));
      const year = parseInt(req.query.year ?? now.getFullYear());
      const mm = String(month).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      targetDate = `${year}-${mm}-${dd}`;
    }

    const query = `
      SELECT 
        COALESCE(var1, 'Não informado') AS consultor,
        COUNT(*) AS total
      FROM leads_educa
      WHERE DATE(data_cadastro) = $1::date
      GROUP BY consultor
      ORDER BY total DESC, consultor ASC
    `;

    const result = await pool.query(query, [targetDate]);
    const totalDia = result.rows.reduce((acc, r) => acc + Number(r.total), 0);
    res.json({ success: true, date: targetDate, total: totalDia, data: result.rows });
  } catch (error) {
    console.error('Erro ao obter consultores por dia:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// GET /api/leads-public/utms-por-dia
// Retorna, para o mês/ano informados, contagem por dia agrupada por um campo UTM
router.get('/utms-por-dia', async (req, res) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month ?? (now.getMonth() + 1));
    const year = parseInt(req.query.year ?? now.getFullYear());
    const responsible = req.query.responsible ?? null; // opcional: filtrar por var1
    const groupBy = (req.query.group_by ?? 'utm_source').toString();

    // Permitir apenas colunas específicas para evitar SQL injection
    const allowed = new Set(['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'var1']);
    const column = allowed.has(groupBy) ? groupBy : 'utm_source';

    let whereClause = `EXTRACT(MONTH FROM data_cadastro) = $1 AND EXTRACT(YEAR FROM data_cadastro) = $2`;
    const params = [month, year];

    if (responsible) {
      whereClause += ` AND var1 = $3`;
      params.push(responsible);
    }

    // Agrupa por dia e pelo campo escolhido
    const query = `
      SELECT 
        DATE(data_cadastro) AS dia,
        COALESCE(${column}, 'Direto') AS chave,
        COUNT(*) AS total
      FROM leads_educa
      WHERE ${whereClause}
      GROUP BY dia, chave
      ORDER BY dia ASC, total DESC
    `;

    const result = await pool.query(query, params);

    // Estruturar em lista por dia com itens de UTM
    const map = new Map();
    for (const row of result.rows) {
      const k = row.dia;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push({ key: row.chave, total: Number(row.total) });
    }

    const data = Array.from(map.entries()).map(([dia, items]) => ({ dia, items }));
    res.json({ success: true, month, year, group_by: column, data });
  } catch (error) {
    console.error('Erro ao obter UTMs por dia:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});