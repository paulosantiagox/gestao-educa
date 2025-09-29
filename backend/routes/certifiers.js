import express from 'express';
import { pool } from './db.js';
import { requireAuth } from './requireAuth.js';

const router = express.Router();

// GET /api/certifiers - Lista todas certificadoras
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM certifiers ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching certifiers:', error);
    res.status(500).json({ error: 'Erro ao buscar certificadoras' });
  }
});

// POST /api/certifiers - Criar nova certificadora
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, contact_email, contact_phone } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    const result = await pool.query(
      `INSERT INTO certifiers (name, contact_email, contact_phone)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, contact_email, contact_phone]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating certifier:', error);
    res.status(500).json({ error: 'Erro ao criar certificadora' });
  }
});

// PUT /api/certifiers/:id - Atualizar certificadora
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contact_email, contact_phone, active } = req.body;

    const result = await pool.query(
      `UPDATE certifiers SET
        name = $1, contact_email = $2, contact_phone = $3, active = $4,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [name, contact_email, contact_phone, active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Certificadora não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating certifier:', error);
    res.status(500).json({ error: 'Erro ao atualizar certificadora' });
  }
});

// DELETE /api/certifiers/:id - Deletar certificadora
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM certifiers WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Certificadora não encontrada' });
    }
    
    res.json({ message: 'Certificadora deletada com sucesso' });
  } catch (error) {
    console.error('Error deleting certifier:', error);
    res.status(500).json({ error: 'Erro ao deletar certificadora' });
  }
});

export default router;
