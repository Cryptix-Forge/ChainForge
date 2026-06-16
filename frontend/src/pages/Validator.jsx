import React, { useState, useEffect } from "react";
import { ShieldCheck, ShieldX, CheckCircle, XCircle, RefreshCw, Terminal, ChevronDown } from "lucide-react";
import { validateBlock, getBlocks } from "../api";

/* ── Helpers ────────────────────────────────────────────────────────────────── */
function shortHash(h) {
  if (!h || h.length < 14) return h;
  return `${h.slice(0, 8)}…${h.slice(-6)}`;
}

/* ── Step Card ──────────────────────────────────────────────────────────────── */
function StepCard({ step, title, subtitle, valid, detail, loading, visible, goFn, goFile }) {
  if (!visible) return null;
  return (
    <div style={{
      border: `1px solid ${loading ? "var(--line)" : valid ? "var(--emerald-bd)" : "var(--crimson-bd)"}`,
      borderRadius: "var(--r)",
      background: loading ? "var(--surface)" : valid ? "var(--emerald-bg)" : "var(--crimson-bg)",
      padding: "14px 16px",
      transition: "all 0.35s ease",
      animation: "fadeSlideIn 0.3s ease",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        {/* Step number / icon */}
        <div style={{
          width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
          background: loading ? "var(--surface2)" : valid ? "var(--emerald)" : "var(--crimson)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {loading
            ? <RefreshCw size={13} color="var(--ink3)" style={{ animation: "spin 0.8s linear infinite" }} />
            : valid
              ? <CheckCircle size={14} color="#fff" />
              : <XCircle size={14} color="#fff" />
          }
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{step}. {title}</div>
            {!loading && (
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                color: valid ? "var(--emerald)" : "var(--crimson)",
              }}>
                {valid ? "PASSED" : "FAILED"}
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "var(--ink2)", marginBottom: detail ? 8 : 0 }}>{subtitle}</div>

          {/* Detail rows */}
          {detail && !loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {detail.map(({ label, value }, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 11, color: "var(--ink3)", minWidth: 90, flexShrink: 0 }}>{label}</span>
                  <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--ink)", wordBreak: "break-all" }}>{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Go function reference */}
          {goFn && !loading && (
            <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 10, color: "var(--ink3)" }}>Go:</span>
              <code style={{ fontSize: 10, background: "rgba(0,0,0,0.06)", padding: "1px 6px", borderRadius: 3, color: "var(--ink2)" }}>
                {goFile} → {goFn}
              </code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Tx Row ─────────────────────────────────────────────────────────────────── */
function TxRow({ tx }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "7px 10px",
      borderRadius: "var(--r)", background: tx.valid ? "rgba(30,110,72,0.06)" : "rgba(168,50,50,0.06)",
      border: `1px solid ${tx.valid ? "var(--emerald-bd)" : "var(--crimson-bd)"}`,
    }}>
      {tx.valid
        ? <CheckCircle size={13} color="var(--emerald)" style={{ flexShrink: 0 }} />
        : <XCircle    size={13} color="var(--crimson)"  style={{ flexShrink: 0 }} />
      }
      <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--ink2)", flex: 1 }}>
        {shortHash(tx.txid)}
      </span>
      <span style={{ fontSize: 10, color: "var(--ink3)", background: "var(--surface2)", padding: "1px 6px", borderRadius: 3 }}>
        {tx.type}
      </span>
      <span style={{ fontSize: 11, fontWeight: 600, color: tx.valid ? "var(--emerald)" : "var(--crimson)" }}>
        {tx.valid ? "valid" : "INVALID"}
      </span>
    </div>
  );
}

/* ── Terminal Trace ─────────────────────────────────────────────────────────── */
function Trace({ hash }) {
  return (
    <div style={{ background: "#0f1117", borderRadius: "var(--r)", padding: "14px 16px", border: "1px solid #2a2d36" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Terminal size={12} color="#6ee7b7" />
        <span style={{ fontSize: 10, fontWeight: 600, color: "#6ee7b7", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Go Command Executed
        </span>
      </div>
      {[
        { file: "cli_validateblock.go", fn: "validateBlock",    cmd: `validateblock -hash ${shortHash(hash)}` },
        { file: "proofofwork.go",        fn: "pow.Validate()",   cmd: "— recomputes SHA-256 hash, checks vs target" },
        { file: "block.go",              fn: "HashTransactions()", cmd: "— rebuilds Merkle tree from transactions" },
        { file: "blockchain.go",         fn: "VerifyTransaction()", cmd: "— ECDSA signature check on each input" },
      ].map((t, i) => (
        <div key={i} style={{ marginBottom: i < 3 ? 8 : 0 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 10, color: "#94a3b8", fontFamily: "monospace" }}>{t.file}</span>
            <span style={{ fontSize: 10, color: "#7dd3fc", fontFamily: "monospace" }}>{t.fn}</span>
          </div>
          <div style={{
            fontFamily: "monospace", fontSize: 11, color: "#e2e8f0",
            background: "#1e2130", padding: "5px 10px", borderRadius: 4,
            borderLeft: "2px solid #334155",
          }}>
            {i === 0 ? `$ chainforge ${t.cmd}` : t.cmd}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Validator Page ─────────────────────────────────────────────────────────── */
export default function Validator({ toast }) {
  const [blocks, setBlocks]     = useState([]);
  const [hash, setHash]         = useState("");
  const [validating, setVal]    = useState(false);
  const [step, setStep]         = useState(0);   // 0=idle 1=pow 2=merkle 3=tx 4=done
  const [result, setResult]     = useState(null);
  const [showTrace, setTrace]   = useState(false);

  useEffect(() => {
    getBlocks()
      .then((r) => {
        const bs = r.data.blocks || [];
        setBlocks(bs);
        if (bs.length > 0) setHash(bs[0].hash || "");
      })
      .catch(() => {});
  }, []);

  const handleValidate = async () => {
    if (!hash.trim()) { toast("Enter a block hash", "error"); return; }
    setVal(true);
    setResult(null);
    setStep(0);
    setTrace(false);

    // Animate steps appearing one by one while Go runs
    setStep(1);
    const timer1 = setTimeout(() => setStep(2), 700);
    const timer2 = setTimeout(() => setStep(3), 1400);

    try {
      const { data } = await validateBlock(hash.trim());
      clearTimeout(timer1);
      clearTimeout(timer2);
      setStep(4);
      setResult(data.result);
      toast(data.result.overall ? "Block is VALID ✓" : "Block is INVALID ✗", data.result.overall ? "success" : "error");
    } catch (e) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      toast(e.response?.data?.error || "Validation failed", "error");
      setStep(0);
    }
    setVal(false);
  };

  const done = step === 4 && result;

  return (
    <>
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      <div className="page-header">
        <div>
          <h1 className="page-title">Block Validator</h1>
          <p className="page-sub">Verify PoW, Merkle root, and transaction signatures for any block</p>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 16, alignItems: "start" }}>

          {/* ── Left: Input + Steps ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Block selector */}
            <div className="panel">
              <div className="panel-header"><span className="panel-title">Select Block</span></div>
              <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {blocks.length > 0 && (
                  <div className="field">
                    <label>Choose from chain</label>
                    <select value={hash} onChange={(e) => { setHash(e.target.value); setResult(null); setStep(0); }}>
                      {blocks.map((b) => (
                        <option key={b.hash} value={b.hash}>
                          Block #{b.height} — {shortHash(b.hash)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="field">
                  <label>Or paste hash directly</label>
                  <input
                    value={hash}
                    onChange={(e) => { setHash(e.target.value); setResult(null); setStep(0); }}
                    placeholder="Full block hash (hex)…"
                    style={{ fontFamily: "monospace", fontSize: 12 }}
                  />
                </div>
                <button
                  className="btn btn-primary"
                  style={{ justifyContent: "center", padding: "11px" }}
                  onClick={handleValidate}
                  disabled={validating || !hash.trim()}
                >
                  {validating
                    ? <><RefreshCw size={13} style={{ animation: "spin 0.8s linear infinite" }} /> Validating…</>
                    : <><ShieldCheck size={13} /> Validate Block</>
                  }
                </button>
              </div>
            </div>

            {/* Verdict banner */}
            {done && (
              <div style={{
                padding: "16px",
                borderRadius: "var(--r)",
                background: result.overall ? "var(--emerald-bg)" : "var(--crimson-bg)",
                border: `1px solid ${result.overall ? "var(--emerald-bd)" : "var(--crimson-bd)"}`,
                display: "flex", alignItems: "center", gap: 12,
                animation: "fadeSlideIn 0.3s ease",
              }}>
                {result.overall
                  ? <ShieldCheck size={22} color="var(--emerald)" />
                  : <ShieldX     size={22} color="var(--crimson)" />
                }
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: result.overall ? "var(--emerald)" : "var(--crimson)" }}>
                    Block {result.overall ? "VALID" : "INVALID"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink2)", marginTop: 2 }}>
                    Height {result.height} · Nonce {result.nonce}
                  </div>
                </div>
              </div>
            )}

            {/* How it works */}
            <div className="panel" style={{ background: "var(--surface2)", borderColor: "var(--line)" }}>
              <div className="panel-header"><span className="panel-title">What Gets Checked</span></div>
              <div className="panel-body" style={{ paddingTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { n: "1", title: "Proof of Work", desc: "SHA-256 of block data must be below the difficulty target (16 leading zero bits)." },
                  { n: "2", title: "Merkle Root",   desc: "Transactions are re-hashed into a Merkle tree. Root must match what was used during mining." },
                  { n: "3", title: "Tx Signatures", desc: "Each non-coinbase input is verified using ECDSA against the sender's public key." },
                ].map(({ n, title, desc }) => (
                  <div key={n} style={{ display: "flex", gap: 10 }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%", background: "var(--ink)", color: "#fff",
                      fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
                    }}>{n}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{title}</div>
                      <div style={{ fontSize: 11.5, color: "var(--ink2)", lineHeight: 1.5 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: Animated Steps ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

            <StepCard
              step={1} visible={step >= 1}
              title="Proof of Work"
              subtitle="Recomputing SHA-256 hash and comparing against difficulty target…"
              valid={done ? result.pow.valid : true}
              loading={step === 1 && !done}
              detail={done ? [
                { label: "Target bits",  value: `${result.targetBits} (hash must start with ${result.targetBits} zero bits)` },
                { label: "Block nonce",  value: result.nonce.toString() },
                { label: "Result",       value: result.pow.valid ? "Hash is below target ✓" : "Hash exceeds target ✗" },
              ] : null}
              goFile="proofofwork.go"
              goFn="pow.Validate()"
            />

            <StepCard
              step={2} visible={step >= 2}
              title="Merkle Root"
              subtitle="Rebuilding Merkle tree from block transactions…"
              valid={done ? result.merkle.valid : true}
              loading={step === 2 && !done}
              detail={done ? [
                { label: "Tx count",     value: `${result.transactions.count} transaction(s)` },
                { label: "Merkle root",  value: result.merkle.root },
                { label: "Result",       value: result.merkle.valid ? "Root consistent with PoW ✓" : "Root mismatch ✗" },
              ] : null}
              goFile="block.go"
              goFn="block.HashTransactions()"
            />

            <StepCard
              step={3} visible={step >= 3}
              title="Transaction Signatures"
              subtitle="Verifying ECDSA signatures on all transaction inputs…"
              valid={done ? result.transactions.allValid : true}
              loading={step === 3 && !done}
              goFile="blockchain.go"
              goFn="bc.VerifyTransaction()"
              detail={null}
            />

            {/* Individual tx results */}
            {done && result.transactions.results.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, animation: "fadeSlideIn 0.3s ease" }}>
                {result.transactions.results.map((tx) => (
                  <TxRow key={tx.txid} tx={tx} />
                ))}
              </div>
            )}

            {/* Backend trace toggle */}
            {done && (
              <div style={{ animation: "fadeSlideIn 0.3s ease" }}>
                <button
                  onClick={() => setTrace((v) => !v)}
                  style={{
                    background: "none", border: "1px solid var(--line)", borderRadius: "var(--r)",
                    padding: "8px 14px", color: "var(--ink2)", fontSize: 12, width: "100%",
                    display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Terminal size={12} /> Backend Trace
                  </span>
                  <ChevronDown size={13} style={{ transform: showTrace ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                </button>
                {showTrace && <div style={{ marginTop: 8 }}><Trace hash={hash} /></div>}
              </div>
            )}

            {/* Idle placeholder */}
            {step === 0 && (
              <div style={{
                border: "2px dashed var(--line)", borderRadius: "var(--r)",
                padding: "48px 24px", textAlign: "center", color: "var(--ink3)",
              }}>
                <ShieldCheck size={32} style={{ marginBottom: 10, opacity: 0.3 }} />
                <div style={{ fontSize: 13 }}>Select a block and click Validate</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>Results appear here step by step</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
