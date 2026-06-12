import React, { useState, useEffect } from "react";
import { Send as SendIcon, AlertCircle, CheckCircle } from "lucide-react";
import { sendTx, listWallets } from "../api";

/* ── Toggle ─────────────────────────────────────────────────────── */
function Toggle({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 38,
        height: 22,
        borderRadius: 11,
        background: checked ? "var(--ink)" : "var(--line2)",
        border: "none",
        position: "relative",
        cursor: "pointer",
        transition: "background 0.18s",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 18 : 3,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.18s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
        }}
      />
    </button>
  );
}

/* ── Send Page ──────────────────────────────────────────────────── */
export default function Send({ toast }) {
  const [wallets, setWallets] = useState([]);
  const [from, setFrom]       = useState("");
  const [to, setTo]           = useState("");
  const [amount, setAmount]   = useState("");
  const [mine, setMine]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);

  useEffect(() => {
    listWallets()
      .then((r) => {
        const ws = r.data.wallets || [];
        setWallets(ws);
        if (ws.length > 0) setFrom(ws[0].address);
      })
      .catch(() => {});
  }, []);

  const isValid = from.trim() && to.trim() && Number(amount) >= 1;

  const handleSend = async () => {
    if (!isValid) return;
    setLoading(true);
    setResult(null);
    try {
      const { data } = await sendTx({
        from: from.trim(),
        to: to.trim(),
        amount: Number(amount),
        mine,
      });
      setResult({ success: true, message: data.message, txid: data.txid });
      toast("Transaction submitted!", "success");
      setTo("");
      setAmount("");
    } catch (e) {
      const msg = e.response?.data?.error || e.message;
      setResult({ success: false, message: msg });
      toast(msg, "error");
    }
    setLoading(false);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Send Coins</h1>
          <p className="page-sub">Submit a signed transaction to the blockchain</p>
        </div>
      </div>

      <div className="page-body">
        {/* Transaction Form */}
        <div className="panel" style={{ maxWidth: 560 }}>
          <div className="panel-header">
            <span className="panel-title">New Transaction</span>
          </div>
          <div className="panel-body">
            <div className="form-grid" style={{ gap: 18 }}>

              {/* FROM */}
              <div className="field">
                <label>From Address</label>
                {wallets.length > 0 ? (
                  <select value={from} onChange={(e) => setFrom(e.target.value)}>
                    {wallets.map((w) => (
                      <option key={w.address} value={w.address}>
                        {w.label ? `${w.label} — ` : ""}
                        {w.address}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    placeholder="Sender wallet address…"
                  />
                )}
              </div>

              {/* TO */}
              <div className="field">
                <label>To Address</label>
                <input
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="Recipient wallet address…"
                />
              </div>

              {/* AMOUNT */}
              <div className="field">
                <label>Amount (coins)</label>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 10"
                />
              </div>

              {/* MINE TOGGLE */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Toggle checked={mine} onChange={setMine} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
                    Mine immediately
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 1 }}>
                    Mines a new block right away (–mine flag). Good for testing.
                  </div>
                </div>
              </div>

              {/* SUBMIT */}
              <button
                className="btn btn-primary"
                style={{ marginTop: 4, justifyContent: "center", padding: "12px" }}
                onClick={handleSend}
                disabled={loading || !isValid}
              >
                {loading ? (
                  "Sending…"
                ) : (
                  <>
                    <SendIcon size={14} />
                    Send Transaction
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Result Banner */}
        {result && (
          <div
            className="panel"
            style={{
              maxWidth: 560,
              borderColor: result.success
                ? "var(--emerald-bd)"
                : "var(--crimson-bd)",
              background: result.success
                ? "var(--emerald-bg)"
                : "var(--crimson-bg)",
            }}
          >
            <div
              className="panel-body"
              style={{ display: "flex", gap: 14, alignItems: "flex-start" }}
            >
              {result.success ? (
                <CheckCircle
                  size={18}
                  color="var(--emerald)"
                  style={{ flexShrink: 0, marginTop: 2 }}
                />
              ) : (
                <AlertCircle
                  size={18}
                  color="var(--crimson)"
                  style={{ flexShrink: 0, marginTop: 2 }}
                />
              )}
              <div>
                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: result.success ? "var(--emerald)" : "var(--crimson)",
                  marginBottom: 5,
                }}>
                  {result.success ? "Transaction Submitted" : "Transaction Failed"}
                </div>
                {result.txid && (
                  <div style={{
                    fontFamily: "monospace",
                    fontSize: 11,
                    color: "var(--ink3)",
                    marginBottom: 5,
                  }}>
                    TXID: {result.txid}
                  </div>
                )}
                <div style={{ fontSize: 12, color: "var(--ink2)", lineHeight: 1.55 }}>
                  {result.message}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info Note */}
        <div
          className="panel"
          style={{
            maxWidth: 560,
            borderColor: "var(--line)",
            background: "var(--surface2)",
          }}
        >
          <div className="panel-header">
            <span className="panel-title">How It Works</span>
          </div>
          <div className="panel-body" style={{ paddingTop: 16 }}>
            <ul style={{
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}>
              {[
                "The transaction is signed and broadcast via the Go node.",
                "If Mine immediately is on, the node mines a new block containing this transaction.",
                "Transactions are logged to MongoDB regardless of outcome.",
                "Ensure the sender has sufficient balance — check the Wallets page first.",
              ].map((item, i) => (
                <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: "var(--ink3)",
                    flexShrink: 0,
                    marginTop: 7,
                  }} />
                  <span style={{ fontSize: 12.5, color: "var(--ink2)", lineHeight: 1.55 }}>
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
