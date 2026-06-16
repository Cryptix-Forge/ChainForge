const express    = require("express");
const crypto     = require("crypto");
const { run }    = require("../goRunner");
const Fork       = require("../models/Fork");
const MempoolTx  = require("../models/MempoolTx");
const TxLog      = require("../models/TxLog");

const router = express.Router();

// Reuse the chain parser from the blockchain route
const { parseChain } = require("./blockchain")._internals;

// ── GET /api/fork ─────────────────────────────────────────────────────────────
// Returns the latest pending fork scenario, or null if none exists.
router.get("/", async (_req, res) => {
  try {
    const fork = await Fork.findOne({ status: "pending" }).sort({ createdAt: -1 }).lean();
    res.json({ fork: fork || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/fork/simulate ───────────────────────────────────────────────────
// Reads the real chain, treats it as Branch A, and generates a simulated
// Branch B that is one block longer — creating a fork scenario to resolve.
router.post("/simulate", async (req, res) => {
  try {
    const { stdout } = await run(["printchain"]);
    const blocks = parseChain(stdout); // sorted ascending by height

    if (blocks.length < 2) {
      return res.status(400).json({
        error: "Need at least 2 blocks to simulate a fork. Mine more blocks first.",
      });
    }

    // Fork point = one block before the current tip
    const forkPointIdx    = blocks.length - 2;
    const forkPoint       = blocks[forkPointIdx];
    const realTailBlocks  = blocks.slice(forkPointIdx + 1);

    // ── Branch A: real blocks after the fork point ───────────────────────────
    const branchA = await Promise.all(
      realTailBlocks.map(async (b) => {
        const txs = await Promise.all(
          b.transactions.map(async (t) => {
            let from = "", to = "", amount = 0;
            if (!t.isCoinbase) {
              // Both TxLog and MempoolTx now store the real on-chain txid
              // (captured from the Go binary's `TXID:` output), so either
              // collection can be matched directly against the block's tx id.
              const log = await TxLog.findOne({ txid: t.id }).lean();
              const memTx = log ? null : await MempoolTx.findOne({ txid: t.id }).lean();
              if (log) {
                from = log.from; to = log.to; amount = log.amount;
              } else if (memTx) {
                from = memTx.from; to = memTx.to; amount = memTx.amount;
              } else {
                // Last-resort fallback for transactions logged before this id
                // fix existed: match a confirmed MempoolTx by output value.
                const outputVals = (t.outputs || []).map(o => o?.value).filter(v => v > 0);
                for (const val of outputVals) {
                  const fuzzyMatch = await MempoolTx.findOne({ status: "confirmed", amount: val })
                    .sort({ confirmedAt: -1 })
                    .lean();
                  if (fuzzyMatch) { from = fuzzyMatch.from; to = fuzzyMatch.to; amount = fuzzyMatch.amount; break; }
                }
              }
            }
            return { txid: t.id, isCoinbase: t.isCoinbase, from, to, amount };
          })
        );
        return { hash: b.hash, height: b.height, txCount: b.txCount, isReal: true, transactions: txs };
      })
    );

    // ── Branch B: simulated competing chain — always one block longer ────────
    // Clearly marked isReal:false so the UI can label them as simulated.
    const branchB = [
      {
        hash:    "sim_" + crypto.randomBytes(10).toString("hex"),
        height:  forkPoint.height + 1,
        txCount: 1,
        isReal:  false,
        transactions: [{ txid: "sim_cb_1", isCoinbase: true, from: "", to: "SimMinerAddress", amount: 10 }],
      },
      {
        hash:    "sim_" + crypto.randomBytes(10).toString("hex"),
        height:  forkPoint.height + 2,
        txCount: 1,
        isReal:  false,
        transactions: [{ txid: "sim_cb_2", isCoinbase: true, from: "", to: "SimMinerAddress", amount: 10 }],
      },
    ];

    // Ensure Branch B is always longer by one to make resolution interesting
    while (branchB.length <= branchA.length) {
      const lastH = branchB[branchB.length - 1].height;
      branchB.push({
        hash:    "sim_" + crypto.randomBytes(10).toString("hex"),
        height:  lastH + 1,
        txCount: 1,
        isReal:  false,
        transactions: [{ txid: "sim_cb_" + (branchB.length + 1), isCoinbase: true, from: "", to: "SimMinerAddress", amount: 10 }],
      });
    }

    // Clear any stale pending fork before creating a new one
    await Fork.deleteMany({ status: "pending" });

    const fork = await Fork.create({
      forkPointHash:   forkPoint.hash,
      forkPointHeight: forkPoint.height,
      branchA,
      branchB,
    });

    res.json({ success: true, fork });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/fork/resolve ────────────────────────────────────────────────────
// Applies the longest-chain rule. The longer branch wins. Transactions from
// orphaned blocks on the losing branch are returned to the mempool.
router.post("/resolve", async (_req, res) => {
  try {
    const fork = await Fork.findOne({ status: "pending" }).sort({ createdAt: -1 });
    if (!fork) return res.status(404).json({ error: "No pending fork to resolve" });

    const lenA   = fork.branchA.length;
    const lenB   = fork.branchB.length;
    const winner = lenB > lenA ? "B" : "A";  // tie goes to A (current chain stays)
    const loserBlocks = winner === "A" ? fork.branchB : fork.branchA;

    // Collect non-coinbase transactions from orphaned (losing) blocks
    const orphanedTxs = [];
    for (const block of loserBlocks) {
      for (const tx of block.transactions) {
        if (!tx.isCoinbase && tx.from && tx.to && tx.amount > 0) {
          orphanedTxs.push({ txid: tx.txid, from: tx.from, to: tx.to, amount: tx.amount });
        }
      }
    }

    // Return orphaned transactions to the mempool so they can be re-mined
    if (orphanedTxs.length > 0) {
      await MempoolTx.insertMany(
        orphanedTxs.map((t) => ({
          from:   t.from,
          to:     t.to,
          amount: t.amount,
          txid:   t.txid,
          status: "pending",
          note:   "Returned from orphaned block during fork resolution",
        }))
      );
    }

    fork.winner       = winner;
    fork.orphanedTxs  = orphanedTxs;
    fork.status       = "resolved";
    fork.resolvedAt   = new Date();
    await fork.save();

    res.json({
      success:           true,
      winner,
      winnerLength:      winner === "A" ? lenA : lenB,
      loserLength:       winner === "A" ? lenB : lenA,
      orphanedBlockCount: loserBlocks.length,
      orphanedTxCount:   orphanedTxs.length,
      orphanedTxs,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/fork ──────────────────────────────────────────────────────────
router.delete("/", async (_req, res) => {
  try {
    await Fork.deleteMany({ status: "pending" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
