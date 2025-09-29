import express from 'express';
import { pool } from '../db.js';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "change_me";

const requireAuth = (req, res, next) => {
  const hdr = req.headers.authorization;
  const t = req.cookies?.token || (hdr?.startsWith("Bearer ") ? hdr.slice(7) : null);
  try { if (!t) throw 0; jwt.verify(t, JWT_SECRET); next(); } catch { return res.status(401).json({ error: "unauthenticated" }); }
};

// GET /api/certification-sla - Buscar configurações de SLA
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM certification_sla ORDER BY id'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching SLA config:', error);
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

// PUT /api/certification-sla - Atualizar configurações de SLA
router.put('/', requireAuth, async (req, res) => {
  try {
    const updates = req.body; // Array de { status, days_limit, warning_days }
    
    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'Dados inválidos' });
    }

    const results = [];
    for (const update of updates) {
      const { status, days_limit, warning_days } = update;
      
      const { rows } = await pool.query(
        `INSERT INTO certification_sla (status, days_limit, warning_days)
         VALUES ($1, $2, $3)
         ON CONFLICT (status) 
         DO UPDATE SET 
           days_limit = EXCLUDED.days_limit,
           warning_days = EXCLUDED.warning_days,
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [status, days_limit, warning_days]
      );
      
      results.push(rows[0]);
    }

    res.json(results);
  } catch (error) {
    console.error('Error updating SLA config:', error);
    res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
});

export { router as certificationSLA };
export default router;
