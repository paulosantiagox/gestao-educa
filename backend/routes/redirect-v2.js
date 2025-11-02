import express from "express";
import { pool } from "../db.js";
import crypto from "crypto";

const router = express.Router();

// Reserva removida na V2 simplificada (sem uso de reservado_ate)

// Atualiza contador de consultores ativos na tabela redirect_control
async function updateActiveCount(plataforma) {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM consultores_redirect 
     WHERE plataforma = $1 AND ativo = true`,
    [plataforma]
  );
  const totalAtivos = parseInt(result.rows[0].count || 0, 10);
  await pool.query(
    `UPDATE redirect_control 
     SET total_ativos = $1, ultima_atualizacao = CURRENT_TIMESTAMP 
     WHERE plataforma = $2`,
    [totalAtivos, plataforma]
  );
  return totalAtivos;
}

// Seleciona consultor ativo com menor quantidade de leads hoje; desempate aleatório
async function selectBalancedConsultor(plataforma) {
  const { rows } = await pool.query(
    `SELECT 
       cr.*, 
       u.name, u.email, u.utm_consultor,
       COALESCE(ld.count, 0) AS today_count
     FROM consultores_redirect cr
     JOIN users u ON cr.user_id = u.id
     LEFT JOIN (
       SELECT LOWER(TRIM(COALESCE(var1, 'Não informado'))) AS utm_consultor_norm, COUNT(*) AS count
       FROM leads_educa
       WHERE DATE(data_cadastro) = CURRENT_DATE
       GROUP BY LOWER(TRIM(COALESCE(var1, 'Não informado')))
     ) ld ON ld.utm_consultor_norm = LOWER(TRIM(u.utm_consultor))
     WHERE cr.plataforma = $1 
       AND cr.ativo = true 
     ORDER BY today_count ASC, RANDOM()
     LIMIT 1`,
    [plataforma]
  );
  return rows[0];
}

// Retorna contagens normalizadas do dia por consultor (usando leads_educa var1)
async function getTodayCountsNormalized(plataforma) {
  const { rows } = await pool.query(
    `SELECT cr.id, u.name, u.email, LOWER(TRIM(u.utm_consultor)) AS utm_consultor_norm,
            COALESCE(ld.count, 0) AS today_count
     FROM consultores_redirect cr
     JOIN users u ON cr.user_id = u.id
     LEFT JOIN (
       SELECT LOWER(TRIM(COALESCE(var1, 'Não informado'))) AS utm_consultor_norm, COUNT(*) AS count
       FROM leads_educa
       WHERE DATE(data_cadastro) = CURRENT_DATE
       GROUP BY LOWER(TRIM(COALESCE(var1, 'Não informado')))
     ) ld ON ld.utm_consultor_norm = LOWER(TRIM(u.utm_consultor))
     WHERE cr.plataforma = $1 AND cr.ativo = true
     ORDER BY today_count ASC`,
    [plataforma]
  );
  return rows;
}

// GET /api/public-v2/next-redirect?platform=whatsapp
router.get('/next-redirect', async (req, res) => {
  try {
    const plataforma = req.query.platform || 'whatsapp';
    const clientIP = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || '';

    // Atualizar ativos (sem reservas na V2 simplificada)
    const totalAtivos = await updateActiveCount(plataforma);

    let consultor;
    let preselectedConsultor = null;

    if (totalAtivos === 0) {
      // Sem ativos: tentar qualquer registro da plataforma
      const anyResult = await pool.query(
        `SELECT cr.*, u.name, u.email, u.utm_consultor 
         FROM consultores_redirect cr
         JOIN users u ON cr.user_id = u.id
         WHERE cr.plataforma = $1
         ORDER BY cr.ordem_atual ASC, cr.ultimo_uso ASC, cr.created_at ASC
         LIMIT 1`,
        [plataforma]
      );
      if (anyResult.rows.length > 0) {
        preselectedConsultor = anyResult.rows[0];
      }
    }

    // Seleção balanceada simples: menor quantidade de leads hoje, desempate aleatório
    consultor = await selectBalancedConsultor(plataforma);
    if (!consultor) {
      // Sem consultor ativo retornado; tentar preselecionado ou backup
      if (!consultor) {
        if (preselectedConsultor) {
          consultor = preselectedConsultor;
        } else {
          // Fallback final: número de backup via ENV
          const envBackup = process.env[`REDIRECT_BACKUP_${plataforma.toUpperCase()}`] || process.env.REDIRECT_BACKUP_DEFAULT;
          if (!envBackup) {
            return res.status(404).json({ success: false, error: 'Nenhum consultor disponível no momento' });
          }
          const token = crypto.randomBytes(32).toString('hex');
          const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
          await pool.query(
            `INSERT INTO redirect_logs 
             (consultor_id, plataforma, numero, status, token, ip_origem, user_agent, expira_em)
             VALUES (NULL, $1, $2, 'consultado', $3, $4, $5, $6)`,
            [plataforma, envBackup, token, clientIP, userAgent, expiresAt]
          );
          return res.json({
            success: true,
            data: {
              numero: envBackup,
              plataforma,
              consultor: null,
              token,
              expires_at: expiresAt.toISOString(),
              expires_in_minutes: 10
            }
          });
        }
      }
    }

    // Gerar token (sem reservar consultor)
    const token = crypto.randomBytes(32).toString('hex');
    // Atualizar último uso apenas para registro simples
    await pool.query(
      `UPDATE consultores_redirect SET ultimo_uso = CURRENT_TIMESTAMP WHERE id = $1`,
      [consultor.id]
    );

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await pool.query(
      `INSERT INTO redirect_logs 
       (consultor_id, plataforma, numero, status, token, ip_origem, user_agent, expira_em)
       VALUES ($1, $2, $3, 'consultado', $4, $5, $6, $7)`,
      [consultor.id, plataforma, consultor.numero, token, clientIP, userAgent, expiresAt]
    );

    res.json({
      success: true,
      data: {
        numero: consultor.numero,
        plataforma,
        consultor: {
          id: consultor.user_id,
          name: consultor.name,
          email: consultor.email,
          utm_consultor: consultor.utm_consultor || null
        },
        token,
        expires_at: expiresAt.toISOString(),
        expires_in_minutes: 10
      }
    });
  } catch (error) {
    console.error('Erro em next-redirect v2:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// POST /api/public-v2/confirm-redirect
router.post('/confirm-redirect', async (req, res) => {
  try {
    const { token, numero, plataforma = 'whatsapp', lead_data } = req.body || {};
    if (!token || !numero) {
      return res.status(400).json({ success: false, error: 'Token e número são obrigatórios' });
    }

    const { rows } = await pool.query(
      `SELECT * FROM redirect_logs WHERE token = $1 AND plataforma = $2 ORDER BY created_at DESC LIMIT 1`,
      [token, plataforma]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Token inválido' });
    }
    const log = rows[0];
    const now = new Date();
    if (log.expira_em && new Date(log.expira_em) < now) {
      return res.status(400).json({ success: false, error: 'Token expirado' });
    }

    await pool.query(
      `UPDATE redirect_logs 
       SET status = 'confirmado', confirmado_em = CURRENT_TIMESTAMP, dados_lead = $1 
       WHERE id = $2`,
      [JSON.stringify(lead_data || {}), log.id]
    );

    if (log.consultor_id) {
      await pool.query(
        `UPDATE consultores_redirect 
         SET total_usos = total_usos + 1 
         WHERE id = $1`,
        [log.consultor_id]
      );
    }

    res.json({ success: true, message: 'Redirecionamento confirmado com sucesso', data: { numero, plataforma, confirmed_at: new Date().toISOString() } });
  } catch (error) {
    console.error('Erro ao confirmar v2:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// GET /api/public-v2/redirect-stats - estatísticas e equilíbrio do dia
router.get('/redirect-stats', async (req, res) => {
  try {
    const plataforma = req.query.platform || 'whatsapp';
    const countsResult = await pool.query(
      `SELECT cr.id, u.name, u.email, LOWER(TRIM(u.utm_consultor)) AS utm_consultor_norm,
              COALESCE(ld.count, 0) AS today_count
       FROM consultores_redirect cr
       JOIN users u ON cr.user_id = u.id
       LEFT JOIN (
         SELECT LOWER(TRIM(COALESCE(var1, 'Não informado'))) AS utm_consultor_norm, COUNT(*) AS count
         FROM leads_educa
         WHERE DATE(data_cadastro) = CURRENT_DATE
         GROUP BY LOWER(TRIM(COALESCE(var1, 'Não informado')))
       ) ld ON ld.utm_consultor_norm = LOWER(TRIM(u.utm_consultor))
       WHERE cr.plataforma = $1 AND cr.ativo = true
       ORDER BY today_count ASC`,
      [plataforma]
    );

    const counts = countsResult.rows.map(r => r.today_count);
    const min = counts.length ? Math.min(...counts) : 0;
    const max = counts.length ? Math.max(...counts) : 0;

    res.json({
      success: true,
      data: {
        plataforma,
        consultores: countsResult.rows,
        hoje_min: min,
        hoje_max: max,
        diferenca: max - min
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas v2:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

export default router;