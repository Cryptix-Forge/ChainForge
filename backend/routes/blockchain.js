const express = require("express");
const fs = require("fs");
const path = require("path");
const { body, validationResult } = require("express-validator");
const { run, NODE_ID } = require("../goRunner");
const Block = require("../models/Block");

const router = express.Router();

// GO_ROOT — where the Go binary reads/writes blockchain_<NODE_ID>.db and
// wallet_<NODE_ID>.dat (cwd used by goRunner.run, mounted at /go-root in Docker —
// must match goRunner.js's own GO_ROOT resolution, including the env override)
const GO_ROOT = process.env.GO_ROOT || path.resolve(__dirname, "..", "..");
const DB_FILE = path.join(GO_ROOT, `blockchain_${NODE_ID}.db`);

function validate(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return false; }
  return true;
}

// ── GET /api/blockchain/exists ────────────────────────────────────────────────
router.get("/exists", (_req, res) => {
  const exists = fs.existsSync(DB_FILE);
  res.json({ exists, nodeId: NODE_ID });
});

// ── GET /api/blockchain/chain ─────────────────────────────────────────────────
router.get("/chain", async (_req, res) => {
  try {
    const { stdout } = await run(["printchain"]);
    const blocks = parseChain(stdout);

    // Upsert each block into MongoDB
    await Promise.all(
      blocks.map((b) =>
        Block.findOneAndUpdate({ hash: b.hash }, toDbBlock(b), { upsert: true, new: true, setDefaultsOnInsert: true })
      )
    );

    res.json({ blocks, count: blocks.length });
  } catch (err) {
    // Fallback: serve cached blocks from MongoDB
    try {
      const cached = await Block.find().sort({ height: 1 }).lean();
      if (cached.length) return res.json({ blocks: cached.map(fromDbBlock), count: cached.length, cached: true });
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

      const cliError = stdout.match(/^CLI_ERROR:(.+)$/m);
      if (cliError) return res.status(400).json({ error: cliError[1].trim() });

      // Sync the newly-created chain (genesis block) into MongoDB right away
      try {
        const { stdout: chainOut } = await run(["printchain"]);
        const blocks = parseChain(chainOut);
        await Promise.all(
          blocks.map((b) =>
            Block.findOneAndUpdate({ hash: b.hash }, toDbBlock(b), { upsert: true, new: true, setDefaultsOnInsert: true })
          )
        );
      } catch (_) {}

      res.json({ success: true, message: stdout, rawOutput: stdout, backendTrace: [{ file: "cli_createblockchain.go", fn: "createBlockchain" }] });
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

// ── GET /api/blockchain/blocks (live from Go binary, cached to MongoDB) ───────
router.get("/blocks", async (req, res) => {
  try {
    const { stdout } = await run(["printchain"]);
    const parsed = parseChain(stdout); // ascending by height

    // Upsert into MongoDB for fallback/history
    await Promise.all(
      parsed.map((b) =>
        Block.findOneAndUpdate({ hash: b.hash }, toDbBlock(b), { upsert: true, new: true, setDefaultsOnInsert: true })
      )
    );

    // Newest first, matching frontend expectations
    const blocks = [...parsed].reverse();
    res.json({ success: true, blocks, source: "live" });
  } catch (err) {
    // Fallback: serve cached blocks from MongoDB
    try {
      const cached = await Block.find().sort({ height: -1 }).lean();
      return res.json({ success: true, blocks: cached.map(fromDbBlock), source: "cache" });
    } catch (_) {}
    res.status(500).json({ error: err.message });
  }
});

// ── Mapping helpers ────────────────────────────────────────────────────────────
// Convert a parsed block (from parseChain, with `id` on transactions) to the
// shape stored in MongoDB (which uses `txid`).
function toDbBlock(b) {
  return {
    hash: b.hash,
    height: b.height,
    prevHash: b.prevHash,
    powValid: b.pow === "true",
    nonce: b.nonce,
    txCount: b.txCount,
    transactions: b.transactions.map((t) => ({
      txid: t.id,
      inputs: t.inputs,
      outputs: t.outputs,
      isCoinbase: t.isCoinbase,
    })),
  };
}

// Convert a MongoDB block doc back to the frontend's ApiBlock shape.
function fromDbBlock(b) {
  return {
    hash: b.hash,
    height: b.height,
    prevHash: b.prevHash,
    nonce: b.nonce || 0,
    pow: b.powValid ? "true" : "false",
    txCount: b.txCount,
    transactions: (b.transactions || []).map((t) => ({ id: t.txid })),
  };
}

// ── Parser ────────────────────────────────────────────────────────────────────
// printchain outputs blocks in this format (newest first):
//
//   ============ Block <hash> ============
//   Height: N
//   Prev. block: <prevhash>
//   PoW: true
//   Nonce: 12345
//
//   --- Transaction <txid>:
//        Input 0:
//          TXID:      <txid>
//          Out:       <vout>
//          Signature: <sig>
//          PubKey:    <pubkey>
//        Output 0:
//          Value:  10
//          Script: <hash>
//
//
// The old approach split on /={12,}/g which cut each header line into two
// separate sections (one with the hash, one with Height/PoW/txs), making it
// impossible to associate a hash with its block data.
// Fix: use a regex that captures the hash AND all following content as one unit.
function parseChain(raw) {
  const blocks = [];

  // Each block starts with "====... Block HASH ====...\n" and ends just before
  // the next such line or the end of the string. The lazy quantifier ([\s\S]*?)
  // combined with the lookahead stops at the right boundary.
  const blockRegex = /={12,}\s+Block\s+([a-f0-9]+)\s+={12,}\n([\s\S]*?)(?=\n*={12,}\s+Block\s+|$)/g;

  let match;
  while ((match = blockRegex.exec(raw)) !== null) {
    const hash    = match[1].trim();
    const content = match[2];

    const lines = content.split("\n").map((l) => l.trim());

    const heightLine = lines.find((l) => l.startsWith("Height:"));
    const prevLine   = lines.find((l) => l.startsWith("Prev. block:"));
    const powLine    = lines.find((l) => l.startsWith("PoW:"));
    const nonceLine  = lines.find((l) => l.startsWith("Nonce:"));

    const height   = heightLine ? parseInt(heightLine.replace("Height:", "").trim())  : 0;
    const prevHash = prevLine   ? prevLine.replace("Prev. block:", "").trim()         : "";
    const powValid = powLine    ? powLine.includes("true")                            : false;
    const nonce    = nonceLine  ? parseInt(nonceLine.replace("Nonce:", "").trim())    : 0;

    const txSections   = content.split(/--- Transaction/g).slice(1);
    const transactions = txSections.map((txRaw) => {
      const txLines = txRaw.split("\n").map((l) => l.trim());
      const txid    = txLines[0].replace(":", "").trim();

      const inputs = []; const outputs = [];
      let currentInput = null, currentOutput = null, mode = null;

      for (const line of txLines.slice(1)) {
        if (line.startsWith("Input"))        { currentInput  = {}; inputs.push(currentInput);   mode = "in";  }
        else if (line.startsWith("Output"))  { currentOutput = {}; outputs.push(currentOutput); mode = "out"; }
        else if (line.startsWith("TXID:")      && mode === "in")  currentInput.txid      = line.replace("TXID:", "").trim();
        else if (line.startsWith("Out:")       && mode === "in")  currentInput.vout      = parseInt(line.replace("Out:", "").trim());
        else if (line.startsWith("Signature:") && mode === "in")  currentInput.signature = line.replace("Signature:", "").trim();
        else if (line.startsWith("PubKey:")    && mode === "in")  currentInput.pubKey    = line.replace("PubKey:", "").trim();
        else if (line.startsWith("Value:")     && mode === "out") currentOutput.value    = parseInt(line.replace("Value:", "").trim());
        else if (line.startsWith("Script:")    && mode === "out") currentOutput.script   = line.replace("Script:", "").trim();
      }

      const isCoinbase = inputs.length === 1 && (!inputs[0].txid || inputs[0].txid === "");
      return { id: txid, inputs, outputs, isCoinbase };
    });

    blocks.push({
      hash,
      height,
      prevHash,
      pow: powValid ? "true" : "false",
      nonce,
      transactions,
      txCount: transactions.length,
    });
  }

  return blocks.sort((a, b) => a.height - b.height);
}

module.exports = router;
module.exports._internals = { parseChain, toDbBlock, fromDbBlock };
