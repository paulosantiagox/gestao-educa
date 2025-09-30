import express from "express";
import { pool } from "../db.js";
import { requireAuth } from "../requireAuth.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = express.Router();

// Criar novo usuário
router.post("/", requireAuth, async (req, res) => {
  const { email, name, password, role = "admin", avatar } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "missing_fields" });
  const pass_hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await pool.query(
      "INSERT INTO users(email,name,pass_hash,role,avatar) VALUES ($1,$2,$3,$4,$5) RETURNING id,email,name,role,avatar",
      [email, name || null, pass_hash, role, avatar || null]
    );
    res.status(201).json({ ok: true, user: rows[0] });
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "email_exists" });
    res.status(500).json({ error: "server_error" });
  }
});

// Listar todos os usuários
router.get("/", requireAuth, async (_req, res) => {
  const { rows } = await pool.query(
    "SELECT id, email, name, role, active, avatar, created_at FROM users ORDER BY id DESC"
  );
  res.json({ ok: true, users: rows });
});

// Deletar usuário
router.delete("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "user_not_found" });
    }
    res.json({ ok: true, message: "Usuário deletado com sucesso" });
  } catch (e) {
    console.error("Error deleting user:", e);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
