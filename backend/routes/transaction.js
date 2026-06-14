const express = require("express");
const { body, validationResult } = require("express-validator");
const { run } = require("../goRunner");
const TxLog  = require("../models/TxLog");
const crypto = require("crypto");

const router = express.Router();

function validate(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return false; }
  return true;
}

// ── POST /api/transaction/send ────────────────────────────────────────────────
router.post(
  "/send",
  body("from").notEmpty().withMessage("from address required"),
  body("to").notEmpty().withMessage("to address required"),
  body("amount").isInt({ min: 1 }).withMessage("amount must be a positive integer"),
  async (req, res) => {
    if (!validate(req, res)) return;
    const { from, to, amount, mine } = req.body;
    const args = ["send", "-from", from, "-to", to, "-amount", String(amount)];
    if (mine) args.push("-mine");

    const txid = crypto.randomBytes(16).toString("hex");

    // Log as pending
    const log = await TxLog.create({ txid, from, to, amount, mined: !!mine, status: "pending" });

    try {
      const { stdout, stderr } = await run(args);
      if (stdout.toLowerCase().includes("success")) {
        log.status = "success"; log.raw = stdout;
        await log.save();
        res.json({ success: true, message: stdout, rawOutput: stdout, txid, backendTrace: [{ file: "cli_send.go", fn: "send" }] });
      } else {
        log.status = "failed"; log.raw = stderr || stdout;
        await log.save();
        res.status(400).json({ success: false, error: stderr || stdout });
      }
    } catch (err) {
      log.status = "failed"; log.raw = err.message;
      await log.save();
      res.status(500).json({ error: err.message });
    }
  }
);

// ── GET /api/transaction/history ──────────────────────────────────────────────
router.get("/history", async (req, res) => {
  try {
    const { address, page = 1, limit = 20 } = req.query;
    const filter = address ? { $or: [{ from: address }, { to: address }] } : {};
    const total  = await TxLog.countDocuments(filter);
    const docs   = await TxLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    // Map to ApiTx shape expected by the frontend (camelCase txId)
    const transactions = docs.map((t) => ({
      txId: t.txid,
      from: t.from,
      to: t.to,
      amount: t.amount,
      timestamp: t.createdAt,
      nodeId: process.env.NODE_ID || "3000",
    }));

    res.json({ success: true, transactions, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
