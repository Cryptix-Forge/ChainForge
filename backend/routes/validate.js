const express = require("express");
const { run } = require("../goRunner");

const router = express.Router();

// ── POST /api/validate/block ──────────────────────────────────────────────────
router.post("/block", async (req, res) => {
  const { hash } = req.body || {};
  if (!hash) return res.status(400).json({ error: "hash is required" });

  try {
    const { stdout } = await run(["validateblock", "-hash", hash]);

    // Bad hash / block-not-found are reported as a clean VALIDATE_ERROR line
    // (see cli_validateblock.go) rather than a Go panic — surface that as a
    // normal 404 instead of letting parseValidation produce a misleading
    // "INVALID" result with no explanation.
    const errMatch = stdout.match(/^VALIDATE_ERROR:(.+)$/m);
    if (errMatch) {
      return res.status(404).json({ success: false, error: errMatch[1].trim() });
    }

    const result = parseValidation(stdout);
    res.json({ success: true, hash, result, raw: stdout });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Parser ────────────────────────────────────────────────────────────────────
function parseValidation(raw) {
  const line  = (key) => {
    const match = raw.match(new RegExp(`^${key}:(.+)$`, "m"));
    return match ? match[1].trim() : null;
  };

  const height     = parseInt(line("BLOCK_HEIGHT") || "0");
  const nonce      = parseInt(line("BLOCK_NONCE")  || "0");
  const targetBits = parseInt(line("TARGET_BITS")  || "0");
  const powValid   = line("POW_RESULT")    === "true";
  const merkleRoot = line("MERKLE_ROOT")   || "";
  const txCount    = parseInt(line("TX_COUNT") || "0");
  const merkleValid = line("MERKLE_RESULT") === "true";
  const overall    = line("OVERALL") === "VALID";

  // Parse individual TX results: TX_RESULT:index:txid:type:valid
  const txResults = [];
  const txRegex = /^TX_RESULT:(\d+):([a-f0-9]+):(coinbase|regular):(true|false)$/gm;
  let m;
  while ((m = txRegex.exec(raw)) !== null) {
    txResults.push({
      index:     parseInt(m[1]),
      txid:      m[2],
      type:      m[3],
      valid:     m[4] === "true",
    });
  }

  return {
    height,
    nonce,
    targetBits,
    pow:    { valid: powValid },
    merkle: { valid: merkleValid, root: merkleRoot },
    transactions: { count: txCount, results: txResults, allValid: txResults.every((t) => t.valid) },
    overall,
  };
}

module.exports = router;
