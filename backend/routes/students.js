import express from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../requireAuth.js';

const router = express.Router();

// GET /api/students - Lista alunos com paginação e busca
router.get('/', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, q = '' } = req.query;
    const offset = (page - 1) * limit;

    const searchQuery = `%${q}%`;
    
    const result = await pool.query(
      `SELECT * FROM students 
       WHERE name ILIKE $1 OR email ILIKE $1 OR cpf ILIKE $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [searchQuery, limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM students 
       WHERE name ILIKE $1 OR email ILIKE $1 OR cpf ILIKE $1`,
      [searchQuery]
    );

    res.json({
      students: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Erro ao buscar alunos' });
  }
});

// GET /api/students/with-sales - Lista apenas alunos que têm vendas associadas
router.get('/with-sales', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10000, q = '' } = req.query;
    const offset = (page - 1) * limit;
    const searchQuery = `%${q}%`;
    
    const result = await pool.query(
      `SELECT DISTINCT s.* FROM students s
       INNER JOIN student_sales ss ON s.id = ss.student_id
       WHERE s.name ILIKE $1 OR s.email ILIKE $1 OR s.cpf ILIKE $1
       ORDER BY s.created_at DESC
       LIMIT $2 OFFSET $3`,
      [searchQuery, limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(DISTINCT s.id) FROM students s
       INNER JOIN student_sales ss ON s.id = ss.student_id
       WHERE s.name ILIKE $1 OR s.email ILIKE $1 OR s.cpf ILIKE $1`,
      [searchQuery]
    );

    res.json({
      students: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching students with sales:', error);
    res.status(500).json({ error: 'Erro ao buscar alunos com vendas' });
  }
});

// GET /api/students/:id - Busca aluno por ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM students WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ error: 'Erro ao buscar aluno' });
  }
});

// POST /api/students - Criar novo aluno
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      name, email, phone, cpf, birth_date,
      zip_code, street, number, complement,
      neighborhood, city, state,
      documents_link
    } = req.body;

    // Validação básica
    if (!name || !email || !cpf) {
      return res.status(400).json({ error: 'Nome, email e CPF são obrigatórios' });
    }

    // Verificar se já existe aluno com este CPF
    if (cpf) {
      const cpfCheck = await pool.query(
        'SELECT id FROM students WHERE cpf = $1',
        [cpf.replace(/\D/g, '')]
      );
      if (cpfCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Já existe um aluno cadastrado com este CPF' });
      }
    }

    const result = await pool.query(
      `INSERT INTO students (
        name, email, phone, cpf, birth_date,
        zip_code, street, number, complement,
        neighborhood, city, state,
        documents_link
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        name, email, phone, cpf, birth_date,
        zip_code, street, number, complement,
        neighborhood, city, state,
        documents_link
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating student:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'CPF ou email já cadastrado' });
    }
    res.status(500).json({ error: 'Erro ao criar aluno' });
  }
});

// PUT /api/students/:id - Atualizar aluno
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, email, phone, cpf, birth_date,
      zip_code, street, number, complement,
      neighborhood, city, state,
      documents_link, active
    } = req.body;

    // Verificar se já existe outro aluno com este CPF
    if (cpf) {
      const cpfCheck = await pool.query(
        'SELECT id FROM students WHERE cpf = $1 AND id != $2',
        [cpf.replace(/\D/g, ''), id]
      );
      if (cpfCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Já existe outro aluno cadastrado com este CPF' });
      }
    }

    const result = await pool.query(
      `UPDATE students SET
        name = $1, email = $2, phone = $3, cpf = $4, birth_date = $5,
        zip_code = $6, street = $7, number = $8,
        complement = $9, neighborhood = $10, city = $11, state = $12,
        documents_link = $13, active = $14,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $15
      RETURNING *`,
      [
        name, email, phone, cpf, birth_date,
        zip_code, street, number,
        complement, neighborhood, city, state,
        documents_link, active,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ error: 'Erro ao atualizar aluno' });
  }
});

// DELETE /api/students/:id - Deletar aluno
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM students WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }
    
    res.json({ message: 'Aluno deletado com sucesso' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ error: 'Erro ao deletar aluno' });
  }
});

export default router;
