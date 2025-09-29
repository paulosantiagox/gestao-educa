import express from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// POST /api/student-sales - Associar aluno à venda
router.post('/', requireAuth, async (req, res) => {
  try {
    const { student_id, sale_id } = req.body;

    if (!student_id || !sale_id) {
      return res.status(400).json({ error: 'ID do aluno e da venda são obrigatórios' });
    }

    // Verifica se já existe associação
    const existingResult = await pool.query(
      'SELECT id FROM student_sales WHERE student_id = $1 AND sale_id = $2',
      [student_id, sale_id]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Aluno já associado a esta venda' });
    }

    const result = await pool.query(
      'INSERT INTO student_sales (student_id, sale_id) VALUES ($1, $2) RETURNING *',
      [student_id, sale_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating student-sale association:', error);
    res.status(500).json({ error: 'Erro ao associar aluno à venda' });
  }
});

// DELETE /api/student-sales - Remover associação
router.delete('/', requireAuth, async (req, res) => {
  try {
    const { student_id, sale_id } = req.body;

    const result = await pool.query(
      'DELETE FROM student_sales WHERE student_id = $1 AND sale_id = $2 RETURNING *',
      [student_id, sale_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Associação não encontrada' });
    }

    res.json({ message: 'Associação removida com sucesso' });
  } catch (error) {
    console.error('Error deleting student-sale association:', error);
    res.status(500).json({ error: 'Erro ao remover associação' });
  }
});

// GET /api/student-sales/sale/:saleId - Lista alunos de uma venda
router.get('/sale/:saleId', requireAuth, async (req, res) => {
  try {
    const { saleId } = req.params;
    
    const result = await pool.query(
      `SELECT s.* FROM students s
       INNER JOIN student_sales ss ON s.id = ss.student_id
       WHERE ss.sale_id = $1
       ORDER BY s.name ASC`,
      [saleId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching students by sale:', error);
    res.status(500).json({ error: 'Erro ao buscar alunos da venda' });
  }
});

// GET /api/student-sales/student/:studentId - Lista vendas de um aluno
router.get('/student/:studentId', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const result = await pool.query(
      `SELECT s.* FROM sales s
       INNER JOIN student_sales ss ON s.id = ss.sale_id
       WHERE ss.student_id = $1
       ORDER BY s.sale_date DESC`,
      [studentId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sales by student:', error);
    res.status(500).json({ error: 'Erro ao buscar vendas do aluno' });
  }
});

export default router;
