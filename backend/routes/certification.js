import express from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../requireAuth.js';

import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

const SAO_PAULO_TZ = 'America/Sao_Paulo';
const DATE_FIELDS = [
  'created_at','updated_at',
  'enrolled_at','welcomed_at','exam_taken_at','exam_result_at','documents_sent_at',
  'requested_to_certifier_at','in_certification_at','digital_delivered_at',
  'physical_shipping_at','physical_delivered_at','completed_at','under_review_at',
  'exam_started_at','documents_requested_at','documents_under_review_at',
  'certification_started_at','digital_certificate_sent_at','physical_certificate_sent_at'
];

function fixTimestampsSP(row) {
  if (!row) return row;
  const out = { ...row };
  for (const key of DATE_FIELDS) {
    const val = out[key];
    if (!val) continue;
    try {
      // Reinterpreta o valor "Z" como horário local de SP e converte para UTC correto
      const naive = formatInTimeZone(new Date(val), 'UTC', "yyyy-MM-dd HH:mm:ss.SSS");
      const correctedUTC = fromZonedTime(naive, SAO_PAULO_TZ);
      out[key] = formatInTimeZone(correctedUTC, SAO_PAULO_TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
    } catch (e) {
      // Mantém original em caso de erro
    }
  }
  return out;
}

const router = express.Router();

// POST /api/certification/check-by-cpf - Busca processo por CPF (rota pública)
router.post('/check-by-cpf', async (req, res) => {
  try {
    const { cpf } = req.body;
    
    if (!cpf) {
      return res.status(400).json({ error: 'CPF é obrigatório' });
    }

    // Buscar aluno por CPF
    const studentResult = await pool.query(
      'SELECT * FROM students WHERE cpf = $1',
      [cpf.replace(/\D/g, '')]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }

    const student = studentResult.rows[0];

    // Buscar processo de certificação
    const certResult = await pool.query(
      `SELECT cp.*, c.name as certifier_name
       FROM certification_process cp
       LEFT JOIN certifiers c ON cp.certifier_id = c.id
       WHERE cp.student_id = $1`,
      [student.id]
    );

    if (certResult.rows.length === 0) {
      return res.status(404).json({ error: 'Processo de certificação não encontrado' });
    }

    res.json({
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        phone: student.phone,
        cpf: student.cpf
      },
      certification: fixTimestampsSP(certResult.rows[0])
    });
  } catch (error) {
    console.error('Error checking certification by CPF:', error);
    res.status(500).json({ error: 'Erro ao buscar certificação' });
  }
});

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

    res.json(fixTimestampsSP(result.rows[0]));
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
       VALUES ($1, $2, $3, 'welcome')
       RETURNING *`,
      [student_id, certifier_id, wants_physical || false]
    );

    res.status(201).json(fixTimestampsSP(result.rows[0]));
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
      'welcome', 'exam_in_progress', 'documents_requested', 'documents_under_review',
      'certification_started', 'digital_certificate_sent', 'physical_certificate_sent', 'completed'
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

    // Monta a query de atualização - SEMPRE atualiza a data do status atual
    let updateQuery = 'UPDATE certification_process SET status = $1, updated_at = CURRENT_TIMESTAMP';
    const params = [status];
    let paramIndex = 2;

    // SEMPRE atualiza a data específica quando o status for mudado
    if (status === 'welcome') {
      // welcome usa created_at como data de referência (não atualiza created_at)
    }
    if (status === 'exam_in_progress') {
      updateQuery += `, exam_started_at = CURRENT_TIMESTAMP`;
    }
    if (status === 'documents_requested') {
      updateQuery += `, documents_requested_at = CURRENT_TIMESTAMP`;
    }
    if (status === 'documents_under_review') {
      updateQuery += `, documents_under_review_at = CURRENT_TIMESTAMP`;
    }
    if (status === 'certification_started') {
      updateQuery += `, certification_started_at = CURRENT_TIMESTAMP`;
    }
    if (status === 'digital_certificate_sent') {
      updateQuery += `, digital_certificate_sent_at = CURRENT_TIMESTAMP`;
    }
    if (status === 'physical_certificate_sent') {
      updateQuery += `, physical_certificate_sent_at = CURRENT_TIMESTAMP`;
    }
    if (status === 'completed') {
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

    res.json(fixTimestampsSP(result.rows[0]));
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

    res.json({ ok: true, data: fixTimestampsSP(result.rows[0]) });
  } catch (error) {
    console.error('Error updating certification process:', error);
    res.status(500).json({ error: 'Erro ao atualizar processo de certificação' });
  }
});

// DELETE /api/certification/:studentId - Deletar processo de certificação
router.delete('/:studentId', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params;

    const result = await pool.query(
      'DELETE FROM certification_process WHERE student_id = $1 RETURNING *',
      [studentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Processo de certificação não encontrado' });
    }

    console.log('🗑️ Processo de certificação deletado:', { studentId, processId: result.rows[0].id });
    res.json({ ok: true, message: 'Processo de certificação deletado com sucesso' });
  } catch (error) {
    console.error('Error deleting certification process:', error);
    res.status(500).json({ error: 'Erro ao deletar processo de certificação' });
  }
});

export default router;
