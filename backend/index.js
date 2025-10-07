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
import webhook from "./routes/webhook.js";
import leads from "./routes/leads.js";
import tracking from "./routes/tracking.js";
import redirect from "./routes/redirect.js";
import consultoresRedirectRoutes from "./routes/consultores-redirect.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// middlewares globais
app.use(cors({
  origin: [
    "http://localhost:8080",
    "https://sistema-educa.autoflixtreinamentos.com",
    "https://gestao-educa.autoflixtreinamentos.com",
    "https://42a90389-1914-4013-8ede-b39eed274805.lovableproject.com",
    "https://connect-my-rest.lovable.app",
    "https://sistema-educa.lovable.app",
    "https://ejaeducabrasil.com",
    "http://localhost:8000",
    /\.lovableproject\.com$/,
    /\.lovable\.app$/,
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Rotas da API
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
app.use("/api/webhook", webhook);
app.use("/api/leads", leads);
app.use("/api/tracking", tracking);
app.use("/api/public", redirect);
app.use("/api/consultores-redirect", consultoresRedirectRoutes);

// Rotas sem /api/ que retornam JSON (REMOVER ESTAS)
// app.use("/consultores-redirect", consultoresRedirectRoutes);
// app.use("/users", users);
// app.use("/students", students);
// app.use("/sales", sales);
// app.use("/certifiers", certifiers);
// app.use("/payment-methods", paymentMethods);
// app.use("/certification", certification);
// app.use("/dashboard", dashboard);
// app.use("/certification-sla", certificationSLA);
// app.use("/payments", payments);
// app.use("/auth", auth);

// healthcheck
app.get("/api/ping", (_req, res) => res.json({ ok: true }));

// ===== ARQUIVOS PÚBLICOS (ANTES do front estático) =====
const publicDir = path.resolve(__dirname, "public");
app.use('/api/tracking/script.js', express.static(path.join(publicDir, 'tracking-script.js')));

// Middleware para debug de rotas
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// ===== FRONT ESTÁTICO (DEPOIS da API) =====
const dist = path.resolve(__dirname, "../client/dist");
app.use(express.static(dist));

// catch-all que **não** pega /api/*
app.get(/^\/(?!api\/).*/, (_req, res) => {
  res.sendFile(path.join(dist, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API UP :${PORT}`));
