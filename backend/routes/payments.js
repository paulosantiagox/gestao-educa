import express from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../requireAuth.js';

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

    console.log('\n=== BACKEND: CREATE PAYMENT ===');
    console.log('1. Request body:', JSON.stringify(req.body, null, 2));

    const { sale_id, amount, payment_date, payment_method_id, notes } = req.body;

    console.log('2. sale_id:', sale_id, 'amount:', amount);

    if (!sale_id || !amount) {
      console.error('3. ERRO: Campos obrigatórios faltando');
      return res.status(400).json({ error: 'ID da venda e valor são obrigatórios' });
    }

    // Busca a venda atual
    const saleResult = await client.query(
      'SELECT total_amount, paid_amount FROM sales WHERE id = $1',
      [sale_id]
    );

    console.log('3. Venda encontrada:', saleResult.rows[0]);

    if (saleResult.rows.length === 0) {
      await client.query('ROLLBACK');
      console.error('4. ERRO: Venda não encontrada');
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    const sale = saleResult.rows[0];
    const newPaidAmount = parseFloat(sale.paid_amount) + parseFloat(amount);

    console.log('4. paid_amount atual:', sale.paid_amount);
    console.log('5. amount do pagamento:', amount);
    console.log('6. newPaidAmount calculado:', newPaidAmount);
    console.log('7. total_amount da venda:', sale.total_amount);

    if (newPaidAmount > parseFloat(sale.total_amount)) {
      await client.query('ROLLBACK');
      console.error('8. ERRO: Valor excede o total');
      return res.status(400).json({ error: 'Valor pago excede o valor total da venda' });
    }

    // Insere o pagamento
    console.log('8. Inserindo pagamento...');
    const paymentResult = await client.query(
      `INSERT INTO payments (sale_id, amount, payment_date, payment_method_id, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [sale_id, amount, payment_date || new Date(), payment_method_id, notes]
    );

    console.log('9. Pagamento inserido:', paymentResult.rows[0]);

    // Atualiza a venda
    const newStatus = newPaidAmount >= parseFloat(sale.total_amount) ? 'paid' : 'partial';
    console.log('10. newStatus calculado:', newStatus);
    console.log('11. Atualizando venda com paid_amount:', newPaidAmount, 'status:', newStatus);
    
    await client.query(
      `UPDATE sales SET
        paid_amount = $1,
        payment_status = $2,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [newPaidAmount, newStatus, sale_id]
    );

    console.log('12. Venda atualizada com sucesso!');

    await client.query('COMMIT');
    console.log('13. Transaction committed!');
    console.log('=== FIM CREATE PAYMENT ===\n');
    
    res.status(201).json(paymentResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('=== ERRO NO CREATE PAYMENT ===');
    console.error('Error creating payment:', error);
    console.error('Stack:', error.stack);
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
