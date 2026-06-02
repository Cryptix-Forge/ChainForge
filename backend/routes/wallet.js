const express = require("express");
const { run } = require("../goRunner");
const Wallet  = require("../models/Wallet");

const router = express.Router();

// ── GET /api/wallet/list ──────────────────────────────────────────────────────
router.get("/list", async (_req, res) => {
  try {
    const { stdout } = await run(["listaddresses"]);
    const liveAddresses = stdout.split("\n").map((a) => a.trim()).filter(Boolean);

    // Sync new addresses into MongoDB
    await Promise.all(
      liveAddresses.map((address) =>
        Wallet.findOneAndUpdate({ address }, { address }, { upsert: true, new: true, setDefaultsOnInsert: true })
      )
    );

    const wallets = await Wallet.find({ address: { $in: liveAddresses } }).sort({ createdAt: -1 }).lean();
    res.json({ addresses: liveAddresses, wallets, count: liveAddresses.length });
  } catch (err) {
    // fallback: serve MongoDB records
    try {
      const wallets = await Wallet.find().sort({ createdAt: -1 }).lean();
      if (wallets.length) {
        return res.json({ addresses: wallets.map((w) => w.address), wallets, count: wallets.length, cached: true });
      }
    } catch (_) {}
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/wallet/create ───────────────────────────────────────────────────
router.post("/create", async (_req, res) => {
  try {
    const { stdout } = await run(["createwallet"]);
    const match   = stdout.match(/Your new address:\s*(\S+)/);
    const address = match ? match[1] : stdout.trim();

    await Wallet.findOneAndUpdate({ address }, { address }, { upsert: true, new: true, setDefaultsOnInsert: true });

    res.json({ success: true, address });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/wallet/balance/:address ─────────────────────────────────────────
router.get("/balance/:address", async (req, res) => {
  const { address } = req.params;
  if (!address) return res.status(400).json({ error: "address required" });
  try {
    const { stdout } = await run(["getbalance", "-address", address]);
    const match   = stdout.match(/Balance of '.*?':\s*(\d+)/);
    const balance = match ? parseInt(match[1]) : 0;
    res.json({ address, balance, raw: stdout });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/wallet/:address/label ─────────────────────────────────────────
router.patch("/:address/label", async (req, res) => {
  const { address } = req.params;
  const { label }   = req.body;
  try {
    const wallet = await Wallet.findOneAndUpdate({ address }, { label }, { new: true });
    if (!wallet) return res.status(404).json({ error: "Wallet not found" });
    res.json({ success: true, wallet });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
