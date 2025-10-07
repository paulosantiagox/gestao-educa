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
    res.json({ ok: true, data: result.rows });
  } catch (error) {
    console.error('Erro ao buscar consultores:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/consultores-redirect - Criar novo consultor
router.post('/', requireAuth, async (req, res) => {
  try {
    const { user_id, numero, plataformas, ativo, observacoes } = req.body;

    if (!user_id || !numero) {
      return res.status(400).json({ error: 'user_id e numero são obrigatórios' });
    }

    if (!plataformas || plataformas.length === 0) {
      return res.status(400).json({ error: 'Selecione pelo menos uma plataforma' });
    }

    const createdConsultors = [];

    // Criar um registro para cada plataforma selecionada
    for (const plataforma of plataformas) {
      // Verificar se já existe um registro para este número nesta plataforma
      const conflictQuery = `
        SELECT id FROM consultores_redirect 
        WHERE numero = $1 AND plataforma = $2
      `;
      
      const conflictResult = await db.query(conflictQuery, [numero, plataforma]);
      
      if (conflictResult.rows.length > 0) {
        return res.status(400).json({ 
          error: `Este número já está cadastrado na plataforma ${plataforma === 'google' ? 'Google Ads' : 'Meta Ads'}` 
        });
      }

      // Criar o registro
      const insertQuery = `
        INSERT INTO consultores_redirect (user_id, numero, plataforma, ativo, observacoes)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const values = [user_id, numero, plataforma, ativo !== false, observacoes || ''];
      const result = await db.query(insertQuery, values);
      createdConsultors.push(result.rows[0]);
    }

    // Atualizar contadores
    await updateActiveConsultorsCount();

    res.status(201).json(createdConsultors);
  } catch (error) {
    console.error('Erro ao criar consultor:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Este número já está cadastrado nesta plataforma' });
    }
    
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/consultores-redirect/:id - Atualizar consultor
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, numero, ativo, observacoes } = req.body;

    // Verificar se o consultor existe
    const existingQuery = `SELECT * FROM consultores_redirect WHERE id = $1`;
    const existingResult = await db.query(existingQuery, [id]);
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Consultor não encontrado' });
    }

    const existingConsultor = existingResult.rows[0];

    // Se apenas o status está sendo atualizado (toggle), não exigir outros campos
    const isStatusOnlyUpdate = ativo !== undefined && !numero;

    if (!isStatusOnlyUpdate && !numero) {
      return res.status(400).json({ error: 'numero é obrigatório' });
    }

    // Se está atualizando o número, verificar se já existe na mesma plataforma
    if (!isStatusOnlyUpdate && numero !== existingConsultor.numero) {
      const conflictQuery = `
        SELECT id FROM consultores_redirect 
        WHERE numero = $1 AND plataforma = $2 AND id != $3
      `;
      
      const conflictResult = await db.query(conflictQuery, [numero, existingConsultor.plataforma, id]);
      
      if (conflictResult.rows.length > 0) {
        const plataformaName = existingConsultor.plataforma === 'google' ? 'Google Ads' : 'Meta Ads';
        return res.status(400).json({ 
          error: `Este número já está cadastrado na plataforma ${plataformaName}` 
        });
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
          user_id = $1,
          numero = $2,
          ativo = $3,
          observacoes = $4,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING *
      `;
      queryParams = [
        user_id || existingConsultor.user_id,
        numero,
        ativo !== false,
        observacoes || '',
        id
      ];
    }

    const result = await db.query(updateQuery, queryParams);

    // Atualizar contadores
    await updateActiveConsultorsCount();

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar consultor:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Este número já está cadastrado nesta plataforma' });
    }
    
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
        total_ativos = $1,
        ultima_atualizacao = CURRENT_TIMESTAMP
      WHERE plataforma = 'whatsapp'
    `;
    await db.query(updateControlQuery, [totalAtivos]);
  } catch (error) {
    console.error('Erro ao atualizar contador de consultores:', error);
  }
}

export default router;