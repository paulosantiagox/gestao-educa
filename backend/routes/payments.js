import express from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/payments/sale/:saleId - Lista pagamentos de uma venda
router.get('/sale/:saleId', requireAuth, async (req, res) => {
  try {
    const { saleId } = req.params;
    
    const result = await pool.query(
      `SELECT p.*, pm.name as payment_method_name
       FROM payments p
       LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
       WHERE p.sale_id = $1
       ORDER BY p.payment_date DESC`,
      [saleId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Erro ao buscar pagamentos' });
  }
});

// POST /api/payments - Criar novo pagamento parcial
router.post('/', requireAuth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { sale_id, amount, payment_date, payment_method_id, notes } = req.body;

    if (!sale_id || !amount) {
      return res.status(400).json({ error: 'ID da venda e valor são obrigatórios' });
    }

    // Busca a venda atual
    const saleResult = await client.query(
      'SELECT total_amount, paid_amount FROM sales WHERE id = $1',
      [sale_id]
    );

    if (saleResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    const sale = saleResult.rows[0];
    const newPaidAmount = parseFloat(sale.paid_amount) + parseFloat(amount);

    if (newPaidAmount > parseFloat(sale.total_amount)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Valor pago excede o valor total da venda' });
    }

    // Insere o pagamento
    const paymentResult = await client.query(
      `INSERT INTO payments (sale_id, amount, payment_date, payment_method_id, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [sale_id, amount, payment_date || new Date(), payment_method_id, notes]
    );

    // Atualiza a venda
    const newStatus = newPaidAmount >= parseFloat(sale.total_amount) ? 'paid' : 'partial';
    await client.query(
      `UPDATE sales SET
        paid_amount = $1,
        payment_status = $2,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [newPaidAmount, newStatus, sale_id]
    );

    await client.query('COMMIT');
    res.status(201).json(paymentResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating payment:', error);
    res.status(500).json({ error: 'Erro ao criar pagamento' });
  } finally {
    client.release();
  }
});

// DELETE /api/payments/:id - Deletar pagamento
router.delete('/:id', requireAuth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // Busca o pagamento
    const paymentResult = await client.query(
      'SELECT * FROM payments WHERE id = $1',
      [id]
    );

    if (paymentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    const payment = paymentResult.rows[0];

    // Busca a venda
    const saleResult = await client.query(
      'SELECT total_amount, paid_amount FROM sales WHERE id = $1',
      [payment.sale_id]
    );

    const sale = saleResult.rows[0];
    const newPaidAmount = parseFloat(sale.paid_amount) - parseFloat(payment.amount);

    // Deleta o pagamento
    await client.query('DELETE FROM payments WHERE id = $1', [id]);

    // Atualiza a venda
    const newStatus = newPaidAmount <= 0 ? 'pending' : 
                     newPaidAmount >= parseFloat(sale.total_amount) ? 'paid' : 'partial';
    
    await client.query(
      `UPDATE sales SET
        paid_amount = $1,
        payment_status = $2,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [Math.max(0, newPaidAmount), newStatus, payment.sale_id]
    );

    await client.query('COMMIT');
    res.json({ message: 'Pagamento deletado com sucesso' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting payment:', error);
    res.status(500).json({ error: 'Erro ao deletar pagamento' });
  } finally {
    client.release();
  }
});

export default router;
