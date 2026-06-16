import React, { useState, useEffect, useCallback } from "react";
import { Clock, Zap, CheckCircle, XCircle, Trash2, RefreshCw, Terminal, AlertCircle } from "lucide-react";
import { getMempool, mineMempool, rejectMempoolTx } from "../api";

/* ── Helpers ────────────────────────────────────────────────────────────────── */
function shortAddr(addr) {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-5)}`;
}

function timeAgo(dateStr) {
  const secs = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (secs < 60)  return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

/* ── Pending Transaction Card ───────────────────────────────────────────────── */
function PendingCard({ tx, onReject, mining, processed }) {
  const isProcessing = mining && !processed;
  const isDone       = mining && processed;

  return (
    <div style={{
      background: isDone ? "var(--emerald-bg)" : "var(--surface)",
      border: `1px solid ${isDone ? "var(--emerald-bd)" : isProcessing ? "var(--brass-border)" : "var(--line)"}`,
      borderRadius: "var(--r)",
      padding: "14px 16px",
      display: "flex",
      alignItems: "center",
      gap: 14,
      transition: "all 0.4s ease",
      opacity: isDone ? 0.7 : 1,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Shimmer when processing */}
      {isProcessing && (
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(90deg, transparent, rgba(160,120,48,0.08), transparent)",
          animation: "shimmer 1.2s infinite",
        }} />
      )}

      {/* Status dot */}
      <div style={{
        width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
        background: isDone ? "var(--emerald)" : isProcessing ? "var(--brass)" : "#f59e0b",
        boxShadow: isDone || isProcessing ? "none" : "0 0 0 3px rgba(245,158,11,0.2)",
        animation: !mining ? "pulse-dot 2s infinite" : "none",
      }} />

      {/* Details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 3 }}>
          <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--ink2)", background: "var(--surface2)", padding: "1px 6px", borderRadius: 4 }}>
            {shortAddr(tx.from)}
          </span>
          <span style={{ fontSize: 11, color: "var(--ink3)" }}>→</span>
          <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--ink2)", background: "var(--surface2)", padding: "1px 6px", borderRadius: 4 }}>
            {shortAddr(tx.to)}
          </span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{tx.amount} coins</span>
          <span style={{ fontSize: 11, color: "var(--ink3)" }}>{timeAgo(tx.createdAt)}</span>
        </div>
      </div>

      {/* State icon / reject button */}
      {isDone ? (
        <CheckCircle size={16} color="var(--emerald)" />
      ) : isProcessing ? (
        <RefreshCw size={15} color="var(--brass)" style={{ animation: "spin 0.8s linear infinite" }} />
      ) : (
        <button
          onClick={() => onReject(tx._id)}
          title="Remove from mempool"
          style={{ background: "none", border: "none", color: "var(--ink3)", padding: 4, borderRadius: 4, display: "flex", cursor: "pointer" }}
          onMouseEnter={(e) => e.currentTarget.style.color = "var(--crimson)"}
          onMouseLeave={(e) => e.currentTarget.style.color = "var(--ink3)"}
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

/* ── Confirmed Transaction Card ─────────────────────────────────────────────── */
function ConfirmedCard({ tx }) {
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--emerald-bd)",
      borderRadius: "var(--r)",
      padding: "12px 16px",
      display: "flex",
      alignItems: "center",
      gap: 14,
    }}>
      <CheckCircle size={14} color="var(--emerald)" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 2 }}>
          <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--ink2)" }}>{shortAddr(tx.from)}</span>
          <span style={{ fontSize: 11, color: "var(--ink3)" }}>→</span>
          <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--ink2)" }}>{shortAddr(tx.to)}</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--emerald)", fontWeight: 500 }}>{tx.amount} coins confirmed</div>
      </div>
    </div>
  );
}

/* ── Backend Trace Panel ────────────────────────────────────────────────────── */
function TracePanel({ trace }) {
  if (!trace || trace.length === 0) return null;
  return (
    <div style={{
      background: "#0f1117",
      borderRadius: "var(--r)",
      padding: "16px 18px",
      border: "1px solid #2a2d36",
      marginTop: 4,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Terminal size={13} color="#6ee7b7" />
        <span style={{ fontSize: 11, fontWeight: 600, color: "#6ee7b7", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Go Commands Executed
        </span>
      </div>
      {trace.map((t, i) => (
        <div key={i} style={{ marginBottom: i < trace.length - 1 ? 10 : 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
            <span style={{ fontSize: 10, color: "#94a3b8", fontFamily: "monospace" }}>{t.file}</span>
            <span style={{ fontSize: 10, color: "#475569" }}>·</span>
            <span style={{ fontSize: 10, color: "#7dd3fc", fontFamily: "monospace" }}>{t.fn}()</span>
          </div>
          <div style={{
            fontFamily: "monospace", fontSize: 12, color: "#e2e8f0",
            background: "#1e2130", padding: "6px 10px", borderRadius: 4,
            borderLeft: "2px solid #334155",
          }}>
            $ chainforge {t.command || t.note}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Mempool Page ───────────────────────────────────────────────────────────── */
export default function Mempool({ toast }) {
  const [data, setData]             = useState({ pending: [], confirmed: [], stats: { pendingCount: 0, pendingValue: 0 } });
  const [loading, setLoading]       = useState(true);
  const [minerAddress, setMiner]    = useState("");
  const [mining, setMining]         = useState(false);
  const [mineResult, setMineResult] = useState(null);
  const [processedIds, setProcessed]= useState(new Set());

  const fetchMempool = useCallback(async () => {
    try {
      const { data: d } = await getMempool();
      setData(d);
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMempool();
    const id = setInterval(fetchMempool, 5000);
    return () => clearInterval(id);
  }, [fetchMempool]);

  const handleReject = async (id) => {
    try {
      await rejectMempoolTx(id);
      toast("Transaction removed from mempool", "info");
      fetchMempool();
    } catch (e) {
      toast(e.response?.data?.error || "Failed to remove", "error");
    }
  };

  const handleMine = async () => {
    if (!minerAddress.trim()) { toast("Enter a miner address", "error"); return; }
    if (data.stats.pendingCount === 0) { toast("Mempool is empty", "error"); return; }

    setMining(true);
    setMineResult(null);
    setProcessed(new Set());

    // Simulate processing one by one for the UI
    const pendingIds = data.pending.map((tx) => tx._id);
    for (let i = 0; i < pendingIds.length; i++) {
      await new Promise((r) => setTimeout(r, 600));
      setProcessed((prev) => new Set([...prev, pendingIds[i]]));
    }

    try {
      const { data: result } = await mineMempool(minerAddress.trim());
      setMineResult(result);
      toast(`Mined ${result.processed} transaction(s)!`, "success");
      fetchMempool();
    } catch (e) {
      toast(e.response?.data?.error || "Mining failed", "error");
    }
    setMining(false);
  };

  const pendingToShow = mining
    ? [...data.pending]
    : data.pending;

  return (
    <>
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { box-shadow: 0 0 0 3px rgba(245,158,11,0.2); }
          50%       { box-shadow: 0 0 0 6px rgba(245,158,11,0.05); }
        }
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="page-header">
        <div>
          <h1 className="page-title">Mempool</h1>
          <p className="page-sub">Pending transactions waiting to be mined into a block</p>
        </div>
        <button className="btn" onClick={fetchMempool} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="page-body">

        {/* ── Stats Bar ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 4 }}>
          {[
            { label: "Pending Txs",    value: loading ? "—" : data.stats.pendingCount, color: "#f59e0b" },
            { label: "Pending Value",  value: loading ? "—" : `${data.stats.pendingValue} coins`, color: "var(--brass)" },
            { label: "Recently Confirmed", value: loading ? "—" : data.confirmed.length, color: "var(--emerald)" },
          ].map(({ label, value, color }) => (
            <div key={label} className="panel" style={{ padding: 0 }}>
              <div className="panel-body" style={{ padding: "14px 16px" }}>
                <div style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>

          {/* ── Pending Pool ── */}
          <div className="panel">
            <div className="panel-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="panel-title" style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <Clock size={13} color="#f59e0b" /> Pending ({data.stats.pendingCount})
              </span>
              {data.stats.pendingCount > 0 && !mining && (
                <span style={{ fontSize: 10, color: "var(--ink3)", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 4, padding: "2px 7px" }}>
                  UNCONFIRMED
                </span>
              )}
            </div>
            <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {loading ? (
                <div style={{ color: "var(--ink3)", fontSize: 13 }}>Loading…</div>
              ) : pendingToShow.length === 0 ? (
                <div style={{ textAlign: "center", padding: "28px 0", color: "var(--ink3)", fontSize: 13 }}>
                  <div style={{ marginBottom: 6 }}>Mempool is empty</div>
                  <div style={{ fontSize: 11 }}>Submit a transaction from the Send page</div>
                </div>
              ) : (
                pendingToShow.map((tx) => (
                  <PendingCard
                    key={tx._id}
                    tx={tx}
                    onReject={handleReject}
                    mining={mining}
                    processed={processedIds.has(tx._id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* ── Right Column: Mine + Confirmed ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Mine Panel */}
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title" style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <Zap size={13} color="var(--brass)" /> Mine Block
                </span>
              </div>
              <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 12, color: "var(--ink2)", lineHeight: 1.6 }}>
                  Mining picks all pending transactions, runs <code style={{ background: "var(--surface2)", padding: "1px 5px", borderRadius: 3, fontSize: 11 }}>send -mine</code> for each via the Go binary, then mines a coinbase reward block.
                </div>
                <div className="field">
                  <label>Miner Address (receives reward)</label>
                  <input
                    value={minerAddress}
                    onChange={(e) => setMiner(e.target.value)}
                    placeholder="Enter your wallet address…"
                  />
                </div>
                <button
                  className="btn btn-primary"
                  style={{ justifyContent: "center", padding: "11px", opacity: data.stats.pendingCount === 0 ? 0.5 : 1 }}
                  onClick={handleMine}
                  disabled={mining || data.stats.pendingCount === 0}
                >
                  {mining ? (
                    <><RefreshCw size={13} style={{ animation: "spin 0.8s linear infinite" }} /> Mining…</>
                  ) : (
                    <><Zap size={13} /> Mine {data.stats.pendingCount} Transaction{data.stats.pendingCount !== 1 ? "s" : ""}</>
                  )}
                </button>

                {data.stats.pendingCount === 0 && !mining && (
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 12px", background: "var(--surface2)", borderRadius: "var(--r)", border: "1px solid var(--line)" }}>
                    <AlertCircle size={13} color="var(--ink3)" style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 12, color: "var(--ink3)" }}>Add transactions via Send page → "Add to Mempool"</span>
                  </div>
                )}
              </div>
            </div>

            {/* Backend Trace */}
            {mineResult && (
              <div className="panel" style={{ animation: "fadeIn 0.3s ease" }}>
                <div className="panel-header">
                  <span className="panel-title" style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <Terminal size={13} /> Backend Trace
                  </span>
                </div>
                <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <CheckCircle size={14} color="var(--emerald)" />
                    <span style={{ fontSize: 13, color: "var(--emerald)", fontWeight: 600 }}>
                      {mineResult.processed} transaction{mineResult.processed !== 1 ? "s" : ""} mined
                    </span>
                  </div>
                  <TracePanel trace={mineResult.trace} />
                  {mineResult.results?.map((r, i) => (
                    <div key={i} style={{
                      padding: "8px 12px",
                      borderRadius: "var(--r)",
                      background: r.success ? "var(--emerald-bg)" : "var(--crimson-bg)",
                      border: `1px solid ${r.success ? "var(--emerald-bd)" : "var(--crimson-bd)"}`,
                      fontSize: 11,
                      fontFamily: "monospace",
                      color: r.success ? "var(--emerald)" : "var(--crimson)",
                    }}>
                      {r.success ? "✓" : "✗"} {shortAddr(r.from)} → {shortAddr(r.to)} · {r.amount} coins
                      {r.error && <div style={{ marginTop: 3, opacity: 0.8 }}>{r.error}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confirmed */}
            {data.confirmed.length > 0 && (
              <div className="panel">
                <div className="panel-header">
                  <span className="panel-title" style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <CheckCircle size={13} color="var(--emerald)" /> Recently Confirmed
                  </span>
                </div>
                <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {data.confirmed.map((tx) => (
                    <ConfirmedCard key={tx._id} tx={tx} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── How It Works ── */}
        <div className="panel" style={{ marginTop: 4, background: "var(--surface2)", borderColor: "var(--line)" }}>
          <div className="panel-header"><span className="panel-title">How the Mempool Works</span></div>
          <div className="panel-body" style={{ paddingTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            {[
              { step: "1", title: "Submit", desc: "Transaction signed and stored in MongoDB as pending. Go binary not called yet." },
              { step: "2", title: "Wait",   desc: "Transaction sits in mempool. In real Bitcoin, miners choose txs with higher fees." },
              { step: "3", title: "Mine",   desc: "Miner triggers mining. Each pending tx is confirmed via Go's send -mine command." },
              { step: "4", title: "Confirm", desc: "Tx lands in a block on the chain. UTXO set updates. Balance reflects the change." },
            ].map(({ step, title, desc }) => (
              <div key={step} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{
                  width: 24, height: 24, borderRadius: "50%", background: "var(--ink)", color: "#fff",
                  fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>{step}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 3 }}>{title}</div>
                  <div style={{ fontSize: 12, color: "var(--ink2)", lineHeight: 1.55 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}
