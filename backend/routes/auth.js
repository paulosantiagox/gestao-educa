import { pool } from "../db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import express from "express";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "change_me";

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "missing_fields" });

    const { rows } = await pool.query(
      "SELECT id,email,pass_hash,name,role,active FROM users WHERE email=$1",
      [email]
    );
    const u = rows[0];
    if (!u || !u.active) return res.status(401).json({ error: "invalid_credentials" });

    const ok = await bcrypt.compare(password, u.pass_hash);
    if (!ok) return res.status(401).json({ error: "invalid_credentials" });

    const token = jwt.sign({ uid: u.id, role: u.role }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
      maxAge: 7 * 24 * 3600 * 1000,
    });
    return res.json({ ok: true, user: { id: u.id, email: u.email, name: u.name, role: u.role } });
  } catch (err) {
    console.error("AUTH_LOGIN_ERROR:", err?.stack || err);
    return res.status(500).json({ error: "internal_error" });
  }
});

router.post("/logout", (_req, res) => {
  res.clearCookie("token");
  res.json({ ok: true });
});

router.get("/me", (req, res) => {
  try {
    const t = req.cookies?.token;
    if (!t) return res.status(401).json({ error: "unauthenticated" });
    const p = jwt.verify(t, JWT_SECRET);
    return res.json({ ok: true, me: { id: p.uid, role: p.role } });
  } catch (err) {
    return res.status(401).json({ error: "unauthenticated" });
  }
});

export default router;
