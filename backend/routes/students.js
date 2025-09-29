import express from 'express';
import { pool } from './db.js';
import { requireAuth } from './requireAuth.js';

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
      address_street, address_number, address_complement,
      address_neighborhood, address_city, address_state,
      address_zip, documents_link
    } = req.body;

    // Validação básica
    if (!name || !email || !cpf) {
      return res.status(400).json({ error: 'Nome, email e CPF são obrigatórios' });
    }

    const result = await pool.query(
      `INSERT INTO students (
        name, email, phone, cpf, birth_date,
        address_street, address_number, address_complement,
        address_neighborhood, address_city, address_state,
        address_zip, documents_link
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        name, email, phone, cpf, birth_date,
        address_street, address_number, address_complement,
        address_neighborhood, address_city, address_state,
        address_zip, documents_link
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
      address_street, address_number, address_complement,
      address_neighborhood, address_city, address_state,
      address_zip, documents_link, active
    } = req.body;

    const result = await pool.query(
      `UPDATE students SET
        name = $1, email = $2, phone = $3, cpf = $4, birth_date = $5,
        address_street = $6, address_number = $7, address_complement = $8,
        address_neighborhood = $9, address_city = $10, address_state = $11,
        address_zip = $12, documents_link = $13, active = $14,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $15
      RETURNING *`,
      [
        name, email, phone, cpf, birth_date,
        address_street, address_number, address_complement,
        address_neighborhood, address_city, address_state,
        address_zip, documents_link, active,
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
