import express from "express";
import pool from "../db.js";
import requireAuth from "../requireAuth.js";

const router = express.Router();

// Função de validação de CPF removida - permitindo CPFs duplicados

// Validação de email
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// POST /api/webhook/sale - Receber webhook de venda
router.post("/sale", async (req, res) => {
  const client = await pool.connect();
  const ip_address = req.ip || req.connection.remoteAddress;
  const user_agent = req.get("user-agent") || "";
  let logId = null;

  try {
    // Log inicial da requisição
    const logResult = await client.query(
      `INSERT INTO webhook_logs (endpoint, method, headers, body, ip_address, user_agent, processing_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        "/api/webhook/sale",
        "POST",
        JSON.stringify(req.headers),
        JSON.stringify(req.body),
        ip_address,
        user_agent,
        "pending"
      ]
    );
    logId = logResult.rows[0].id;

    // Validar dados obrigatórios
    const { sale } = req.body;
    if (!sale) {
      throw new Error("Campo 'sale' é obrigatório");
    }

    const { sale_code, total_amount, paid_amount = 0, payment_method, payment_status, notes, payer } = sale;
    
    if (!sale_code || !total_amount || !payer) {
      throw new Error("Campos obrigatórios: sale_code, total_amount, payer");
    }

    if (!payer.name || !payer.email) {
      throw new Error("Nome e email do pagador são obrigatórios");
    }

    if (!isValidEmail(payer.email)) {
      throw new Error("Email do pagador inválido");
    }

    await client.query("BEGIN");

    // 1. Criar/buscar aluno com dados do pagador
    let studentId;
    const cpfClean = payer.cpf ? payer.cpf.replace(/[^\d]/g, "") : null;

    // Verificar se aluno já existe (apenas por email)
    const existingStudent = await client.query(
      "SELECT id FROM students WHERE email = $1 LIMIT 1",
      [payer.email]
    );

    if (existingStudent.rows.length) {
      studentId = existingStudent.rows[0].id;
      console.log(`✅ Aluno existente encontrado: ${studentId}`);
    } else {
      // Criar novo aluno
      const studentResult = await client.query(
        `INSERT INTO students 
         (name, email, phone, cpf, birth_date, zip_code, street, number, complement, neighborhood, city, state)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id`,
        [
          payer.name,
          payer.email,
          payer.phone || null,
          cpfClean,
          payer.birth_date || null,
          payer.address?.zip_code || null,
          payer.address?.street || null,
          payer.address?.number || null,
          payer.address?.complement || null,
          payer.address?.neighborhood || null,
          payer.address?.city || null,
          payer.address?.state || null
        ]
      );
      studentId = studentResult.rows[0].id;
      console.log(`✅ Novo aluno criado: ${studentId}`);
    }

    // 2. Buscar payment_method_id
    let paymentMethodId = null;
    if (payment_method) {
      const pmResult = await client.query(
        "SELECT id FROM payment_methods WHERE LOWER(type) = LOWER($1) OR LOWER(name) = LOWER($1) LIMIT 1",
        [payment_method]
      );
      if (pmResult.rows.length) {
        paymentMethodId = pmResult.rows[0].id;
      }
    }

    // 3. Calcular payment_status se não fornecido
    let finalPaymentStatus = payment_status;
    if (!finalPaymentStatus) {
      if (paid_amount <= 0) {
        finalPaymentStatus = "pending";
      } else if (paid_amount >= total_amount) {
        finalPaymentStatus = "paid";
      } else {
        finalPaymentStatus = "partial";
      }
    }

    // 4. Criar venda
    const saleResult = await client.query(
      `INSERT INTO sales 
       (sale_code, payer_name, payer_email, payer_phone, payer_cpf, total_amount, paid_amount, payment_method_id, payment_status, sale_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        sale_code,
        payer.name,
        payer.email,
        payer.phone || null,
        cpfClean,
        total_amount,
        paid_amount,
        paymentMethodId,
        finalPaymentStatus,
        sale.sale_date || new Date(),
        notes || null
      ]
    );
    const saleId = saleResult.rows[0].id;

    // 5. Associar aluno principal à venda
    await client.query(
      "INSERT INTO student_sales (student_id, sale_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [studentId, saleId]
    );

    // 6. Processar alunos adicionais (se houver)
    const additionalStudents = sale.students || [];
    const createdStudentIds = [studentId];

    for (const student of additionalStudents) {
      if (!student.name || !student.email) continue;
      if (!isValidEmail(student.email)) continue;

      const studentCpfClean = student.cpf ? student.cpf.replace(/[^\d]/g, "") : null;

      // Verificar se aluno já existe (apenas por email)
      const existingAdditional = await client.query(
        "SELECT id FROM students WHERE email = $1 LIMIT 1",
        [student.email]
      );

      let additionalStudentId;
      if (existingAdditional.rows.length) {
        additionalStudentId = existingAdditional.rows[0].id;
        console.log(`✅ Aluno adicional existente encontrado: ${additionalStudentId}`);
      } else {
        const additionalResult = await client.query(
          `INSERT INTO students (name, email, phone, cpf)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
           [student.name, student.email, student.phone || null, studentCpfClean]
        );
        additionalStudentId = additionalResult.rows[0].id;
        console.log(`✅ Novo aluno adicional criado: ${additionalStudentId}`);
      }

      createdStudentIds.push(additionalStudentId);

      // Associar à venda
      await client.query(
        "INSERT INTO student_sales (student_id, sale_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [additionalStudentId, saleId]
      );
    }

    await client.query("COMMIT");

    // Atualizar log com sucesso
    await client.query(
      `UPDATE webhook_logs 
       SET processing_status = $1, response_status = $2, created_sale_id = $3, created_student_id = $4,
           response_body = $5
       WHERE id = $6`,
      [
        "success",
        200,
        saleId,
        studentId,
        JSON.stringify({ ok: true, sale_id: saleId, student_ids: createdStudentIds }),
        logId
      ]
    );

    res.status(200).json({
      ok: true,
      sale_id: saleId,
      student_ids: createdStudentIds,
      message: "Venda e aluno(s) criado(s) com sucesso"
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Erro no webhook:", error.message);
    console.error("Stack:", error.stack);

    if (logId) {
      await client.query(
        `UPDATE webhook_logs 
         SET processing_status = $1, error_message = $2, response_status = $3, response_body = $4
         WHERE id = $5`,
        [
          "error",
          error.message,
          500,
          JSON.stringify({ ok: false, error: error.message }),
          logId
        ]
      );
    }

    res.status(500).json({
      ok: false,
      error: error.message
    });
  } finally {
    client.release();
  }
});

// GET /api/webhook/logs - Listar logs (público)
router.get("/logs", async (req, res) => {
  try {
    const { 
      start_date, 
      end_date, 
      status, 
      endpoint,
      page = 1,
      limit = 50 
    } = req.query;

    let query = `
      SELECT 
        wl.*,
        s.sale_code,
        st.name as student_name
      FROM webhook_logs wl
      LEFT JOIN sales s ON wl.created_sale_id = s.id
      LEFT JOIN students st ON wl.created_student_id = st.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (start_date) {
      paramCount++;
      query += ` AND wl.created_at >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      query += ` AND wl.created_at <= $${paramCount}`;
      params.push(end_date);
    }

    if (status) {
      paramCount++;
      query += ` AND wl.processing_status = $${paramCount}`;
      params.push(status);
    }

    if (endpoint) {
      paramCount++;
      query += ` AND wl.endpoint = $${paramCount}`;
      params.push(endpoint);
    }

    query += ` ORDER BY wl.created_at DESC`;

    // Pagination
    const offset = (page - 1) * limit;
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(limit);
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await pool.query(query, params);

    res.json({ ok: true, data: result.rows });
  } catch (error) {
    console.error("Erro ao buscar logs:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// DELETE /api/webhook/logs/:id - Deletar log específico (autenticado)
router.delete("/logs/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM webhook_logs WHERE id = $1", [id]);
    res.json({ ok: true });
  } catch (error) {
    console.error("Erro ao deletar log:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// POST /api/webhook/logs/cleanup - Limpeza manual de logs antigos (autenticado)
router.post("/logs/cleanup", requireAuth, async (req, res) => {
  try {
    const settingsRes = await pool.query(
      "SELECT log_retention_days FROM webhook_settings LIMIT 1"
    );
    
    const retentionDays = settingsRes.rows[0]?.log_retention_days || 30;
    
    const result = await pool.query(
      `DELETE FROM webhook_logs 
       WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
       RETURNING id`
    );

    res.json({ 
      ok: true, 
      deleted_count: result.rowCount,
      message: `${result.rowCount} logs antigos removidos`
    });
  } catch (error) {
    console.error("Erro ao limpar logs:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// GET /api/webhook/settings - Buscar configurações (público)
router.get("/settings", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM webhook_settings LIMIT 1");
    
    if (!result.rows.length) {
      // Criar configuração padrão se não existir
      const insertResult = await pool.query(
        "INSERT INTO webhook_settings (log_retention_days, auto_cleanup_enabled) VALUES (30, true) RETURNING *"
      );
      return res.json({ ok: true, data: insertResult.rows[0] });
    }

    res.json({ ok: true, data: result.rows[0] });
  } catch (error) {
    console.error("Erro ao buscar configurações:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// PUT /api/webhook/settings - Atualizar configurações (autenticado)
router.put("/settings", requireAuth, async (req, res) => {
  try {
    const { log_retention_days, auto_cleanup_enabled } = req.body;

    const result = await pool.query(
      `UPDATE webhook_settings 
       SET log_retention_days = $1, auto_cleanup_enabled = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = (SELECT id FROM webhook_settings LIMIT 1)
       RETURNING *`,
      [log_retention_days, auto_cleanup_enabled]
    );

    res.json({ ok: true, data: result.rows[0] });
  } catch (error) {
    console.error("Erro ao atualizar configurações:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

export default router;
