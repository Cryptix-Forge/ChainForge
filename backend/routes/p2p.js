const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const express = require("express");
const { run, BINARY, ROOT } = require("../goRunner");

const router = express.Router();

// The P2P demo node always runs on port 3001, separate from the Express
// backend's database (NODE_ID=3000). This prevents BoltDB file-lock conflicts.
const P2P_NODE_ID = "3001";
const STATUS_FILE = path.join(ROOT, `p2p_status_${P2P_NODE_ID}.json`);

let p2pProcess = null;
const p2pLogs = [];

function pushLog(msg, isError = false) {
  p2pLogs.push({ time: new Date().toISOString(), msg: msg.trim(), isError });
  if (p2pLogs.length > 100) p2pLogs.splice(0, p2pLogs.length - 100);
}

// GET /api/p2p/status
router.get("/status", (_req, res) => {
  let nodeStatus = {
    running: !!p2pProcess,
    nodeAddress: null,
    peers: [],
    mempoolSize: 0,
    lastUpdated: null,
  };

  if (fs.existsSync(STATUS_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(STATUS_FILE, "utf8"));
      nodeStatus = { ...nodeStatus, ...parsed };
    } catch (_) {}
  }

  nodeStatus.running = !!p2pProcess;
  nodeStatus.logs = p2pLogs.slice(-30);
  res.json(nodeStatus);
});

// POST /api/p2p/start
router.post("/start", (req, res) => {
  if (p2pProcess) return res.status(400).json({ error: "P2P node is already running" });

  const { minerAddress } = req.body || {};
  const args = ["startnode"];
  if (minerAddress) args.push("-miner", minerAddress);

  const env = { ...process.env, NODE_ID: P2P_NODE_ID };

  p2pProcess = spawn(BINARY, args, { cwd: ROOT, env });

  p2pProcess.stdout.on("data", (data) => {
    data.toString().split("\n").filter(Boolean).forEach((line) => pushLog(line));
  });

  p2pProcess.stderr.on("data", (data) => {
    data.toString().split("\n").filter(Boolean).forEach((line) => pushLog(line, true));
  });

  p2pProcess.on("exit", (code) => {
    pushLog(`Node process exited (code ${code})`, code !== 0 && code !== null);
    p2pProcess = null;
  });

  p2pProcess.on("error", (err) => {
    pushLog(`Failed to start process: ${err.message}`, true);
    p2pProcess = null;
  });

  res.json({ success: true, message: `P2P node starting on port ${P2P_NODE_ID}` });
});

// POST /api/p2p/stop
router.post("/stop", (_req, res) => {
  if (!p2pProcess) return res.status(400).json({ error: "P2P node is not running" });

  try {
    p2pProcess.kill();
  } catch (_) {}
  p2pProcess = null;

  // Remove stale status file so the frontend knows the node is gone
  try { fs.unlinkSync(STATUS_FILE); } catch (_) {}

  res.json({ success: true, message: "P2P node stopped" });
});

// GET /api/p2p/peers — reads the persisted peers file via CLI
router.get("/peers", async (_req, res) => {
  try {
    const env = { ...process.env, NODE_ID: P2P_NODE_ID };
    const { stdout } = await run_with_node(["listpeers"], env);
    const peers = stdout
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean)
      .filter((p) => p !== "No peers saved");
    res.json({ peers, nodeId: P2P_NODE_ID });
  } catch (_) {
    res.json({ peers: [], nodeId: P2P_NODE_ID });
  }
});

// POST /api/p2p/peers — saves a peer address via CLI
router.post("/peers", async (req, res) => {
  const { address } = req.body || {};
  if (!address) return res.status(400).json({ error: "address is required" });
  if (!/^[a-zA-Z0-9.\-_]+:\d+$/.test(address)) {
    return res.status(400).json({ error: "Invalid format — expected host:port" });
  }

  try {
    const env = { ...process.env, NODE_ID: P2P_NODE_ID };
    const { stdout } = await run_with_node(["addpeer", "-address", address], env);
    res.json({ success: true, message: stdout });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: run the Go binary with a custom NODE_ID env
const { execFile } = require("child_process");
function run_with_node(args, env) {
  return new Promise((resolve, reject) => {
    execFile(BINARY, args, { cwd: ROOT, env, timeout: 10000 }, (err, stdout, stderr) => {
      if (err && !stdout) return reject(new Error(stderr || err.message));
      resolve({ stdout: (stdout || "").trim(), stderr: (stderr || "").trim() });
    });
  });
}

module.exports = router;
