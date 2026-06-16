import React, { useState, useEffect, useCallback } from "react";
import { GitBranch, Trophy, RefreshCw, Trash2, CheckCircle, Clock, AlertCircle, ArrowRight } from "lucide-react";
import { getFork, simulateFork, resolveFork, clearFork } from "../api";

/* ── Helpers ────────────────────────────────────────────────────────────────── */
function shortHash(h = "") {
  if (h.startsWith("sim_")) return "sim_" + h.slice(4, 12) + "…";
  if (h.length < 14) return h;
  return h.slice(0, 8) + "…" + h.slice(-6);
}

/* ── Block Card ─────────────────────────────────────────────────────────────── */
function BlockCard({ block, branch, resolved, winner, isOrphaned }) {
  const isWinner = resolved && branch === winner;
  const bg = !resolved
    ? "var(--surface)"
    : isOrphaned
    ? "var(--crimson-bg)"
    : isWinner
    ? "var(--emerald-bg)"
    : "var(--surface)";

  const border = !resolved
    ? branch === "A" ? "#6366f1" : "#f59e0b"
    : isOrphaned
    ? "var(--crimson-bd)"
    : isWinner
    ? "var(--emerald-bd)"
    : "var(--line)";

  return (
    <div style={{
      border: `1px solid ${border}`,
      borderRadius: "var(--r)",
      background: bg,
      padding: "10px 14px",
      transition: "all 0.4s ease",
      animation: "fadeUp 0.3s ease",
      position: "relative",
    }}>
      {block.isReal === false && (
        <div style={{
          position: "absolute", top: -8, right: 8,
          fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
          background: "#f59e0b", color: "#fff",
          padding: "1px 6px", borderRadius: 3,
        }}>SIMULATED</div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink)", fontFamily: "monospace" }}>
          Block #{block.height}
        </span>
        {resolved && isOrphaned && (
          <span style={{ fontSize: 9, fontWeight: 700, color: "var(--crimson)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            ORPHANED
          </span>
        )}
        {resolved && !isOrphaned && branch === winner && (
          <Trophy size={12} color="var(--emerald)" />
        )}
      </div>

      <div style={{ fontFamily: "monospace", fontSize: 10, color: "var(--ink3)", marginBottom: 6, wordBreak: "break-all" }}>
        {shortHash(block.hash)}
      </div>

      <div style={{ fontSize: 10, color: "var(--ink3)" }}>
        {block.txCount} tx{block.txCount !== 1 ? "s" : ""}
        {block.transactions?.some((t) => !t.isCoinbase) && (
          <span style={{ marginLeft: 6, color: resolved && isOrphaned ? "var(--crimson)" : "var(--brass)" }}>
            · has transfers
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Fork Point Block ────────────────────────────────────────────────────────── */
function ForkPointBlock({ hash, height }) {
  return (
    <div style={{
      border: "2px solid var(--ink)",
      borderRadius: "var(--r)",
      background: "var(--ink)",
      padding: "10px 14px",
      color: "var(--bg)",
      textAlign: "center",
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 3, opacity: 0.7 }}>FORK POINT</div>
      <div style={{ fontSize: 11, fontWeight: 700 }}>Block #{height}</div>
      <div style={{ fontFamily: "monospace", fontSize: 10, opacity: 0.6, marginTop: 2 }}>{shortHash(hash)}</div>
    </div>
  );
}

/* ── Branch Column ──────────────────────────────────────────────────────────── */
function BranchColumn({ label, branch, blocks, resolved, winner, accentColor }) {
  const isWinner = resolved && branch === winner;
  const isLoser  = resolved && branch !== winner;

  return (
    <div style={{ flex: 1 }}>
      {/* Header */}
      <div style={{
        padding: "8px 12px",
        borderRadius: "var(--r)",
        marginBottom: 8,
        background: isWinner ? "var(--emerald-bg)" : isLoser ? "var(--crimson-bg)" : `${accentColor}14`,
        border: `1px solid ${isWinner ? "var(--emerald-bd)" : isLoser ? "var(--crimson-bd)" : accentColor + "40"}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: isWinner ? "var(--emerald)" : isLoser ? "var(--crimson)" : accentColor }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{label}</span>
          {branch === "A" && <span style={{ fontSize: 10, color: "var(--ink3)", background: "var(--surface2)", padding: "1px 5px", borderRadius: 3 }}>real chain</span>}
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ink2)" }}>{blocks.length} block{blocks.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Blocks stacked top-down */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {blocks.map((b) => (
          <BlockCard
            key={b.hash}
            block={b}
            branch={branch}
            resolved={resolved}
            winner={winner}
            isOrphaned={isLoser}
          />
        ))}
        {blocks.length === 0 && (
          <div style={{ padding: "18px 0", textAlign: "center", color: "var(--ink3)", fontSize: 12 }}>
            No blocks on this branch
          </div>
        )}
      </div>

      {/* Winner / Loser label */}
      {resolved && (
        <div style={{
          marginTop: 10, padding: "8px 12px",
          borderRadius: "var(--r)", textAlign: "center",
          background: isWinner ? "var(--emerald-bg)" : "var(--crimson-bg)",
          border: `1px solid ${isWinner ? "var(--emerald-bd)" : "var(--crimson-bd)"}`,
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: isWinner ? "var(--emerald)" : "var(--crimson)" }}>
            {isWinner ? "✓ MAIN CHAIN" : "✗ ORPHANED"}
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Fork Resolution Page ───────────────────────────────────────────────────── */
export default function ForkResolution({ toast }) {
  const [fork, setFork]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [simulating, setSimulate] = useState(false);
  const [resolving, setResolve]   = useState(false);
  const [result, setResult]       = useState(null);

  const fetchFork = useCallback(async () => {
    try {
      const { data } = await getFork();
      setFork(data.fork);
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchFork(); }, [fetchFork]);

  const handleSimulate = async () => {
    setSimulate(true);
    setResult(null);
    try {
      const { data } = await simulateFork();
      setFork(data.fork);
      toast("Fork scenario created", "success");
    } catch (e) {
      toast(e.response?.data?.error || "Could not create fork", "error");
    }
    setSimulate(false);
  };

  const handleResolve = async () => {
    setResolve(true);
    try {
      const { data } = await resolveFork();
      setResult(data);
      await fetchFork();
      toast(
        `Branch ${data.winner} wins! ${data.orphanedTxCount} tx(s) returned to mempool`,
        "success"
      );
    } catch (e) {
      toast(e.response?.data?.error || "Resolution failed", "error");
    }
    setResolve(false);
  };

  const handleClear = async () => {
    try {
      await clearFork();
      setFork(null);
      setResult(null);
      toast("Fork scenario cleared", "info");
    } catch (_) {}
  };

  const resolved = fork?.status === "resolved";
  const winner   = fork?.winner || result?.winner;

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      <div className="page-header">
        <div>
          <h1 className="page-title">Fork Resolution</h1>
          <p className="page-sub">Longest-chain rule — the chain with the most blocks wins</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {fork && (
            <button className="btn" onClick={handleClear} style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--crimson)" }}>
              <Trash2 size={13} /> Clear
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={handleSimulate}
            disabled={simulating}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            {simulating
              ? <><RefreshCw size={13} style={{ animation: "spin 0.8s linear infinite" }} /> Simulating…</>
              : <><GitBranch size={13} /> {fork ? "Re-simulate" : "Simulate Fork"}</>
            }
          </button>
        </div>
      </div>

      <div className="page-body">

        {/* ── No fork yet ── */}
        {!loading && !fork && (
          <div style={{
            border: "2px dashed var(--line)", borderRadius: "var(--r-lg)",
            padding: "60px 24px", textAlign: "center", color: "var(--ink3)",
          }}>
            <GitBranch size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>No fork scenario active</div>
            <div style={{ fontSize: 12, marginBottom: 20 }}>
              Click <strong>Simulate Fork</strong> to generate a competing chain from your current blockchain.
            </div>
            <button className="btn btn-primary" onClick={handleSimulate} disabled={simulating} style={{ margin: "0 auto" }}>
              {simulating ? "Simulating…" : "Simulate Fork"}
            </button>
          </div>
        )}

        {/* ── Fork diagram ── */}
        {fork && (
          <>
            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 4 }}>
              {[
                { label: "Fork Point",    value: `Block #${fork.forkPointHeight}`,         color: "var(--ink)" },
                { label: "Branch A (real)", value: `${fork.branchA.length} block(s)`,      color: "#6366f1" },
                { label: "Branch B (sim)", value: `${fork.branchB.length} block(s)`,       color: "#f59e0b" },
                { label: "Winner",         value: resolved ? `Branch ${winner}` : "TBD",   color: resolved ? "var(--emerald)" : "var(--ink3)" },
              ].map(({ label, value, color }) => (
                <div key={label} className="panel" style={{ padding: 0 }}>
                  <div className="panel-body" style={{ padding: "12px 14px" }}>
                    <div style={{ fontSize: 10, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Main fork visualization */}
            <div className="panel">
              <div className="panel-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="panel-title" style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <GitBranch size={13} /> Fork Diagram
                </span>
                {!resolved && (
                  <button
                    className="btn btn-primary"
                    onClick={handleResolve}
                    disabled={resolving}
                    style={{ padding: "6px 14px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
                  >
                    {resolving
                      ? <><RefreshCw size={12} style={{ animation: "spin 0.8s linear infinite" }} /> Resolving…</>
                      : <><Trophy size={12} /> Resolve Fork</>
                    }
                  </button>
                )}
              </div>
              <div className="panel-body">
                {/* Fork point */}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                  <div style={{ width: 220 }}>
                    <ForkPointBlock hash={fork.forkPointHash} height={fork.forkPointHeight} />
                  </div>
                </div>

                {/* Branch lines — SVG fork shape */}
                <svg width="100%" height="44" style={{ display: "block", margin: "4px 0 8px" }} preserveAspectRatio="none">
                  {/* Center stem down from fork point */}
                  <line x1="50%" y1="0" x2="50%" y2="22" stroke="#64748b" strokeWidth="2" />
                  {/* Horizontal crossbar */}
                  <line x1="25%" y1="22" x2="75%" y2="22" stroke="#64748b" strokeWidth="2" />
                  {/* Left branch down (purple — Branch A) */}
                  <line x1="25%" y1="22" x2="25%" y2="44" stroke="#6366f1" strokeWidth="2" />
                  {/* Right branch down (amber — Branch B) */}
                  <line x1="75%" y1="22" x2="75%" y2="44" stroke="#f59e0b" strokeWidth="2" />
                  {/* Junction dots */}
                  <circle cx="25%" cy="22" r="3" fill="#6366f1" />
                  <circle cx="75%" cy="22" r="3" fill="#f59e0b" />
                </svg>

                {/* Two branches side by side */}
                <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                  <BranchColumn
                    label="Branch A"
                    branch="A"
                    blocks={fork.branchA}
                    resolved={resolved}
                    winner={winner}
                    accentColor="#6366f1"
                  />
                  <div style={{ width: 1, background: "var(--line)", alignSelf: "stretch", flexShrink: 0, margin: "0 4px" }} />
                  <BranchColumn
                    label="Branch B"
                    branch="B"
                    blocks={fork.branchB}
                    resolved={resolved}
                    winner={winner}
                    accentColor="#f59e0b"
                  />
                </div>
              </div>
            </div>

            {/* Resolution result */}
            {result && (
              <div className="panel" style={{ animation: "fadeUp 0.3s ease", borderColor: "var(--emerald-bd)", background: "var(--emerald-bg)" }}>
                <div className="panel-header">
                  <span className="panel-title" style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--emerald)" }}>
                    <Trophy size={13} /> Resolution Result
                  </span>
                </div>
                <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    {[
                      { label: "Winner",          value: `Branch ${result.winner}`, color: "var(--emerald)" },
                      { label: "Winning length",  value: `${result.winnerLength} block(s)`, color: "var(--ink)" },
                      { label: "Orphaned blocks", value: result.orphanedBlockCount, color: "var(--crimson)" },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ background: "rgba(255,255,255,0.6)", borderRadius: "var(--r)", padding: "10px 12px", border: "1px solid var(--emerald-bd)" }}>
                        <div style={{ fontSize: 10, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{label}</div>
                        <div style={{ fontSize: 17, fontWeight: 700, color }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Orphaned txs → mempool */}
                  {result.orphanedTxCount > 0 ? (
                    <div style={{ padding: "12px 14px", borderRadius: "var(--r)", background: "var(--brass-light)", border: "1px solid var(--brass-border)", display: "flex", alignItems: "center", gap: 10 }}>
                      <Clock size={14} color="var(--brass)" style={{ flexShrink: 0 }} />
                      <div style={{ fontSize: 12, color: "var(--ink2)" }}>
                        <strong>{result.orphanedTxCount} transaction(s)</strong> from orphaned blocks returned to the mempool — they can be re-mined into the winning chain.
                        <span style={{ marginLeft: 8, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          Check <ArrowRight size={11} /> <strong>Mempool</strong> page
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: "10px 14px", borderRadius: "var(--r)", background: "var(--surface2)", border: "1px solid var(--line)", fontSize: 12, color: "var(--ink3)" }}>
                      No non-coinbase transactions were orphaned (only coinbase rewards, which are simply discarded).
                    </div>
                  )}

                  {/* Why */}
                  <div style={{ fontSize: 12, color: "var(--ink2)", lineHeight: 1.6, padding: "10px 14px", background: "rgba(255,255,255,0.5)", borderRadius: "var(--r)", border: "1px solid var(--emerald-bd)" }}>
                    <strong>Why Branch {result.winner} won:</strong> It had {result.winnerLength} block(s) vs {result.loserLength} — Bitcoin's longest-chain rule gives it more cumulative proof-of-work, making it the canonical chain.
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── How it works ── */}
        <div className="panel" style={{ background: "var(--surface2)", borderColor: "var(--line)" }}>
          <div className="panel-header"><span className="panel-title">How Fork Resolution Works</span></div>
          <div className="panel-body" style={{ paddingTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
            {[
              { n: "1", title: "Fork Occurs",       desc: "Two miners find valid blocks at the same height simultaneously. Both are valid — two competing chain tips exist." },
              { n: "2", title: "Longest Chain Rule", desc: "Nodes accept the chain with the most cumulative proof-of-work. Whichever branch gets the next block first becomes canonical." },
              { n: "3", title: "Reorganization",    desc: "Nodes on the shorter branch detect they're behind, roll back their local tip, and switch to the longer chain." },
              { n: "4", title: "Orphaned Txs",      desc: "Transactions in the abandoned (orphaned) blocks aren't lost — they go back to the mempool to be included in a future block." },
            ].map(({ n, title, desc }) => (
              <div key={n} style={{ display: "flex", gap: 10 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--ink)", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{n}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 3 }}>{title}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink2)", lineHeight: 1.55 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Simulation note */}
          <div style={{ margin: "16px 16px 0", padding: "10px 14px", borderRadius: "var(--r)", background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)", fontSize: 12, color: "var(--ink2)", lineHeight: 1.55 }}>
            <strong>About this simulation:</strong> Branch A is your real chain. Branch B is a simulated competing chain that is always generated one block longer, so you can observe how the resolution plays out. In a real network, both branches would come from different miners broadcasting valid blocks simultaneously.
          </div>
        </div>

      </div>
    </>
  );
}
