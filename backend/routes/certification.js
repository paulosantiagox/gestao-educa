import express from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../requireAuth.js';

const router = express.Router();

// GET /api/certification/student/:studentId - Busca processo de certificação
router.get('/student/:studentId', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const result = await pool.query(
      `SELECT cp.*, c.name as certifier_name, s.name as student_name
       FROM certification_process cp
       LEFT JOIN certifiers c ON cp.certifier_id = c.id
       LEFT JOIN students s ON cp.student_id = s.id
       WHERE cp.student_id = $1`,
      [studentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Processo de certificação não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching certification:', error);
    res.status(500).json({ error: 'Erro ao buscar certificação' });
  }
});

// POST /api/certification - Criar processo de certificação
router.post('/', requireAuth, async (req, res) => {
  try {
    const { student_id, certifier_id, wants_physical } = req.body;

    if (!student_id || !certifier_id) {
      return res.status(400).json({ error: 'ID do aluno e certificadora são obrigatórios' });
    }

    // Verifica se já existe processo
    const existingResult = await pool.query(
      'SELECT id FROM certification_process WHERE student_id = $1',
      [student_id]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Já existe processo de certificação para este aluno' });
    }

    const result = await pool.query(
      `INSERT INTO certification_process (student_id, certifier_id, wants_physical, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [student_id, certifier_id, wants_physical || false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating certification:', error);
    res.status(500).json({ error: 'Erro ao criar processo de certificação' });
  }
});

// PUT /api/certification/:studentId/status - Atualizar status
router.put('/:studentId/status', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { status, physical_tracking_code } = req.body;

    const validStatuses = [
      'pending', 'documents_sent', 'under_review', 'approved',
      'certificate_issued', 'certificate_sent', 'completed'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    // Primeiro busca o registro atual para verificar quais datas já existem
    const currentResult = await pool.query(
      'SELECT * FROM certification_process WHERE student_id = $1',
      [studentId]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Processo de certificação não encontrado' });
    }

    const current = currentResult.rows[0];

    // Monta a query de atualização baseada no status e nas datas existentes
    let updateQuery = 'UPDATE certification_process SET status = $1, updated_at = CURRENT_TIMESTAMP';
    const params = [status];
    let paramIndex = 2;

    // Atualiza a data específica apenas se ainda não existir
    if (status === 'documents_sent' && !current.documents_sent_at) {
      updateQuery += `, documents_sent_at = CURRENT_TIMESTAMP`;
    }
    if (status === 'under_review' && !current.under_review_at) {
      updateQuery += `, under_review_at = CURRENT_TIMESTAMP`;
    }
    if (status === 'approved' && !current.approval_date) {
      updateQuery += `, approval_date = CURRENT_TIMESTAMP`;
    }
    if (status === 'certificate_issued' && !current.certificate_issued_at) {
      updateQuery += `, certificate_issued_at = CURRENT_TIMESTAMP`;
    }
    if (status === 'certificate_sent' && !current.certificate_sent_at) {
      updateQuery += `, certificate_sent_at = CURRENT_TIMESTAMP`;
    }
    if (status === 'completed' && !current.completed_at) {
      updateQuery += `, completed_at = CURRENT_TIMESTAMP`;
    }

    // Adiciona código de rastreio se fornecido
    if (physical_tracking_code) {
      updateQuery += `, physical_tracking_code = $${paramIndex}`;
      params.push(physical_tracking_code);
      paramIndex++;
    }

    updateQuery += ` WHERE student_id = $${paramIndex} RETURNING *`;
    params.push(studentId);

    const result = await pool.query(updateQuery, params);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating certification status:', error);
    res.status(500).json({ error: 'Erro ao atualizar status de certificação' });
  }
});

// PUT /api/certification/:studentId/update - Atualizar dados do processo de certificação
router.put('/:studentId/update', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { certifier_id, wants_physical } = req.body;

    // Validação dos dados
    if (!certifier_id || isNaN(parseInt(certifier_id))) {
      return res.status(400).json({ error: 'ID da certificadora é obrigatório e deve ser um número válido' });
    }

    if (typeof wants_physical !== 'boolean') {
      return res.status(400).json({ error: 'Campo wants_physical deve ser um boolean' });
    }

    const result = await pool.query(
      `UPDATE certification_process 
       SET certifier_id = $1, wants_physical = $2, updated_at = CURRENT_TIMESTAMP
       WHERE student_id = $3
       RETURNING *`,
      [certifier_id, wants_physical, studentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Processo de certificação não encontrado' });
    }

    res.json({ ok: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating certification process:', error);
    res.status(500).json({ error: 'Erro ao atualizar processo de certificação' });
  }
});

export default router;
