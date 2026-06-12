import { useState, useEffect } from "react";
import { Send, ArrowRight, CheckCircle, AlertCircle, Code } from "lucide-react";
import { listWallets, getBalance, sendTransaction, type ApiWallet } from "../api";
import { shortAddress } from "./mockData";

type Status = "idle" | "signing" | "broadcasting" | "mining" | "done" | "error";

const txCode = `// transaction.go — Building a transaction
func NewUTXOTransaction(from, to string,
    amount int, bc *Blockchain) *Transaction {

    // Step 1: Find UTXOs owned by sender
    utxos, acc := UTXOSet.FindSpendableOutputs(
        pubKeyHash, amount,
    )
    if acc < amount {
        log.Panic("ERROR: Not enough funds")
    }

    // Step 2: Build inputs (spending old UTXOs)
    for txID, outs := range utxos {
        for _, out := range outs {
            input := TXInput{txID, out, nil, pubKey}
            inputs = append(inputs, input)
        }
    }

    // Step 3: Build outputs
    outputs = append(outputs,
        *NewTXOutput(amount, to),        // recipient
        *NewTXOutput(acc-amount, from),  // change back
    )

    // Step 4: Sign each input with private key
    tx.Sign(privKey, prevTXs)
    return &tx
}`;

type WalletWithBalance = ApiWallet & { balance: number };

export function SendTransaction({ onTxSent }: { onTxSent: (tx: any) => void }) {
  const [wallets, setWallets] = useState<WalletWithBalance[]>([]);
  const [loadingWallets, setLoadingWallets] = useState(true);
  const [walletError, setWalletError] = useState<string | null>(null);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [amount, setAmount] = useState("");
  const [mine, setMine] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<{ txId: string; rawOutput?: string; error?: string } | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [steps, setSteps] = useState<{ text: string; done: boolean }[]>([]);

  // Load live wallets with balances on mount
  useEffect(() => {
    async function load() {
      setLoadingWallets(true);
      setWalletError(null);
      try {
        const res = await listWallets();
        const addresses = res.addresses || [];
        const withBalances: WalletWithBalance[] = await Promise.all(
          addresses.map(async (addr, idx) => {
            let balance = 0;
            try {
              const balRes = await getBalance(addr);
              balance = balRes.balance;
            } catch (_) {}
            const dbWallet = (res.wallets || []).find((w) => w.address === addr);
            return {
              address: addr,
              label: dbWallet?.label || `Wallet ${idx + 1}`,
              createdAt: dbWallet?.createdAt || new Date().toISOString(),
              balance,
            };
          })
        );
        setWallets(withBalances);
        if (withBalances.length > 0) setFrom(withBalances[0].address);
      } catch (e: any) {
        setWalletError(e.message);
      } finally {
        setLoadingWallets(false);
      }
    }
    load();
  }, []);

  const toAddress = to === "custom" ? customTo : to;
  const fromWallet = wallets.find((w) => w.address === from);
  const amountNum = parseInt(amount) || 0;

  async function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function handleSend() {
    if (!toAddress || !amount || amountNum <= 0) return;
    if (fromWallet && amountNum > fromWallet.balance) {
      setStatus("error");
      setResult({ txId: "", error: `Insufficient funds — you have ${fromWallet.balance} coins, tried to send ${amountNum}` });
      return;
    }

    const stepList = [
      { text: "Scanning UTXO set for spendable outputs…", done: false },
      { text: "Building transaction inputs and outputs…", done: false },
      { text: "Signing inputs with ECDSA private key…", done: false },
      ...(mine
        ? [{ text: "Mining new block (PoW)…", done: false }]
        : [{ text: "Broadcasting to mempool…", done: false }]),
      { text: "Updating UTXO set…", done: false },
    ];
    setSteps(stepList);
    setStatus("signing");
    setResult(null);

    // Animate the first 3 steps optimistically while the real request runs
    for (let i = 0; i < 3; i++) {
      await sleep(600 + Math.random() * 300);
      setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, done: true } : s)));
    }

    try {
      // Real API call to the backend → Go binary
      const res = await sendTransaction(from, toAddress, amountNum, mine);

      // Finish remaining steps
      for (let i = 3; i < stepList.length; i++) {
        await sleep(500);
        setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, done: true } : s)));
      }

      if (res.success) {
        // Extract tx id from rawOutput if available
        const txIdMatch = res.rawOutput?.match(/([a-f0-9]{64})/);
        const txId = txIdMatch ? txIdMatch[1] : "see-raw-output";
        setStatus("done");
        setResult({ txId, rawOutput: res.rawOutput });
        onTxSent({
          id: txId,
          from,
          to: toAddress,
          amount: amountNum,
          blockHeight: mine ? 1 : 0,
          status: mine ? "confirmed" : "pending",
          timestamp: new Date().toISOString(),
          mined: mine,
        });
        // Refresh sender balance
        try {
          const balRes = await getBalance(from);
          setWallets((prev) =>
            prev.map((w) => (w.address === from ? { ...w, balance: balRes.balance } : w))
          );
        } catch (_) {}
      } else {
        setStatus("error");
        setResult({ txId: "", error: res.rawOutput || "Transaction failed" });
      }
    } catch (e: any) {
      setStatus("error");
      setResult({ txId: "", error: e.message || "Transaction failed" });
    }
  }

  function reset() {
    setStatus("idle");
    setResult(null);
    setSteps([]);
    setAmount("");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ color: "#e2e8f0" }}>Send Transaction</h2>
          <p style={{ color: "#64748b", fontSize: "13px" }}>
            UTXO model — inputs spent, outputs created, signed with ECDSA
            {loadingWallets && (
              <span style={{ color: "#f59e0b", marginLeft: "8px" }}>loading wallets…</span>
            )}
            {walletError && (
              <span style={{ color: "#ef4444", marginLeft: "8px" }}>⚠ {walletError}</span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowCode(!showCode)}
          className="flex items-center gap-2 px-3 py-1.5 rounded border text-xs transition-colors hover:bg-white/5"
          style={{
            borderColor: "rgba(16,185,129,0.3)",
            color: "#10b981",
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          <Code size={12} />
          transaction.go
        </button>
      </div>

      {showCode && (
        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid rgba(16,185,129,0.2)" }}>
          <div
            className="flex items-center gap-2 px-4 py-2"
            style={{ background: "#131d2e", borderBottom: "1px solid rgba(16,185,129,0.1)" }}
          >
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <div className="w-2 h-2 rounded-full" style={{ background: "#10b981" }} />
            <span
              style={{
                color: "#64748b",
                fontSize: "11px",
                marginLeft: "8px",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              transaction.go
            </span>
          </div>
          <pre
            className="p-4 overflow-x-auto"
            style={{
              background: "#080b0f",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: "11px",
              lineHeight: "1.7",
              color: "#94a3b8",
            }}
          >
            {txCode.split("\n").map((line, i) => (
              <span key={i} className="block">
                {line.startsWith("//") ? (
                  <span style={{ color: "#64748b" }}>{line}</span>
                ) : (
                  <span>
                    {line
                      .split(/(func|for|if|return|log\.Panic|append)/g)
                      .map((part, j) =>
                        ["func", "for", "if", "return", "log.Panic", "append"].includes(part) ? (
                          <span key={j} style={{ color: "#8b5cf6" }}>
                            {part}
                          </span>
                        ) : (
                          <span key={j}>{part}</span>
                        )
                      )}
                  </span>
                )}
              </span>
            ))}
          </pre>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Form */}
        <div
          className="rounded-lg p-5 space-y-4"
          style={{ background: "#0e1520", border: "1px solid rgba(16,185,129,0.15)" }}
        >
          <p
            style={{
              color: "#64748b",
              fontSize: "11px",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            TRANSACTION PARAMETERS
          </p>

          <Field label="FROM (sender)">
            {loadingWallets ? (
              <div
                style={{
                  color: "#64748b",
                  fontSize: "12px",
                  fontFamily: "JetBrains Mono, monospace",
                  padding: "8px",
                }}
              >
                Loading wallets…
              </div>
            ) : wallets.length === 0 ? (
              <div
                style={{
                  color: "#f59e0b",
                  fontSize: "12px",
                  fontFamily: "JetBrains Mono, monospace",
                  padding: "8px",
                }}
              >
                No wallets found — create one first.
              </div>
            ) : (
              <select
                className="w-full rounded px-3 py-2 outline-none text-sm"
                style={{
                  background: "#131d2e",
                  border: "1px solid rgba(16,185,129,0.2)",
                  color: "#e2e8f0",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: "12px",
                }}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                disabled={status !== "idle"}
              >
                {wallets.map((w) => (
                  <option key={w.address} value={w.address}>
                    {w.label} — {w.address.slice(0, 14)}… ({w.balance} coins)
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label="TO (recipient)">
            <select
              className="w-full rounded px-3 py-2 outline-none text-sm"
              style={{
                background: "#131d2e",
                border: "1px solid rgba(16,185,129,0.2)",
                color: "#e2e8f0",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "12px",
              }}
              value={to}
              onChange={(e) => setTo(e.target.value)}
              disabled={status !== "idle"}
            >
              <option value="">— Select wallet —</option>
              {wallets
                .filter((w) => w.address !== from)
                .map((w) => (
                  <option key={w.address} value={w.address}>
                    {w.label} — {w.address.slice(0, 14)}…
                  </option>
                ))}
              <option value="custom">Enter custom address…</option>
            </select>
            {to === "custom" && (
              <input
                className="w-full rounded px-3 py-2 mt-2 outline-none text-sm"
                style={{
                  background: "#131d2e",
                  border: "1px solid rgba(16,185,129,0.2)",
                  color: "#e2e8f0",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: "12px",
                }}
                placeholder="1Abc..."
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                disabled={status !== "idle"}
              />
            )}
          </Field>

          <Field label="AMOUNT (coins)">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                className="flex-1 rounded px-3 py-2 outline-none text-sm"
                style={{
                  background: "#131d2e",
                  border: "1px solid rgba(16,185,129,0.2)",
                  color: "#e2e8f0",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: "12px",
                }}
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={status !== "idle"}
              />
              <span
                style={{
                  color: "#64748b",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: "12px",
                }}
              >
                / {fromWallet?.balance ?? "?"} available
              </span>
            </div>
          </Field>

          <div
            className="flex items-center justify-between py-2 px-3 rounded"
            style={{ background: "#131d2e", border: "1px solid rgba(16,185,129,0.1)" }}
          >
            <div>
              <p style={{ color: "#e2e8f0", fontSize: "13px" }}>Mine immediately</p>
              <p
                style={{
                  color: "#64748b",
                  fontSize: "11px",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {mine
                  ? "Block mined now — sender earns +10 coinbase reward"
                  : "Goes to mempool, no block mined"}
              </p>
            </div>
            <button
              onClick={() => setMine(!mine)}
              disabled={status !== "idle"}
              className="w-10 h-5 rounded-full relative transition-colors"
              style={{ background: mine ? "#10b981" : "#374151" }}
            >
              <div
                className="w-4 h-4 rounded-full absolute top-0.5 transition-all"
                style={{ background: "#fff", left: mine ? "22px" : "2px" }}
              />
            </button>
          </div>

          {status === "idle" && (
            <button
              onClick={handleSend}
              disabled={!toAddress || !amount || amountNum <= 0 || wallets.length === 0 || (fromWallet != null && amountNum > fromWallet.balance)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded font-medium transition-colors hover:opacity-90 disabled:opacity-40"
              style={{
                background: "#10b981",
                color: "#080b0f",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              <Send size={14} />
              Send {amount || 0} coins
            </button>
          )}

          {status === "done" && (
            <button
              onClick={reset}
              className="w-full py-2.5 rounded text-sm transition-colors hover:opacity-80"
              style={{
                border: "1px solid rgba(16,185,129,0.3)",
                color: "#10b981",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              Send Another
            </button>
          )}
        </div>

        {/* Status panel */}
        <div
          className="rounded-lg p-5 space-y-4"
          style={{ background: "#0e1520", border: "1px solid rgba(16,185,129,0.15)" }}
        >
          <p
            style={{
              color: "#64748b",
              fontSize: "11px",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            TRANSACTION FLOW
          </p>

          {status === "idle" && steps.length === 0 && (
            <div
              className="flex flex-col items-center justify-center py-12 gap-3"
              style={{ color: "#374151" }}
            >
              <Send size={32} />
              <p style={{ fontSize: "13px", fontFamily: "JetBrains Mono, monospace" }}>
                Fill in the form and send
              </p>
            </div>
          )}

          {steps.length > 0 && (
            <div className="space-y-3">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="shrink-0">
                    {step.done ? (
                      <CheckCircle size={14} style={{ color: "#10b981" }} />
                    ) : (
                      <div
                        className="w-3.5 h-3.5 rounded-full border animate-pulse"
                        style={{ borderColor: "#64748b" }}
                      />
                    )}
                  </div>
                  <span
                    style={{
                      color: step.done ? "#e2e8f0" : "#64748b",
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: "12px",
                    }}
                  >
                    {step.text}
                  </span>
                </div>
              ))}
            </div>
          )}

          {status === "done" && result && (
            <div
              className="rounded p-4 space-y-3 mt-2"
              style={{
                background: "rgba(16,185,129,0.08)",
                border: "1px solid rgba(16,185,129,0.3)",
              }}
            >
              <div
                className="flex items-center gap-2"
                style={{
                  color: "#10b981",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: "13px",
                }}
              >
                <CheckCircle size={14} />
                Transaction submitted successfully
              </div>
              <div>
                <p
                  style={{
                    color: "#64748b",
                    fontSize: "10px",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  TX ID
                </p>
                <p
                  style={{
                    color: "#94a3b8",
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: "11px",
                    wordBreak: "break-all",
                    marginTop: "2px",
                  }}
                >
                  {result.txId}
                </p>
              </div>
              {result.rawOutput && (
                <div>
                  <p
                    style={{
                      color: "#64748b",
                      fontSize: "10px",
                      fontFamily: "JetBrains Mono, monospace",
                      marginBottom: "4px",
                    }}
                  >
                    RAW OUTPUT
                  </p>
                  <pre
                    style={{
                      color: "#64748b",
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: "10px",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                    }}
                  >
                    {result.rawOutput}
                  </pre>
                </div>
              )}
              <div className="flex items-center gap-4" style={{ fontSize: "12px" }}>
                <span
                  style={{ color: "#94a3b8", fontFamily: "JetBrains Mono, monospace" }}
                >
                  {shortAddress(from)}
                </span>
                <ArrowRight size={12} style={{ color: "#10b981" }} />
                <span
                  style={{ color: "#94a3b8", fontFamily: "JetBrains Mono, monospace" }}
                >
                  {shortAddress(toAddress)}
                </span>
                <span
                  style={{
                    color: "#10b981",
                    fontFamily: "JetBrains Mono, monospace",
                    marginLeft: "auto",
                  }}
                >
                  {amountNum} coins
                </span>
              </div>
            </div>
          )}

          {status === "error" && result?.error && (
            <div
              className="rounded p-4"
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
              }}
            >
              <div
                className="flex items-center gap-2"
                style={{
                  color: "#ef4444",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: "13px",
                }}
              >
                <AlertCircle size={14} />
                {result.error}
              </div>
              <button
                onClick={reset}
                className="mt-3 text-xs"
                style={{ color: "#64748b", fontFamily: "JetBrains Mono, monospace" }}
              >
                Try again →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        style={{
          color: "#64748b",
          fontSize: "10px",
          fontFamily: "JetBrains Mono, monospace",
          display: "block",
          marginBottom: "6px",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
