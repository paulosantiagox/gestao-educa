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
      `SELECT s.*, pm.name as payment_method_name,
              COUNT(DISTINCT ss.student_id)::int as students_count,
              (SELECT st.name FROM students st 
               INNER JOIN student_sales ss2 ON st.id = ss2.student_id 
               WHERE ss2.sale_id = s.id 
               ORDER BY ss2.id LIMIT 1) as first_student_name,
              (SELECT string_agg(st.name, ', ' ORDER BY st.name) 
               FROM students st 
               INNER JOIN student_sales ss3 ON st.id = ss3.student_id 
               WHERE ss3.sale_id = s.id) as student_names
       FROM sales s
       LEFT JOIN payment_methods pm ON s.payment_method_id = pm.id
       LEFT JOIN student_sales ss ON s.id = ss.sale_id
       WHERE s.sale_code ILIKE $1 OR s.payer_name ILIKE $1 OR s.payer_email ILIKE $1
       GROUP BY s.id, pm.name
       ORDER BY s.created_at DESC, s.id DESC
       LIMIT $2 OFFSET $3`,
      [searchQuery, limit, offset]
    );
    
    console.log('📋 Sales query result (primeira venda completa):', result.rows[0]);
    console.log('📋 Campos importantes:', result.rows.slice(0, 2).map(s => ({ 
      id: s.id, 
      code: s.sale_code,
      students_count: s.students_count,
      first_student_name: s.first_student_name,
      student_names: s.student_names
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

// GET /api/sales/next-code - Busca próximo código de venda disponível
router.get('/next-code', requireAuth, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const prefix = `VND-${currentYear}-`;
    
    // Buscar o maior número de ordem do ano atual
    const result = await pool.query(
      `SELECT sale_code FROM sales 
       WHERE sale_code LIKE $1 
       ORDER BY sale_code DESC 
       LIMIT 1`,
      [`${prefix}%`]
    );
    
    let nextNumber = 1;
    
    if (result.rows.length > 0) {
      const lastCode = result.rows[0].sale_code;
      const lastNumberMatch = lastCode.match(/VND-\d{4}-(\d+)/);
      
      if (lastNumberMatch) {
        nextNumber = parseInt(lastNumberMatch[1]) + 1;
      }
    }
    
    const nextCode = `${prefix}${nextNumber.toString().padStart(3, '0')}`;
    res.json({ nextCode });
  } catch (error) {
    console.error('Error generating next sale code:', error);
    res.status(500).json({ error: 'Erro ao gerar próximo código de venda' });
  }
});

// GET /api/sales/:id - Busca venda por ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar venda
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
    
    const sale = result.rows[0];
    
    // Buscar alunos associados à venda
    const studentsResult = await pool.query(
      `SELECT st.id, st.name, st.email, st.phone, st.cpf
       FROM student_sales ss
       INNER JOIN students st ON ss.student_id = st.id
       WHERE ss.sale_id = $1`,
      [id]
    );
    
    // Adicionar alunos à venda
    sale.students = studentsResult.rows;
    
    res.json(sale);
  } catch (error) {
    console.error('Error fetching sale:', error);
    res.status(500).json({ error: 'Erro ao buscar venda' });
  }
});

// POST /api/sales - Criar nova venda
router.post('/', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      sale_code, payer_name, payer_email, payer_phone, payer_cpf,
      total_amount, payment_method_id, sale_date, student_ids = []
    } = req.body;

    // Validação básica
    if (!sale_code || !payer_name || !total_amount) {
      return res.status(400).json({ error: 'Código da venda, nome do pagador e valor total são obrigatórios' });
    }

    // 1. Criar ou buscar aluno com os dados do pagador
    let studentId;
    const cpfClean = payer_cpf?.replace(/\D/g, '');
    
    if (cpfClean) {
      // Verificar se já existe aluno com este CPF
      const existingStudent = await client.query(
        'SELECT id FROM students WHERE cpf = $1',
        [cpfClean]
      );

      if (existingStudent.rows.length > 0) {
        studentId = existingStudent.rows[0].id;
        console.log('✅ Aluno existente encontrado (CPF):', studentId);
      } else {
        // Criar novo aluno
        const newStudent = await client.query(
          `INSERT INTO students (name, email, phone, cpf, active)
           VALUES ($1, $2, $3, $4, true)
           RETURNING id`,
          [payer_name, payer_email || null, payer_phone || null, cpfClean]
        );
        studentId = newStudent.rows[0].id;
        console.log('✅ Novo aluno criado com CPF:', studentId);
      }
    } else if (payer_email) {
      // Se não tem CPF mas tem email, verificar por email
      const existingStudent = await client.query(
        'SELECT id FROM students WHERE email = $1',
        [payer_email]
      );
      
      if (existingStudent.rows.length > 0) {
        studentId = existingStudent.rows[0].id;
        console.log('✅ Aluno existente encontrado (email):', studentId);
      } else {
        // Criar aluno com email mas sem CPF
        const newStudent = await client.query(
          `INSERT INTO students (name, email, phone, active)
           VALUES ($1, $2, $3, true)
           RETURNING id`,
          [payer_name, payer_email, payer_phone || null]
        );
        studentId = newStudent.rows[0].id;
        console.log('✅ Novo aluno criado (sem CPF):', studentId);
      }
    } else {
      // Criar aluno sem CPF e sem email (apenas nome e telefone)
      const newStudent = await client.query(
        `INSERT INTO students (name, phone, active)
         VALUES ($1, $2, true)
         RETURNING id`,
        [payer_name, payer_phone || null]
      );
      studentId = newStudent.rows[0].id;
      console.log('✅ Novo aluno criado (sem CPF e sem email):', studentId);
    }

    // 2. Criar a venda
    const result = await client.query(
      `INSERT INTO sales (
        sale_code, payer_name, payer_email, payer_phone, payer_cpf,
        total_amount, paid_amount, payment_method_id, payment_status, sale_date, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        sale_code, payer_name, payer_email, payer_phone, payer_cpf,
        total_amount, 0, payment_method_id, 'pending', sale_date || new Date(), req.body.notes
      ]
    );

    const saleId = result.rows[0].id;

    // 3. Associar aluno pagador à venda
    await client.query(
      `INSERT INTO student_sales (student_id, sale_id)
       VALUES ($1, $2)
       ON CONFLICT (student_id, sale_id) DO NOTHING`,
      [studentId, saleId]
    );

    // 4. Associar alunos adicionais (student_ids)
    if (student_ids && student_ids.length > 0) {
      for (const sid of student_ids) {
        if (sid !== studentId) { // Evitar duplicação com o pagador
          await client.query(
            `INSERT INTO student_sales (student_id, sale_id)
             VALUES ($1, $2)
             ON CONFLICT (student_id, sale_id) DO NOTHING`,
            [sid, saleId]
          );
        }
      }
      console.log('✅ Alunos adicionais associados:', student_ids);
    }

    await client.query('COMMIT');
    console.log('✅ Venda criada e alunos associados:', { saleId, studentId, additionalStudents: student_ids });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating sale:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Código de venda já existe' });
    }
    res.status(500).json({ error: 'Erro ao criar venda' });
  } finally {
    client.release();
  }
});

// PUT /api/sales/:id - Atualizar venda
router.put('/:id', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    console.log('\n=== BACKEND: UPDATE SALE ===');
    console.log('1. Sale ID:', id);
    console.log('2. Request body:', JSON.stringify(req.body, null, 2));
    
    const {
      sale_code, payer_name, payer_email, payer_phone, payer_cpf,
      total_amount, paid_amount, payment_method_id, payment_status, sale_date, student_ids = []
    } = req.body;

    console.log('3. paid_amount recebido:', paid_amount, 'tipo:', typeof paid_amount);
    console.log('4. payment_status recebido:', payment_status);
    console.log('5. student_ids recebido:', student_ids);

    // Garantir que paid_amount e total_amount sejam números válidos
    const paidAmountValue = paid_amount !== undefined && paid_amount !== null && paid_amount !== '' 
      ? parseFloat(paid_amount) 
      : 0;
    
    const totalAmountValue = parseFloat(total_amount);

    console.log('6. paidAmountValue processado:', paidAmountValue);
    console.log('7. totalAmountValue:', totalAmountValue);

    // Atualizar status automaticamente baseado no valor pago
    let finalStatus = payment_status || 'pending';
    if (paidAmountValue >= totalAmountValue && paidAmountValue > 0) {
      finalStatus = 'paid';
    } else if (paidAmountValue > 0 && paidAmountValue < totalAmountValue) {
      finalStatus = 'partial';
    } else if (paidAmountValue === 0) {
      finalStatus = 'pending';
    }

    console.log('8. finalStatus calculado:', finalStatus);
    console.log('9. Executando UPDATE no banco...');

    const result = await client.query(
      `UPDATE sales SET
        sale_code = $1, payer_name = $2, payer_email = $3, payer_phone = $4,
        payer_cpf = $5, total_amount = $6, paid_amount = $7, payment_method_id = $8, 
        payment_status = $9, sale_date = $10, notes = $11,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *`,
      [
        sale_code, payer_name, payer_email, payer_phone, payer_cpf,
        totalAmountValue, paidAmountValue, payment_method_id, finalStatus, sale_date, req.body.notes,
        id
      ]
    );

    console.log('10. Resultado do UPDATE:');
    console.log('   - paid_amount no banco:', result.rows[0]?.paid_amount);
    console.log('   - payment_status no banco:', result.rows[0]?.payment_status);
    console.log('   - total_amount no banco:', result.rows[0]?.total_amount);

    if (result.rows.length === 0) {
      console.error('11. ERRO: Venda não encontrada');
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    // Atualizar associações de alunos
    if (student_ids && Array.isArray(student_ids)) {
      console.log('12. Atualizando associações de alunos...');
      
      // Remover todas as associações antigas
      await client.query('DELETE FROM student_sales WHERE sale_id = $1', [id]);
      console.log('   - Associações antigas removidas');
      
      // Adicionar novas associações
      for (const studentId of student_ids) {
        await client.query(
          `INSERT INTO student_sales (student_id, sale_id)
           VALUES ($1, $2)
           ON CONFLICT (student_id, sale_id) DO NOTHING`,
          [studentId, id]
        );
      }
      console.log('   - Novas associações criadas:', student_ids);
    }

    await client.query('COMMIT');
    console.log('13. UPDATE concluído com sucesso!');
    console.log('=== FIM UPDATE SALE ===\n');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('=== ERRO NO UPDATE SALE ===');
    console.error('Error updating sale:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Erro ao atualizar venda' });
  } finally {
    client.release();
  }
});

// DELETE /api/sales/:id - Deletar venda
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se a venda tem alunos associados
    const studentsCheck = await pool.query(
      'SELECT COUNT(*) as count FROM student_sales WHERE sale_id = $1',
      [id]
    );
    
    if (parseInt(studentsCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir esta venda pois ela possui alunos associados' 
      });
    }
    
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
