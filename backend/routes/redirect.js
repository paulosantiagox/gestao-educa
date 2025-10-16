import express from "express";
import { pool } from "../db.js";
import crypto from "crypto";

const router = express.Router();

// Função para limpar reservas expiradas
async function clearExpiredReservations(plataforma) {
  const now = new Date();
  await pool.query(
    `UPDATE consultores_redirect 
     SET reservado_ate = NULL, reservado_por = NULL 
     WHERE plataforma = $1 AND reservado_ate < $2`,
    [plataforma, now]
  );
}

// Função para atualizar contador de ativos
async function updateActiveCount(plataforma) {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM consultores_redirect 
     WHERE plataforma = $1 AND ativo = true`,
    [plataforma]
  );
  
  const totalAtivos = parseInt(result.rows[0].count);
  
  await pool.query(
    `UPDATE redirect_control 
     SET total_ativos = $1, ultima_atualizacao = CURRENT_TIMESTAMP 
     WHERE plataforma = $2`,
    [totalAtivos, plataforma]
  );
  
  return totalAtivos;
}

// GET /api/public/next-redirect?platform=whatsapp
router.get("/next-redirect", async (req, res) => {
  try {
    const plataforma = req.query.platform || 'whatsapp';
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || '';

    // Limpar reservas expiradas
    await clearExpiredReservations(plataforma);
    
    // Atualizar contador de ativos
    const totalAtivos = await updateActiveCount(plataforma);
    
    // Fallback quando não há consultores ativos: tentar selecionar qualquer registro da plataforma
    // Caso não exista registro algum, usar número de backup via ENV (se configurado)
    let preselectedConsultor = null;
    if (totalAtivos === 0) {
      const anyResult = await pool.query(`
        SELECT cr.*, u.name, u.email, u.utm_consultor 
        FROM consultores_redirect cr
        JOIN users u ON cr.user_id = u.id
        WHERE cr.plataforma = $1
        ORDER BY cr.ordem_atual ASC, cr.ultimo_uso ASC, cr.created_at ASC
        LIMIT 1
      `, [plataforma]);

      if (anyResult.rows.length > 0) {
        preselectedConsultor = anyResult.rows[0];
      }
    }

    // Buscar próximo consultor disponível
    const consultorResult = await pool.query(`
      SELECT cr.*, u.name, u.email, u.utm_consultor 
      FROM consultores_redirect cr
      JOIN users u ON cr.user_id = u.id
      WHERE cr.plataforma = $1 
        AND cr.ativo = true 
        AND (cr.reservado_ate IS NULL OR cr.reservado_ate < CURRENT_TIMESTAMP)
      ORDER BY cr.ordem_atual ASC, cr.ultimo_uso ASC
      LIMIT 1
    `, [plataforma]);

    let consultor;
    if (consultorResult.rows.length === 0) {
      // Fallback: se todos estiverem reservados, selecionar mesmo assim o próximo ativo
      const fallbackResult = await pool.query(`
        SELECT cr.*, u.name, u.email, u.utm_consultor 
        FROM consultores_redirect cr
        JOIN users u ON cr.user_id = u.id
        WHERE cr.plataforma = $1 
          AND cr.ativo = true
        ORDER BY cr.ordem_atual ASC, cr.ultimo_uso ASC
        LIMIT 1
      `, [plataforma]);

      if (fallbackResult.rows.length === 0) {
        // Fallback adicional: usar consultor previamente selecionado (mesmo inativo) se existir
        if (preselectedConsultor) {
          consultor = preselectedConsultor;
        } else {
          // Fallback final: número de backup via ENV
          const envBackup = process.env[`REDIRECT_BACKUP_${plataforma.toUpperCase()}`] || process.env.REDIRECT_BACKUP_DEFAULT;
          if (!envBackup) {
            return res.status(404).json({
              success: false,
              error: "Nenhum consultor disponível no momento"
            });
          }

          // Gerar token e logar sem consultor_id
          const token = crypto.randomBytes(32).toString('hex');
          const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

          await pool.query(`
            INSERT INTO redirect_logs 
            (consultor_id, plataforma, numero, status, token, ip_origem, user_agent, expira_em)
            VALUES (NULL, $1, $2, 'consultado', $3, $4, $5, $6)
          `, [plataforma, envBackup, token, clientIP, userAgent, expiresAt]);

          return res.json({
            success: true,
            data: {
              numero: envBackup,
              plataforma: plataforma,
              consultor: null,
              token: token,
              expires_at: expiresAt.toISOString(),
              expires_in_minutes: 10
            }
          });
        }
      } else {
        consultor = fallbackResult.rows[0];
      }
    } else {
      consultor = consultorResult.rows[0];
    }
    
    // Gerar token e definir janela de expiração do token (10 minutos)
    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const reservadoAte = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutos

    // Se o consultor já está reservado (reserva atual ainda válida), não estender a reserva
    // Apenas atualizar ultimo_uso para manter ordem/estatística. Caso contrário, reservar normalmente.
    const isCurrentlyReserved = consultor.reservado_ate && new Date(consultor.reservado_ate) > now;

    if (isCurrentlyReserved) {
      await pool.query(`
        UPDATE consultores_redirect 
        SET ultimo_uso = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [consultor.id]);
    } else {
      await pool.query(`
        UPDATE consultores_redirect 
        SET reservado_ate = $1, reservado_por = $2, ultimo_uso = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [reservadoAte, clientIP, consultor.id]);
    }

    // Atualizar ordem round-robin corretamente:
    // Empurra o consultor selecionado para o fim, atribuindo ordem_atual = (max + 1)
    if (consultor.ativo) {
      await pool.query(`
        UPDATE consultores_redirect 
        SET ordem_atual = (
          SELECT COALESCE(MAX(ordem_atual), 0) + 1 
          FROM consultores_redirect 
          WHERE plataforma = $1 AND ativo = true
        )
        WHERE id = $2
      `, [plataforma, consultor.id]);
    }

    // Criar log de consulta
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos
    await pool.query(`
      INSERT INTO redirect_logs 
      (consultor_id, plataforma, numero, status, token, ip_origem, user_agent, expira_em)
      VALUES ($1, $2, $3, 'consultado', $4, $5, $6, $7)
    `, [consultor.id, plataforma, consultor.numero, token, clientIP, userAgent, expiresAt]);

    res.json({
      success: true,
      data: {
        numero: consultor.numero,
        plataforma: plataforma,
        consultor: {
          id: consultor.user_id,
          name: consultor.name,
          email: consultor.email,
          utm_consultor: consultor.utm_consultor || null
        },
        token: token,
        expires_at: expiresAt.toISOString(),
        expires_in_minutes: 10
      }
    });

  } catch (error) {
    console.error("Erro ao buscar próximo redirecionamento:", error);
    res.status(500).json({
      success: false,
      error: "Erro interno do servidor"
    });
  }
});

// POST /api/public/confirm-redirect
router.post("/confirm-redirect", async (req, res) => {
  try {
    const { numero, platform, token, lead_data } = req.body;
    const plataforma = platform || 'whatsapp';
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!numero || !token) {
      return res.status(400).json({
        success: false,
        error: "Número e token são obrigatórios"
      });
    }

    // Verificar se o log existe e está válido
    const logResult = await pool.query(`
      SELECT rl.*, cr.id as consultor_id
      FROM redirect_logs rl
      LEFT JOIN consultores_redirect cr ON rl.consultor_id = cr.id
      WHERE rl.token = $1 
        AND rl.numero = $2 
        AND rl.plataforma = $3 
        AND rl.status = 'consultado'
        AND rl.expira_em > CURRENT_TIMESTAMP
    `, [token, numero, plataforma]);

    if (logResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Token inválido, expirado ou já utilizado"
      });
    }

    const log = logResult.rows[0];

    // Atualizar log para confirmado
    await pool.query(`
      UPDATE redirect_logs 
      SET status = 'confirmado', 
          confirmado_em = CURRENT_TIMESTAMP,
          dados_lead = $1
      WHERE id = $2
    `, [JSON.stringify(lead_data || {}), log.id]);

    // Incrementar contador de usos do consultor
    if (log.consultor_id) {
      await pool.query(`
        UPDATE consultores_redirect 
        SET total_usos = total_usos + 1,
            reservado_ate = NULL,
            reservado_por = NULL
        WHERE id = $1
      `, [log.consultor_id]);
    }

    res.json({
      success: true,
      message: "Redirecionamento confirmado com sucesso",
      data: {
        numero: numero,
        plataforma: plataforma,
        confirmed_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Erro ao confirmar redirecionamento:", error);
    res.status(500).json({
      success: false,
      error: "Erro interno do servidor"
    });
  }
});

// GET /api/public/redirect-stats (endpoint para estatísticas públicas)
router.get("/redirect-stats", async (req, res) => {
  try {
    const plataforma = req.query.platform || 'whatsapp';

    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_consultores,
        COUNT(*) FILTER (WHERE ativo = true) as consultores_ativos,
        SUM(total_usos) as total_redirecionamentos
      FROM consultores_redirect 
      WHERE plataforma = $1
    `, [plataforma]);

    const recentLogs = await pool.query(`
      SELECT COUNT(*) as redirects_hoje
      FROM redirect_logs 
      WHERE plataforma = $1 
        AND DATE(created_at) = CURRENT_DATE
        AND status = 'confirmado'
    `, [plataforma]);

    res.json({
      success: true,
      data: {
        plataforma: plataforma,
        total_consultores: parseInt(stats.rows[0].total_consultores),
        consultores_ativos: parseInt(stats.rows[0].consultores_ativos),
        total_redirecionamentos: parseInt(stats.rows[0].total_redirecionamentos),
        redirects_hoje: parseInt(recentLogs.rows[0].redirects_hoje)
      }
    });

  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error);
    res.status(500).json({
      success: false,
      error: "Erro interno do servidor"
    });
  }
});

export default router;