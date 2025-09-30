import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "change_me";

export function requireAuth(req, res, next) {
  try {
    const t = req.cookies?.token;
    if (!t) return res.status(401).json({ error: "unauthenticated" });
    jwt.verify(t, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "unauthenticated" });
  }
}

export default requireAuth;
