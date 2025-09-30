// server/index.js
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

import auth from "./routes/auth.js";
import users from "./routes/users.js";
import certifiers from "./routes/certifiers.js";
import paymentMethods from "./routes/payment-methods.js";
import students from "./routes/students.js";
import sales from "./routes/sales.js";
import studentSales from "./routes/student-sales.js";
import payments from "./routes/payments.js";
import certification from "./routes/certification.js";
import dashboard from "./routes/dashboard.js";
import certificationSLA from "./routes/certification-sla.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// middlewares globais
app.use(cors({
  origin: [
    "http://localhost:8080",
    "https://sistema-educa.autoflixtreinamentos.com",
    "https://42a90389-1914-4013-8ede-b39eed274805.lovableproject.com",
    "https://connect-my-rest.lovable.app",
  ],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// ===== ROTAS DA API (sempre ANTES do static) =====
app.use("/api/auth", auth);
app.use("/api/users", users);
app.use("/api/certifiers", certifiers);
app.use("/api/payment-methods", paymentMethods);
app.use("/api/students", students);
app.use("/api/sales", sales);
app.use("/api/student-sales", studentSales);
app.use("/api/payments", payments);
app.use("/api/certification", certification);
app.use("/api/dashboard", dashboard);
app.use("/api/certification-sla", certificationSLA);

// healthcheck
app.get("/api/ping", (_req, res) => res.json({ ok: true }));

// ===== FRONT ESTÁTICO (DEPOIS da API) =====
const dist = path.resolve(__dirname, "../client/dist");
app.use(express.static(dist));

// catch-all que **não** pega /api/*
app.get(/^\/(?!api\/).*/, (_req, res) => {
  res.sendFile(path.join(dist, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API UP :${PORT}`));
