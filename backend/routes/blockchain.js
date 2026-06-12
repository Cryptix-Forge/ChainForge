const express = require("express");
const { body, validationResult } = require("express-validator");
const { run } = require("../goRunner");
const Block = require("../models/Block");

const router = express.Router();

function validate(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return false; }
  return true;
}

// ── GET /api/blockchain/chain ─────────────────────────────────────────────────
router.get("/chain", async (_req, res) => {
  try {
    const { stdout } = await run(["printchain"]);
    const blocks = parseChain(stdout);

    // Upsert each block into MongoDB
    await Promise.all(
      blocks.map((b) =>
        Block.findOneAndUpdate({ hash: b.hash }, b, { upsert: true, new: true, setDefaultsOnInsert: true })
      )
    );

    res.json({ blocks, count: blocks.length });
  } catch (err) {
    // Fallback: serve cached blocks from MongoDB
    try {
      const cached = await Block.find().sort({ height: 1 }).lean();
      if (cached.length) return res.json({ blocks: cached, count: cached.length, cached: true });
    } catch (_) {}
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/blockchain/height ────────────────────────────────────────────────
router.get("/height", async (_req, res) => {
  try {
    const { stdout } = await run(["printchain"]);
    const blocks = parseChain(stdout);
    res.json({ height: blocks.length - 1, totalBlocks: blocks.length });
  } catch (err) {
    // fallback to MongoDB
    const count = await Block.countDocuments();
    res.json({ height: count - 1, totalBlocks: count, cached: true });
  }
});

// ── POST /api/blockchain/create ───────────────────────────────────────────────
router.post(
  "/create",
  body("address").notEmpty().withMessage("address is required"),
  async (req, res) => {
    if (!validate(req, res)) return;
    const { address } = req.body;
    try {
      const { stdout } = await run(["createblockchain", "-address", address]);
      res.json({ success: true, message: stdout });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ── POST /api/blockchain/reindex ──────────────────────────────────────────────
router.post("/reindex", async (_req, res) => {
  try {
    const { stdout } = await run(["reindexutxo"]);
    const match = stdout.match(/(\d+) transactions/);
    const count = match ? parseInt(match[1]) : null;
    res.json({ success: true, message: stdout, utxoCount: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/blockchain/blocks (paginated from MongoDB) ───────────────────────
router.get("/blocks", async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;
    const total = await Block.countDocuments();
    const blocks = await Block.find().sort({ height: -1 }).skip(skip).limit(limit).lean();
    res.json({ blocks, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Parser ────────────────────────────────────────────────────────────────────
function parseChain(raw) {
  const blocks = [];
  const blockSections = raw.split(/={12,}/g).filter((s) => s.trim());

  for (const section of blockSections) {
    const lines = section.split("\n").map((l) => l.trim());
    const hashMatch = lines.find((l) => l.startsWith("Block "));
    if (!hashMatch) continue;

    const hash      = hashMatch.replace("Block ", "").trim();
    const heightLine = lines.find((l) => l.startsWith("Height:"));
    const prevLine   = lines.find((l) => l.startsWith("Prev. block:"));
    const powLine    = lines.find((l) => l.startsWith("PoW:"));

    const height   = heightLine ? parseInt(heightLine.replace("Height:", "").trim()) : 0;
    const prevHash = prevLine   ? prevLine.replace("Prev. block:", "").trim()       : "";
    const powValid = powLine    ? powLine.includes("true")                          : false;

    const txSections   = section.split(/--- Transaction/g).slice(1);
    const transactions = txSections.map((txRaw) => {
      const txLines = txRaw.split("\n").map((l) => l.trim());
      const txid    = txLines[0].replace(":", "").trim();

      const inputs = []; const outputs = [];
      let currentInput = null, currentOutput = null, mode = null;

      for (const line of txLines.slice(1)) {
        if (line.startsWith("Input"))  { currentInput  = {}; inputs.push(currentInput);   mode = "in";  }
        else if (line.startsWith("Output")) { currentOutput = {}; outputs.push(currentOutput); mode = "out"; }
        else if (line.startsWith("TXID:")      && mode === "in")  currentInput.txid      = line.replace("TXID:", "").trim();
        else if (line.startsWith("Out:")       && mode === "in")  currentInput.vout      = parseInt(line.replace("Out:", "").trim());
        else if (line.startsWith("Signature:") && mode === "in")  currentInput.signature = line.replace("Signature:", "").trim();
        else if (line.startsWith("PubKey:")    && mode === "in")  currentInput.pubKey    = line.replace("PubKey:", "").trim();
        else if (line.startsWith("Value:")     && mode === "out") currentOutput.value    = parseInt(line.replace("Value:", "").trim());
        else if (line.startsWith("Script:")    && mode === "out") currentOutput.script   = line.replace("Script:", "").trim();
      }

      const isCoinbase = inputs.length === 1 && (!inputs[0].txid || inputs[0].txid === "");
      return { txid, inputs, outputs, isCoinbase };
    });

    blocks.push({ hash, height, prevHash, powValid, transactions, txCount: transactions.length });
  }

  return blocks.sort((a, b) => a.height - b.height);
}

module.exports = router;
