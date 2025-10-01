import express from "express";
import pool from "../db.js";
import requireAuth from "../requireAuth.js";

const router = express.Router();

// Validação de CPF
function isValidCPF(cpf) {
  if (!cpf) return false;
  cpf = cpf.replace(/[^\d]/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf.charAt(i)) * (10 - i);
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cpf.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf.charAt(i)) * (11 - i);
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cpf.charAt(10))) return false;
  
  return true;
}

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

    // Validar token
    const settingsRes = await client.query("SELECT webhook_token FROM webhook_settings LIMIT 1");
    if (!settingsRes.rows.length) {
      throw new Error("Webhook não configurado");
    }

    const validToken = settingsRes.rows[0].webhook_token;
    const receivedToken = req.body.token || req.headers["x-webhook-token"];

    if (receivedToken !== validToken) {
      await client.query(
        `UPDATE webhook_logs SET processing_status = $1, error_message = $2, response_status = $3 
         WHERE id = $4`,
        ["error", "Token inválido", 401, logId]
      );
      return res.status(401).json({ 
        ok: false, 
        error: "Token inválido" 
      });
    }

    // Validar dados obrigatórios
    const { sale } = req.body;
    if (!sale) {
      throw new Error("Campo 'sale' é obrigatório");
    }

    const { sale_code, total_amount, payment_method, payer } = sale;
    
    if (!sale_code || !total_amount || !payer) {
      throw new Error("Campos obrigatórios: sale_code, total_amount, payer");
    }

    if (!payer.name || !payer.email) {
      throw new Error("Nome e email do pagador são obrigatórios");
    }

    if (!isValidEmail(payer.email)) {
      throw new Error("Email do pagador inválido");
    }

    if (payer.cpf && !isValidCPF(payer.cpf)) {
      throw new Error("CPF do pagador inválido");
    }

    await client.query("BEGIN");

    // 1. Criar/buscar aluno com dados do pagador
    let studentId;
    const cpfClean = payer.cpf ? payer.cpf.replace(/[^\d]/g, "") : null;

    // Verificar se aluno já existe
    let existingStudent;
    if (cpfClean) {
      existingStudent = await client.query(
        "SELECT id FROM students WHERE cpf = $1 LIMIT 1",
        [cpfClean]
      );
    }
    
    if (!existingStudent?.rows.length && payer.email) {
      existingStudent = await client.query(
        "SELECT id FROM students WHERE email = $1 LIMIT 1",
        [payer.email]
      );
    }

    if (existingStudent?.rows.length) {
      studentId = existingStudent.rows[0].id;
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

    // 3. Criar venda
    const saleResult = await client.query(
      `INSERT INTO sales 
       (sale_code, payer_name, payer_email, payer_phone, payer_cpf, total_amount, payment_method_id, payment_status, sale_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        sale_code,
        payer.name,
        payer.email,
        payer.phone || null,
        cpfClean,
        total_amount,
        paymentMethodId,
        "pending",
        sale.sale_date || new Date()
      ]
    );
    const saleId = saleResult.rows[0].id;

    // 4. Associar aluno principal à venda
    await client.query(
      "INSERT INTO student_sales (student_id, sale_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [studentId, saleId]
    );

    // 5. Processar alunos adicionais (se houver)
    const additionalStudents = sale.students || [];
    const createdStudentIds = [studentId];

    for (const student of additionalStudents) {
      if (!student.name || !student.email) continue;
      if (!isValidEmail(student.email)) continue;
      if (student.cpf && !isValidCPF(student.cpf)) continue;

      const studentCpfClean = student.cpf ? student.cpf.replace(/[^\d]/g, "") : null;

      // Verificar se já existe
      let existingAdditional;
      if (studentCpfClean) {
        existingAdditional = await client.query(
          "SELECT id FROM students WHERE cpf = $1 LIMIT 1",
          [studentCpfClean]
        );
      }

      if (!existingAdditional?.rows.length) {
        existingAdditional = await client.query(
          "SELECT id FROM students WHERE email = $1 LIMIT 1",
          [student.email]
        );
      }

      let additionalStudentId;
      if (existingAdditional?.rows.length) {
        additionalStudentId = existingAdditional.rows[0].id;
      } else {
        const additionalResult = await client.query(
          `INSERT INTO students (name, email, phone, cpf)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [student.name, student.email, student.phone || null, studentCpfClean]
        );
        additionalStudentId = additionalResult.rows[0].id;
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
    console.error("Erro no webhook:", error);

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

// GET /api/webhook/logs - Listar logs (autenticado)
router.get("/logs", requireAuth, async (req, res) => {
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

// GET /api/webhook/settings - Buscar configurações (autenticado)
router.get("/settings", requireAuth, async (req, res) => {
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

// POST /api/webhook/settings/regenerate-token - Regenerar token (autenticado)
router.post("/settings/regenerate-token", requireAuth, async (req, res) => {
  try {
    const crypto = await import("crypto");
    const newToken = crypto.randomBytes(32).toString("hex");

    const result = await pool.query(
      `UPDATE webhook_settings 
       SET webhook_token = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = (SELECT id FROM webhook_settings LIMIT 1)
       RETURNING *`,
      [newToken]
    );

    res.json({ ok: true, data: result.rows[0] });
  } catch (error) {
    console.error("Erro ao regenerar token:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

export default router;
