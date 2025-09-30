import express from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../requireAuth.js';

const router = express.Router();

// GET /api/sales - Lista vendas com paginação e busca
router.get('/', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, q = '' } = req.query;
    const offset = (page - 1) * limit;

    const searchQuery = `%${q}%`;
    
    const result = await pool.query(
      `SELECT s.*, pm.name as payment_method_name 
       FROM sales s
       LEFT JOIN payment_methods pm ON s.payment_method_id = pm.id
       WHERE s.sale_code ILIKE $1 OR s.payer_name ILIKE $1 OR s.payer_email ILIKE $1
       ORDER BY s.created_at DESC, s.id DESC
       LIMIT $2 OFFSET $3`,
      [searchQuery, limit, offset]
    );
    
    console.log('📋 Sales query result (primeiras 3):', result.rows.slice(0, 3).map(s => ({ 
      id: s.id, 
      code: s.sale_code, 
      created_at: s.created_at 
    })));

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM sales 
       WHERE sale_code ILIKE $1 OR payer_name ILIKE $1 OR payer_email ILIKE $1`,
      [searchQuery]
    );

    res.json({
      sales: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ error: 'Erro ao buscar vendas' });
  }
});

// GET /api/sales/:id - Busca venda por ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT s.*, pm.name as payment_method_name 
       FROM sales s
       LEFT JOIN payment_methods pm ON s.payment_method_id = pm.id
       WHERE s.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching sale:', error);
    res.status(500).json({ error: 'Erro ao buscar venda' });
  }
});

// POST /api/sales - Criar nova venda
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      sale_code, payer_name, payer_email, payer_phone, payer_cpf,
      total_amount, payment_method_id, sale_date
    } = req.body;

    // Validação básica
    if (!sale_code || !payer_name || !total_amount) {
      return res.status(400).json({ error: 'Código da venda, nome do pagador e valor total são obrigatórios' });
    }

    const result = await pool.query(
      `INSERT INTO sales (
        sale_code, payer_name, payer_email, payer_phone, payer_cpf,
        total_amount, paid_amount, payment_method_id, payment_status, sale_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        sale_code, payer_name, payer_email, payer_phone, payer_cpf,
        total_amount, 0, payment_method_id, 'pending', sale_date || new Date()
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating sale:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Código de venda já existe' });
    }
    res.status(500).json({ error: 'Erro ao criar venda' });
  }
});

// PUT /api/sales/:id - Atualizar venda
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('\n=== BACKEND: UPDATE SALE ===');
    console.log('1. Sale ID:', id);
    console.log('2. Request body:', JSON.stringify(req.body, null, 2));
    
    const {
      sale_code, payer_name, payer_email, payer_phone, payer_cpf,
      total_amount, paid_amount, payment_method_id, payment_status, sale_date
    } = req.body;

    console.log('3. paid_amount recebido:', paid_amount, 'tipo:', typeof paid_amount);
    console.log('4. payment_status recebido:', payment_status);

    // Garantir que paid_amount e total_amount sejam números válidos
    const paidAmountValue = paid_amount !== undefined && paid_amount !== null && paid_amount !== '' 
      ? parseFloat(paid_amount) 
      : 0;
    
    const totalAmountValue = parseFloat(total_amount);

    console.log('5. paidAmountValue processado:', paidAmountValue);
    console.log('6. totalAmountValue:', totalAmountValue);

    // Atualizar status automaticamente baseado no valor pago
    let finalStatus = payment_status || 'pending';
    if (paidAmountValue >= totalAmountValue && paidAmountValue > 0) {
      finalStatus = 'paid';
    } else if (paidAmountValue > 0 && paidAmountValue < totalAmountValue) {
      finalStatus = 'partial';
    } else if (paidAmountValue === 0) {
      finalStatus = 'pending';
    }

    console.log('7. finalStatus calculado:', finalStatus);
    console.log('8. Executando UPDATE no banco...');

    const result = await pool.query(
      `UPDATE sales SET
        sale_code = $1, payer_name = $2, payer_email = $3, payer_phone = $4,
        payer_cpf = $5, total_amount = $6, paid_amount = $7, payment_method_id = $8, 
        payment_status = $9, sale_date = $10,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *`,
      [
        sale_code, payer_name, payer_email, payer_phone, payer_cpf,
        totalAmountValue, paidAmountValue, payment_method_id, finalStatus, sale_date,
        id
      ]
    );

    console.log('9. Resultado do UPDATE:');
    console.log('   - paid_amount no banco:', result.rows[0]?.paid_amount);
    console.log('   - payment_status no banco:', result.rows[0]?.payment_status);
    console.log('   - total_amount no banco:', result.rows[0]?.total_amount);

    if (result.rows.length === 0) {
      console.error('10. ERRO: Venda não encontrada');
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    console.log('11. UPDATE concluído com sucesso!');
    console.log('=== FIM UPDATE SALE ===\n');
    res.json(result.rows[0]);
  } catch (error) {
    console.error('=== ERRO NO UPDATE SALE ===');
    console.error('Error updating sale:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Erro ao atualizar venda' });
  }
});

// DELETE /api/sales/:id - Deletar venda
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM sales WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }
    
    res.json({ message: 'Venda deletada com sucesso' });
  } catch (error) {
    console.error('Error deleting sale:', error);
    res.status(500).json({ error: 'Erro ao deletar venda' });
  }
});

export default router;
