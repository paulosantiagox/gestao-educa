import express from "express";
import { pool } from "../db.js";
import { requireAuth } from "../requireAuth.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = express.Router();

// Criar novo usuário
router.post("/", requireAuth, async (req, res) => {
  const { email, name, password, role = "admin" } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "missing_fields" });
  const pass_hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await pool.query(
      "INSERT INTO users(email,name,pass_hash,role) VALUES ($1,$2,$3,$4) RETURNING id,email,name,role",
      [email, name || null, pass_hash, role]
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
    "SELECT id, email, name, role, active, created_at FROM users ORDER BY id DESC"
  );
  res.json({ ok: true, users: rows });
});

export default router;
