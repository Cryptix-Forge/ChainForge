import React, { useState, useEffect, useCallback, useRef } from "react";
import { Radio, Plus, Play, Square, RefreshCw, AlertCircle } from "lucide-react";
import { getP2PStatus, startP2PNode, stopP2PNode, getP2PPeers, addP2PPeer } from "../api";

/* ── Protocol message reference ─────────────────────────────────────────────── */
const PROTOCOL_MSGS = [
  { type: "version",   color: "#6366f1", desc: "Handshake sent on connect. Shares chain height so nodes know who needs to sync." },
  { type: "getblocks", color: "#10b981", desc: "Requests block hashes from a peer to discover which blocks are missing." },
  { type: "inv",       color: "#f59e0b", desc: "Announces which blocks/txs this node has. Peer can then request the full data." },
  { type: "getdata",   color: "#8b5cf6", desc: "Fetches a specific block or transaction by its hash ID." },
  { type: "block",     color: "#06b6d4", desc: "Sends a full serialised block. Used during chain sync and after mining." },
  { type: "tx",        color: "#ec4899", desc: "Gossips a new transaction to all known peers." },
  { type: "addr",      color: "#14b8a6", desc: "Shares known peer addresses. How new nodes discover the network organically." },
];

/* ── Network topology SVG ────────────────────────────────────────────────────── */
function TopologyDiagram({ nodeAddress, peers }) {
  const W = 340, H = 190;
  const cx = W / 2, cy = 72;

  const positions = peers.map((_, i) => {
    const total = peers.length;
    const spread = Math.min(Math.PI * 1.1, Math.PI * 0.22 * total);
    const start = Math.PI / 2 - spread / 2;
    const angle = total === 1 ? Math.PI / 2 : start + (i * spread) / (total - 1);
    const r = 82;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });

  const label = nodeAddress ? `:${nodeAddress.split(":").pop()}` : ":3001";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
      {/* Dashed ring around this node */}
      <circle cx={cx} cy={cy} r={38} fill="none" stroke="#6366f1" strokeWidth={0.6}
        strokeDasharray="4 3" opacity={0.35} />

      {/* Lines to peers */}
      {positions.map((pos, i) => (
        <line key={i} x1={cx} y1={cy} x2={pos.x} y2={pos.y}
          stroke="var(--ink3)" strokeWidth={1} strokeDasharray="5 3" opacity={0.5} />
      ))}

      {/* This node */}
      <circle cx={cx} cy={cy} r={26} fill="#6366f122" stroke="#6366f1" strokeWidth={2} />
      <text x={cx} y={cy - 4} textAnchor="middle" fill="#6366f1"
        fontSize={8} fontFamily="monospace" fontWeight="700">NODE</text>
      <text x={cx} y={cy + 8} textAnchor="middle" fill="#6366f1"
        fontSize={9} fontFamily="monospace" fontWeight="600">{label}</text>

      {/* Peer nodes */}
      {positions.map((pos, i) => (
        <g key={i}>
          <circle cx={pos.x} cy={pos.y} r={18} fill="#10b98118" stroke="#10b981" strokeWidth={1.5} />
          <text x={pos.x} y={pos.y + 4} textAnchor="middle" fill="#10b981"
            fontSize={8.5} fontFamily="monospace" fontWeight="600">
            :{peers[i].split(":").pop()}
          </text>
        </g>
      ))}

      {peers.length === 0 && (
        <text x={cx} y={cy + 62} textAnchor="middle" fill="var(--ink3)"
          fontSize={10} fontFamily="monospace">no peers — add one →</text>
      )}
    </svg>
  );
}

/* ── Main component ──────────────────────────────────────────────────────────── */
export default function Network({ toast }) {
  const [status, setStatus]       = useState({ running: false, nodeAddress: null, peers: [], mempoolSize: 0, logs: [] });
  const [savedPeers, setSaved]    = useState([]);
  const [peerInput, setPeerInput] = useState("");
  const [minerInput, setMiner]    = useState("");
  const [starting, setStarting]   = useState(false);
  const [showLog, setShowLog]     = useState(true);
  const logRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    try { const { data } = await getP2PStatus(); setStatus(data); } catch (_) {}
  }, []);

  const fetchPeers = useCallback(async () => {
    try { const { data } = await getP2PPeers(); setSaved(data.peers || []); } catch (_) {}
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchPeers();
    const iv = setInterval(fetchStatus, 3000);
    return () => clearInterval(iv);
  }, [fetchStatus, fetchPeers]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [status.logs]);

  const handleStart = async () => {
    setStarting(true);
    try {
      await startP2PNode({ minerAddress: minerInput || undefined });
      toast("P2P node starting on port 3001…", "success");
      setTimeout(fetchStatus, 1200);
    } catch (err) {
      toast(err.response?.data?.error || "Failed to start node", "error");
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async () => {
    try {
      await stopP2PNode();
      toast("P2P node stopped", "info");
      setStatus((s) => ({ ...s, running: false, peers: [], nodeAddress: null, logs: [] }));
    } catch (err) {
      toast(err.response?.data?.error || "Failed to stop node", "error");
    }
  };

  const handleAddPeer = async () => {
    const addr = peerInput.trim();
    if (!addr) return;
    try {
      await addP2PPeer(addr);
      toast(`Peer ${addr} saved`, "success");
      setPeerInput("");
      fetchPeers();
    } catch (err) {
      toast(err.response?.data?.error || "Failed to add peer", "error");
    }
  };

  const activePeers = status.running ? (status.peers || []) : savedPeers;
  const logs = status.logs || [];

  /* ── card style helper ── */
  const card = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: "1.1rem 1.25rem", marginBottom: "1rem" };
  const sectionLabel = { fontSize: "0.72rem", fontWeight: 700, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.7rem" };
  const mono = { fontFamily: "monospace" };

  return (
    <div className="page">

      {/* ── Header ── */}
      <header className="page-header" style={{ marginBottom: "1.2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <Radio size={19} color="var(--ink2)" />
          <div>
            <h1 className="page-title">P2P Network</h1>
            <p className="page-sub">Real TCP-based peer-to-peer gossip network</p>
          </div>
        </div>
      </header>

      {/* ── Node Status Card ── */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>

          {/* Left: address + stats */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.25rem" }}>
              <span style={{
                width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                background: status.running ? "var(--emerald)" : "var(--ink3)",
                boxShadow: status.running ? "0 0 6px var(--emerald)" : "none",
              }} />
              <span style={{ ...mono, fontSize: "0.72rem", fontWeight: 700,
                color: status.running ? "var(--emerald)" : "var(--ink3)" }}>
                {status.running ? "ONLINE" : "OFFLINE"}
              </span>
            </div>
            <div style={{ ...mono, fontSize: "1rem", fontWeight: 700, color: "var(--ink)" }}>
              {status.nodeAddress || "localhost:3001"}
            </div>
            {status.running && (
              <div style={{ fontSize: "0.73rem", color: "var(--ink3)", marginTop: "0.2rem" }}>
                {(status.peers || []).length} peer{(status.peers || []).length !== 1 ? "s" : ""}
                &nbsp;·&nbsp;{status.mempoolSize || 0} tx{status.mempoolSize !== 1 ? "s" : ""} in mempool
                {status.lastUpdated && (
                  <span style={{ marginLeft: "0.5rem", opacity: 0.6 }}>
                    · updated {new Date(status.lastUpdated).toLocaleTimeString()}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right: controls */}
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            {!status.running && (
              <input
                placeholder="Miner reward address (optional)"
                value={minerInput}
                onChange={(e) => setMiner(e.target.value)}
                style={{ ...mono, fontSize: "0.72rem", padding: "0.4rem 0.65rem",
                  background: "var(--bg2)", border: "1px solid var(--border)",
                  borderRadius: "var(--r)", color: "var(--ink)", width: 230 }}
              />
            )}
            {status.running ? (
              <button className="btn btn-ghost" onClick={handleStop}
                style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
                <Square size={12} /> Stop Node
              </button>
            ) : (
              <button className="btn btn-primary" onClick={handleStart} disabled={starting}
                style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
                {starting
                  ? <RefreshCw size={12} style={{ animation: "spin 1s linear infinite" }} />
                  : <Play size={12} />}
                Start Node
              </button>
            )}
          </div>
        </div>

        {/* Info banner */}
        <div style={{ marginTop: "0.85rem", padding: "0.55rem 0.75rem", background: "var(--bg2)",
          borderRadius: "var(--r)", fontSize: "0.72rem", color: "var(--ink3)", lineHeight: 1.55 }}>
          Starts <strong style={{ color: "var(--ink2)" }}>port 3001</strong> · Listens on
          &nbsp;<code style={{ background: "var(--bg3)", padding: "1px 5px", borderRadius: 3 }}>0.0.0.0:3001</code>
          &nbsp;so remote peers can connect · Handshakes with any saved/added peers on start
          &nbsp;· Uses a separate database (<code style={{ background: "var(--bg3)", padding: "1px 5px", borderRadius: 3 }}>blockchain_3001.db</code>) to avoid conflicts
        </div>
      </div>

      {/* ── Topology + Peers ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>

        {/* Topology */}
        <div style={{ ...card, marginBottom: 0 }}>
          <div style={sectionLabel}>Network Topology</div>
          <TopologyDiagram nodeAddress={status.nodeAddress || "localhost:3001"} peers={activePeers} />
        </div>

        {/* Peers */}
        <div style={{ ...card, marginBottom: 0, display: "flex", flexDirection: "column" }}>
          <div style={sectionLabel}>{status.running ? "Active Peers" : "Saved Peers"}</div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.35rem",
            marginBottom: "0.75rem", minHeight: 60 }}>
            {activePeers.length === 0 ? (
              <div style={{ color: "var(--ink3)", fontSize: "0.8rem", textAlign: "center",
                padding: "1.2rem 0", flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                No peers yet
              </div>
            ) : activePeers.map((peer, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem",
                padding: "0.38rem 0.65rem", background: "var(--bg2)", borderRadius: "var(--r)",
                fontSize: "0.77rem", ...mono }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                  background: status.running ? "var(--emerald)" : "var(--ink3)" }} />
                <span style={{ flex: 1, color: "var(--ink)" }}>{peer}</span>
                <span style={{ fontSize: "0.67rem", color: status.running ? "var(--emerald)" : "var(--ink3)" }}>
                  {status.running ? "known" : "saved"}
                </span>
              </div>
            ))}
          </div>

          {/* Add peer */}
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <input
              placeholder="host:port  e.g. 192.168.1.5:3001"
              value={peerInput}
              onChange={(e) => setPeerInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddPeer()}
              style={{ flex: 1, ...mono, fontSize: "0.71rem", padding: "0.42rem 0.65rem",
                background: "var(--bg2)", border: "1px solid var(--border)",
                borderRadius: "var(--r)", color: "var(--ink)" }}
            />
            <button className="btn btn-primary" onClick={handleAddPeer}
              style={{ padding: "0.42rem 0.7rem", display: "flex", gap: "0.3rem",
                alignItems: "center", fontSize: "0.75rem" }}>
              <Plus size={12} /> Add
            </button>
          </div>
        </div>
      </div>

      {/* ── Node Log ── */}
      {(logs.length > 0 || status.running) && (
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
            <div style={sectionLabel}>Node Log</div>
            <button onClick={() => setShowLog((v) => !v)}
              style={{ fontSize: "0.7rem", color: "var(--ink3)", background: "none", border: "none",
                cursor: "pointer", padding: "2px 6px" }}>
              {showLog ? "hide" : "show"}
            </button>
          </div>

          {showLog && (
            <div ref={logRef} style={{
              background: "#080810", borderRadius: "var(--r)", padding: "0.75rem 0.9rem",
              ...mono, fontSize: "0.71rem", maxHeight: 210, overflowY: "auto",
              color: "#94a3b8", lineHeight: 1.75,
            }}>
              {logs.length === 0 ? (
                <span style={{ color: "#334155" }}>Waiting for output…</span>
              ) : logs.map((entry, i) => (
                <div key={i}>
                  <span style={{ color: "#334155" }}>{new Date(entry.time).toLocaleTimeString()} </span>
                  <span style={{ color: entry.isError ? "#f87171" : "#94a3b8" }}>{entry.msg}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── NAT warning ── */}
      <div style={{ ...card, display: "flex", gap: "0.6rem", alignItems: "flex-start", background: "var(--bg2)" }}>
        <AlertCircle size={15} color="var(--ink3)" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: "0.73rem", color: "var(--ink3)", lineHeight: 1.6 }}>
          <strong style={{ color: "var(--ink2)" }}>LAN vs. Internet:</strong> Nodes on the same local network connect directly.
          For internet-wide P2P, each machine must forward the port (3001) in its router.
          Set <code style={{ background: "var(--bg3)", padding: "1px 4px", borderRadius: 3 }}>P2P_ADVERTISE=&lt;your-ip&gt;</code> so
          peers know your external address. Production blockchains use STUN/TURN servers for full NAT traversal.
        </div>
      </div>

      {/* ── Protocol Reference ── */}
      <div style={card}>
        <div style={sectionLabel}>Protocol Messages</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(215px, 1fr))", gap: "0.5rem", marginBottom: "0.85rem" }}>
          {PROTOCOL_MSGS.map(({ type, color, desc }) => (
            <div key={type} style={{ padding: "0.55rem 0.7rem", borderRadius: "var(--r)",
              background: "var(--bg2)", borderLeft: `3px solid ${color}` }}>
              <div style={{ ...mono, fontWeight: 700, fontSize: "0.77rem", color, marginBottom: "0.2rem" }}>
                {type}
              </div>
              <div style={{ fontSize: "0.71rem", color: "var(--ink3)", lineHeight: 1.5 }}>{desc}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: "0.6rem 0.8rem", background: "var(--bg2)", borderRadius: "var(--r)",
          fontSize: "0.72rem", color: "var(--ink3)", lineHeight: 1.6 }}>
          <strong style={{ color: "var(--ink2)" }}>Gossip protocol:</strong> When a miner node receives a
          &nbsp;<code style={{ background: "var(--bg3)", padding: "1px 4px", borderRadius: 3 }}>tx</code>
          &nbsp;message it mines immediately and broadcasts the new block as an&nbsp;
          <code style={{ background: "var(--bg3)", padding: "1px 4px", borderRadius: 3 }}>inv</code>.
          &nbsp;The central node (bootstrap) relays each&nbsp;
          <code style={{ background: "var(--bg3)", padding: "1px 4px", borderRadius: 3 }}>tx</code>
          &nbsp;to every other peer, ensuring all nodes stay in sync without a central coordinator.
        </div>
      </div>

    </div>
  );
}
