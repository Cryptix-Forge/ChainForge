require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./db");

const blockchainRoutes  = require("./routes/blockchain");
const walletRoutes      = require("./routes/wallet");
const transactionRoutes = require("./routes/transaction");
const systemRoutes      = require("./routes/system");

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Connect MongoDB ───────────────────────────────────────────────────────────
connectDB();

// ── Middleware ────────────────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : []),
];
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/blockchain",  blockchainRoutes);
app.use("/api/wallet",      walletRoutes);
app.use("/api/transaction", transactionRoutes);

// System routes: /api/health, /api/mine/block, /api/utxo/reindex,
// /api/node/status, /api/reset
app.use("/api", systemRoutes);

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
