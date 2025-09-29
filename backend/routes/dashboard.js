import express from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/dashboard/stats - Estatísticas gerais
router.get('/stats', requireAuth, async (req, res) => {
  try {
    // Total de alunos ativos
    const studentsResult = await pool.query(
      'SELECT COUNT(*) as total FROM students WHERE active = true'
    );

    // Total de vendas e valores
    const salesResult = await pool.query(
      `SELECT 
        COUNT(*) as total_sales,
        SUM(total_amount) as total_revenue,
        SUM(paid_amount) as total_paid,
        COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_sales,
        COUNT(CASE WHEN payment_status = 'partial' THEN 1 END) as partial_sales,
        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_sales
       FROM sales`
    );

    // Processos de certificação por status
    const certificationResult = await pool.query(
      `SELECT 
        COUNT(*) as total_processes,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'documents_sent' THEN 1 END) as documents_sent,
        COUNT(CASE WHEN status = 'under_review' THEN 1 END) as under_review,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'certificate_issued' THEN 1 END) as certificate_issued,
        COUNT(CASE WHEN status = 'certificate_sent' THEN 1 END) as certificate_sent,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
       FROM certification_process`
    );

    // Vendas recentes (últimos 30 dias)
    const recentSalesResult = await pool.query(
      `SELECT COUNT(*) as recent_sales, SUM(total_amount) as recent_revenue
       FROM sales
       WHERE sale_date >= CURRENT_DATE - INTERVAL '30 days'`
    );

    res.json({
      students: {
        total: parseInt(studentsResult.rows[0].total)
      },
      sales: {
        total: parseInt(salesResult.rows[0].total_sales || 0),
        total_revenue: parseFloat(salesResult.rows[0].total_revenue || 0),
        total_paid: parseFloat(salesResult.rows[0].total_paid || 0),
        pending: parseInt(salesResult.rows[0].pending_sales || 0),
        partial: parseInt(salesResult.rows[0].partial_sales || 0),
        paid: parseInt(salesResult.rows[0].paid_sales || 0)
      },
      certification: {
        total: parseInt(certificationResult.rows[0].total_processes || 0),
        pending: parseInt(certificationResult.rows[0].pending || 0),
        documents_sent: parseInt(certificationResult.rows[0].documents_sent || 0),
        under_review: parseInt(certificationResult.rows[0].under_review || 0),
        approved: parseInt(certificationResult.rows[0].approved || 0),
        certificate_issued: parseInt(certificationResult.rows[0].certificate_issued || 0),
        certificate_sent: parseInt(certificationResult.rows[0].certificate_sent || 0),
        completed: parseInt(certificationResult.rows[0].completed || 0)
      },
      recent: {
        sales: parseInt(recentSalesResult.rows[0].recent_sales || 0),
        revenue: parseFloat(recentSalesResult.rows[0].recent_revenue || 0)
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

export default router;
