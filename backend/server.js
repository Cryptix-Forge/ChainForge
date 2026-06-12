require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./db");

const blockchainRoutes  = require("./routes/blockchain");
const walletRoutes      = require("./routes/wallet");
const transactionRoutes = require("./routes/transaction");

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Connect MongoDB ───────────────────────────────────────────────────────────
connectDB();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/blockchain",  blockchainRoutes);
app.use("/api/wallet",      walletRoutes);
app.use("/api/transaction", transactionRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Error handlers ────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Route not found" }));
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error", message: err.message });
});

app.listen(PORT, () => {
  console.log(`\n🔗 ChainForge API  →  http://localhost:${PORT}`);
  console.log(`   NODE_ID: ${process.env.NODE_ID || "3000"}\n`);
});

module.exports = app;
