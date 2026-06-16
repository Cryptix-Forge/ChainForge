const express = require("express");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { run, NODE_ID } = require("../goRunner");
const Block     = require("../models/Block");
const Wallet    = require("../models/Wallet");
const TxLog     = require("../models/TxLog");
const Fork      = require("../models/Fork");
const MempoolTx = require("../models/MempoolTx");

const router = express.Router();

// GO_ROOT — where the Go binary reads/writes blockchain_<NODE_ID>.db and
// wallet_<NODE_ID>.dat (cwd used by goRunner.run, mounted at /go-root in Docker —
// must match goRunner.js's own GO_ROOT resolution, including the env override)
const GO_ROOT   = process.env.GO_ROOT || path.resolve(__dirname, "..", "..");
const DB_FILE   = path.join(GO_ROOT, `blockchain_${NODE_ID}.db`);
const WALLET_FILE = path.join(GO_ROOT, `wallet_${NODE_ID}.dat`);

// ── POST /api/mine/block ───────────────────────────────────────────────────────
// Mines a real block via the Go binary's `mine -address ADDR` command, which
// creates a coinbase transaction paying the 10-coin reward to `minerAddress`.
router.post("/mine/block", async (req, res) => {
  const { minerAddress } = req.body || {};
  if (!minerAddress) {
    return res.status(400).json({ success: false, error: "minerAddress is required" });
  }

  if (!fs.existsSync(DB_FILE)) {
    return res.json({
      success: false,
      minerAddress,
      newBalance: null,
      rawOutput: "",
      backendTrace: [{ file: "cli_mine.go", fn: "mineBlock" }],
      error: "No blockchain found",
      hint: "Use Block Explorer → Create Blockchain first to mint the genesis block.",
    });
  }

  try {
    const { stdout, stderr } = await run(["mine", "-address", minerAddress]);

    const cliError = stdout.match(/^CLI_ERROR:(.+)$/m);
    if (cliError) {
      return res.json({
        success: false,
        minerAddress,
        newBalance: null,
        rawOutput: stdout,
        backendTrace: [{ file: "cli_mine.go", fn: "mineBlock" }],
        error: cliError[1].trim(),
      });
    }

    if (stdout.toLowerCase().includes("success")) {
      // Sync the new block into MongoDB
      try {
        const { stdout: chainOut } = await run(["printchain"]);
        const { parseChain, toDbBlock } = require("./blockchain")._internals || {};
        if (parseChain && toDbBlock) {
          const blocks = parseChain(chainOut);
          await Promise.all(
            blocks.map((b) =>
              Block.findOneAndUpdate({ hash: b.hash }, toDbBlock(b), { upsert: true, new: true, setDefaultsOnInsert: true })
            )
          );
        }
      } catch (_) {}

      // Fetch updated balance
      let newBalance = null;
      try {
        const { stdout: balOut } = await run(["getbalance", "-address", minerAddress]);
        const match = balOut.match(/Balance of '.*?':\s*(\d+)/);
        newBalance = match ? parseInt(match[1]) : null;
      } catch (_) {}

      return res.json({
        success: true,
        minerAddress,
        newBalance,
        rawOutput: stdout,
        backendTrace: [{ file: "cli_mine.go", fn: "mineBlock" }],
      });
    }

    return res.json({
      success: false,
      minerAddress,
      newBalance: null,
      rawOutput: stdout,
      backendTrace: [{ file: "cli_mine.go", fn: "mineBlock" }],
      error: stderr || stdout || "Mining failed",
    });
  } catch (err) {
    return res.json({
      success: false,
      minerAddress,
      newBalance: null,
      rawOutput: "",
      backendTrace: [{ file: "cli_mine.go", fn: "mineBlock" }],
      error: err.message,
    });
  }
});

// ── POST /api/utxo/reindex ─────────────────────────────────────────────────────
router.post("/utxo/reindex", async (_req, res) => {
  try {
    const { stdout } = await run(["reindexutxo"]);
    const match = stdout.match(/(\d+) transactions/);
    const count = match ? parseInt(match[1]) : null;
    res.json({ success: true, transactionCount: count, rawOutput: stdout });
  } catch (err) {
    res.status(500).json({ success: false, transactionCount: null, error: err.message });
  }
});

// ── GET /api/node/status ───────────────────────────────────────────────────────
router.get("/node/status", async (_req, res) => {
  try {
    const { stdout } = await run(["listaddresses"]);
    const addresses = stdout.split("\n").map((a) => a.trim()).filter(Boolean);
    res.json({
      success: true,
      nodeId: NODE_ID,
      address: addresses[0] || "",
      mempoolSize: 0, // no mempool concept in this CLI-driven setup
      status: "online",
    });
  } catch (err) {
    res.json({
      success: false,
      nodeId: NODE_ID,
      address: "",
      mempoolSize: 0,
      status: "offline",
    });
  }
});

// ── POST /api/reset ─────────────────────────────────────────────────────────────
// Deletes blockchain_<NODE_ID>.db and wallet_<NODE_ID>.dat from disk, and clears
// all related MongoDB collections (Blocks, Wallets, TxLogs).
router.post("/reset", async (_req, res) => {
  const removed = [];
  try {
    if (fs.existsSync(DB_FILE)) {
      fs.unlinkSync(DB_FILE);
      removed.push(path.basename(DB_FILE));
    }
    if (fs.existsSync(WALLET_FILE)) {
      fs.unlinkSync(WALLET_FILE);
      removed.push(path.basename(WALLET_FILE));
    }

    await Promise.all([
      Block.deleteMany({}),
      Wallet.deleteMany({}),
      TxLog.deleteMany({}),
      Fork.deleteMany({}),
      MempoolTx.deleteMany({}),
    ]);

    res.json({
      success: true,
      message: removed.length
        ? `Removed ${removed.join(", ")} and cleared MongoDB collections.`
        : "No on-disk chain/wallet files existed. Cleared MongoDB collections.",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/health ─────────────────────────────────────────────────────────────
router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    nodeId: NODE_ID,
    timestamp: Date.now(),
    mongoOnline: mongoose.connection.readyState === 1,
  });
});

module.exports = router;
