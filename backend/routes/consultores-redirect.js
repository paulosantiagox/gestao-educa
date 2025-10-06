import express from 'express';
import db from '../db.js';
import requireAuth from '../requireAuth.js';

const router = express.Router();

// GET /api/consultores-redirect - Listar todos os consultores
router.get('/', requireAuth, async (req, res) => {
  try {
    const query = `
      SELECT 
        cr.*,
        u.name as nome,
        u.email
      FROM consultores_redirect cr
      JOIN users u ON cr.user_id = u.id
      ORDER BY cr.created_at DESC
    `;
    
    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar consultores:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/consultores-redirect - Criar novo consultor
router.post('/', requireAuth, async (req, res) => {
  try {
    const { user_id, numero, plataforma_google, plataforma_meta, ativo, observacoes } = req.body;

    if (!user_id || !numero) {
      return res.status(400).json({ error: 'user_id e numero são obrigatórios' });
    }

    // Validação: número deve ser associado apenas a uma plataforma
    if (plataforma_google && plataforma_meta) {
      return res.status(400).json({ error: 'Um número não pode estar associado a ambas as plataformas' });
    }

    if (!plataforma_google && !plataforma_meta) {
      return res.status(400).json({ error: 'Selecione pelo menos uma plataforma' });
    }

    // Verificar se o número já existe (independente do usuário)
    const existingQuery = `
      SELECT id FROM consultores_redirect 
      WHERE numero = $1
    `;
    const existing = await db.query(existingQuery, [numero]);
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Este número já está cadastrado no sistema' });
    }

    const insertQuery = `
      INSERT INTO consultores_redirect 
      (user_id, numero, plataforma, plataforma_google, plataforma_meta, ativo, observacoes)
      VALUES ($1, $2, 'whatsapp', $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await db.query(insertQuery, [
      user_id, 
      numero, 
      plataforma_google || false, 
      plataforma_meta || false, 
      ativo !== false, 
      observacoes || null
    ]);

    // Atualizar contador de consultores ativos
    await updateActiveConsultorsCount();

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar consultor:', error);
    if (error.code === '23505') { // Unique violation
      res.status(400).json({ error: 'Já existe um número cadastrado para este usuário nesta plataforma' });
    } else {
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
});

// PUT /api/consultores-redirect/:id - Atualizar consultor
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { numero, plataforma_google, plataforma_meta, ativo, observacoes } = req.body;

    // Se apenas o status está sendo atualizado (toggle), não exigir outros campos
    const isStatusOnlyUpdate = ativo !== undefined && !numero && plataforma_google === undefined && plataforma_meta === undefined;

    if (!isStatusOnlyUpdate) {
      // Validações completas apenas para atualizações completas
      if (!numero) {
        return res.status(400).json({ error: 'numero é obrigatório' });
      }

      // Validação: número deve ser associado apenas a uma plataforma
      if (plataforma_google && plataforma_meta) {
        return res.status(400).json({ error: 'Um número não pode estar associado a ambas as plataformas' });
      }

      if (!plataforma_google && !plataforma_meta) {
        return res.status(400).json({ error: 'Selecione pelo menos uma plataforma' });
      }
    }

    let updateQuery;
    let queryParams;

    if (isStatusOnlyUpdate) {
      // Atualização apenas do status
      updateQuery = `
        UPDATE consultores_redirect 
        SET 
          ativo = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      queryParams = [ativo, id];
    } else {
      // Atualização completa
      updateQuery = `
        UPDATE consultores_redirect 
        SET 
          numero = $1,
          plataforma_google = $2,
          plataforma_meta = $3,
          ativo = $4,
          observacoes = $5,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *
      `;
      queryParams = [
        numero,
        plataforma_google || false,
        plataforma_meta || false,
        ativo !== false,
        observacoes || null,
        id
      ];
    }
    
    const result = await db.query(updateQuery, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Consultor não encontrado' });
    }

    // Atualizar contador de consultores ativos
    await updateActiveConsultorsCount();

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar consultor:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/consultores-redirect/:id - Remover consultor
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const deleteQuery = 'DELETE FROM consultores_redirect WHERE id = $1 RETURNING *';
    const result = await db.query(deleteQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Consultor não encontrado' });
    }

    // Atualizar contador de consultores ativos
    await updateActiveConsultorsCount();

    res.json({ message: 'Consultor removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover consultor:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Função auxiliar para atualizar contador de consultores ativos
async function updateActiveConsultorsCount() {
  try {
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM consultores_redirect 
      WHERE ativo = true AND plataforma = 'whatsapp'
    `;
    const countResult = await db.query(countQuery);
    const totalAtivos = parseInt(countResult.rows[0].total);

    const updateControlQuery = `
      UPDATE redirect_control 
      SET 
        total_consultores = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `;
    await db.query(updateControlQuery, [totalAtivos]);
  } catch (error) {
    console.error('Erro ao atualizar contador de consultores:', error);
  }
}

export default router;