const express   = require("express");
const { body, validationResult } = require("express-validator");
const crypto    = require("crypto");
const { run }   = require("../goRunner");
const MempoolTx = require("../models/MempoolTx");

const router = express.Router();

function validate(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return false; }
  return true;
}

// ── GET /api/mempool ──────────────────────────────────────────────────────────
router.get("/", async (_req, res) => {
  try {
    const pending   = await MempoolTx.find({ status: "pending" }).sort({ createdAt: -1 }).lean();
    const confirmed = await MempoolTx.find({ status: "confirmed" }).sort({ confirmedAt: -1 }).limit(10).lean();
    res.json({
      pending,
      confirmed,
      stats: {
        pendingCount: pending.length,
        pendingValue: pending.reduce((sum, tx) => sum + tx.amount, 0),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/mempool/submit ──────────────────────────────────────────────────
router.post(
  "/submit",
  body("from").notEmpty().withMessage("from address required"),
  body("to").notEmpty().withMessage("to address required"),
  body("amount").isInt({ min: 1 }).withMessage("amount must be a positive integer"),
  async (req, res) => {
    if (!validate(req, res)) return;
    const { from, to, amount } = req.body;
    try {
      const txid = crypto.randomBytes(16).toString("hex");
      const tx   = await MempoolTx.create({ from, to, amount, txid, status: "pending" });
      res.json({
        success: true,
        message: "Transaction added to mempool — waiting to be mined",
        tx,
        backendTrace: [
          { file: "models/MempoolTx.js", fn: "MempoolTx.create", note: "Persisted to MongoDB as pending — Go binary not called yet" },
        ],
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ── POST /api/mempool/mine ────────────────────────────────────────────────────
router.post(
  "/mine",
  body("minerAddress").notEmpty().withMessage("minerAddress required"),
  async (req, res) => {
    if (!validate(req, res)) return;
    const { minerAddress } = req.body;

    const pending = await MempoolTx.find({ status: "pending" }).sort({ createdAt: 1 });
    if (pending.length === 0) {
      return res.status(400).json({ error: "Mempool is empty — nothing to mine" });
    }

    const results = [];
    const trace   = [];

    // Process each pending tx sequentially — each becomes its own block
    for (const tx of pending) {
      const args = ["send", "-from", tx.from, "-to", tx.to, "-amount", String(tx.amount), "-mine"];
      trace.push({ file: "cli_send.go", fn: "send", command: args.join(" ") });
      try {
        const { stdout } = await run(args);
        const cliError = stdout.match(/^CLI_ERROR:(.+)$/m);
        if (cliError) throw new Error(cliError[1].trim());

        // Replace the placeholder id assigned at submit time with the real
        // on-chain txid so fork resolution can match this transaction back
        // to its block if it's ever orphaned.
        const idMatch = stdout.match(/^TXID:([a-f0-9]+)$/m);
        if (idMatch) tx.txid = idMatch[1];
        tx.status      = "confirmed";
        tx.confirmedAt = new Date();
        await tx.save();
        results.push({ id: String(tx._id), txid: tx.txid, from: tx.from, to: tx.to, amount: tx.amount, success: true, output: stdout });
      } catch (err) {
        tx.status = "rejected";
        tx.note   = err.message;
        await tx.save();
        results.push({ id: String(tx._id), txid: tx.txid, from: tx.from, to: tx.to, amount: tx.amount, success: false, error: err.message });
      }
    }

    // Mine coinbase block — reward goes to the miner
    trace.push({ file: "cli_mine.go", fn: "mineBlock", command: `mine -address ${minerAddress}` });
    try {
      await run(["mine", "-address", minerAddress]);
    } catch (_) {}

    res.json({ success: true, processed: results.length, results, trace });
  }
);

// ── DELETE /api/mempool/:id ───────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const tx = await MempoolTx.findById(req.params.id);
    if (!tx)                    return res.status(404).json({ error: "Transaction not found" });
    if (tx.status !== "pending") return res.status(400).json({ error: "Can only remove pending transactions" });
    tx.status = "rejected";
    await tx.save();
    res.json({ success: true, message: "Transaction removed from mempool" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
