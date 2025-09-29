import express from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/payment-methods - Lista todos métodos de pagamento
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM payment_methods ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ error: 'Erro ao buscar métodos de pagamento' });
  }
});

// POST /api/payment-methods - Criar novo método
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, type } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Nome e tipo são obrigatórios' });
    }

    const result = await pool.query(
      `INSERT INTO payment_methods (name, type)
       VALUES ($1, $2)
       RETURNING *`,
      [name, type]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating payment method:', error);
    res.status(500).json({ error: 'Erro ao criar método de pagamento' });
  }
});

// PUT /api/payment-methods/:id - Atualizar método
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, active } = req.body;

    const result = await pool.query(
      `UPDATE payment_methods SET
        name = $1, type = $2, active = $3
       WHERE id = $4
       RETURNING *`,
      [name, type, active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Método de pagamento não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating payment method:', error);
    res.status(500).json({ error: 'Erro ao atualizar método de pagamento' });
  }
});

// DELETE /api/payment-methods/:id - Deletar método
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM payment_methods WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Método de pagamento não encontrado' });
    }
    
    res.json({ message: 'Método de pagamento deletado com sucesso' });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    res.status(500).json({ error: 'Erro ao deletar método de pagamento' });
  }
});

export default router;
