import { useState, useEffect } from "react";
import { CheckCircle, Clock, XCircle, ArrowRight, Filter, RefreshCw } from "lucide-react";
import { getTxHistory, listWallets, type ApiTx, type ApiWallet } from "../api";
import { shortAddress } from "./mockData";

export function TxHistory({ transactions: propTxs }: { transactions: any[] }) {
  const [apiTxs, setApiTxs] = useState<ApiTx[]>([]);
  const [wallets, setWallets] = useState<ApiWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterAddr, setFilterAddr] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [txRes, walletRes] = await Promise.all([getTxHistory(), listWallets()]);
      setApiTxs(txRes.transactions || []);
      const addrs = walletRes.addresses || [];
      const mapped: ApiWallet[] = addrs.map((addr, idx) => {
        const db = (walletRes.wallets || []).find((w) => w.address === addr);
        return {
          address: addr,
          label: db?.label || `Wallet ${idx + 1}`,
          createdAt: db?.createdAt || new Date().toISOString(),
        };
      });
      setWallets(mapped);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Merge API transactions with any locally-added ones (from SendTransaction)
  // propTxs contains items added in this session; prefer those that aren't already in apiTxs
  const apiIds = new Set(apiTxs.map((t) => t.txId));
  const localOnly = propTxs.filter((t) => !apiIds.has(t.id));

  // Normalise local txs to ApiTx shape for unified rendering
  const normLocal: ApiTx[] = localOnly.map((t) => ({
    txId: t.id,
    from: t.from,
    to: t.to,
    amount: t.amount,
    timestamp: t.timestamp,
    nodeId: "3000",
  }));

  const allTxs: ApiTx[] = [...apiTxs, ...normLocal];

  const filtered = allTxs.filter((tx) => {
    const matchAddr =
      filterAddr === "all" || tx.from === filterAddr || tx.to === filterAddr;
    // API transactions don't have a status field; treat them as confirmed
    return matchAddr;
  });

  function walletLabel(addr: string) {
    const w = wallets.find((w) => w.address === addr);
    return w ? w.label : shortAddress(addr);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ color: "#e2e8f0" }}>Transaction History</h2>
          <p style={{ color: "#64748b", fontSize: "13px" }}>
            All transactions logged — {allTxs.length} total
            {loading && <span style={{ color: "#f59e0b", marginLeft: "8px" }}>loading…</span>}
            {error && <span style={{ color: "#ef4444", marginLeft: "8px" }}>⚠ {error}</span>}
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-1.5 rounded border text-xs transition-colors hover:bg-white/5"
          style={{
            borderColor: "rgba(16,185,129,0.3)",
            color: "#10b981",
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          <RefreshCw size={11} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter size={13} style={{ color: "#64748b" }} />
        <select
          className="rounded px-3 py-1.5 text-xs outline-none"
          style={{
            background: "#0e1520",
            border: "1px solid rgba(16,185,129,0.2)",
            color: "#94a3b8",
            fontFamily: "JetBrains Mono, monospace",
          }}
          value={filterAddr}
          onChange={(e) => setFilterAddr(e.target.value)}
        >
          <option value="all">All addresses</option>
          {wallets.map((w) => (
            <option key={w.address} value={w.address}>
              {w.label}
            </option>
          ))}
        </select>
        <span
          style={{
            color: "#64748b",
            fontSize: "11px",
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && !loading && (
          <div
            className="text-center py-16"
            style={{
              color: "#374151",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: "13px",
            }}
          >
            No transactions yet — send some coins!
          </div>
        )}
        {[...filtered].reverse().map((tx) => (
          <TxRow key={tx.txId} tx={tx} walletLabel={walletLabel} />
        ))}
      </div>
    </div>
  );
}

function TxRow({
  tx,
  walletLabel,
}: {
  tx: ApiTx;
  walletLabel: (addr: string) => string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-lg overflow-hidden transition-all"
      style={{ background: "#0e1520", border: "1px solid rgba(16,185,129,0.15)" }}
    >
      <button
        className="w-full px-4 py-3 flex items-center gap-4 text-left hover:bg-white/5 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <CheckCircle size={14} className="shrink-0" style={{ color: "#10b981" }} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2" style={{ fontSize: "12px" }}>
            <span
              style={{ color: "#94a3b8", fontFamily: "JetBrains Mono, monospace" }}
            >
              {walletLabel(tx.from)}
            </span>
            <ArrowRight size={10} style={{ color: "#10b981" }} />
            <span
              style={{ color: "#94a3b8", fontFamily: "JetBrains Mono, monospace" }}
            >
              {walletLabel(tx.to)}
            </span>
          </div>
          <div
            style={{
              color: "#64748b",
              fontSize: "10px",
              fontFamily: "JetBrains Mono, monospace",
              marginTop: "2px",
            }}
          >
            {shortAddress(tx.txId)} · {new Date(tx.timestamp).toLocaleString()}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div
            style={{
              color: "#10b981",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: "15px",
              fontWeight: 700,
            }}
          >
            {tx.amount} ⬡
          </div>
          <div
            style={{
              color: "#64748b",
              fontSize: "10px",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            confirmed
          </div>
        </div>
      </button>

      {open && (
        <div
          className="px-4 pb-4 space-y-3 border-t"
          style={{ borderColor: "rgba(16,185,129,0.1)" }}
        >
          <div className="mt-3 grid grid-cols-1 gap-1.5 text-xs">
            <DetailRow label="TX ID" value={tx.txId} />
            <DetailRow label="From" value={tx.from} />
            <DetailRow label="To" value={tx.to} />
            <DetailRow label="Amount" value={`${tx.amount} coins`} highlight />
            <DetailRow label="Status" value="CONFIRMED" />
            <DetailRow
              label="Timestamp"
              value={new Date(tx.timestamp).toLocaleString()}
            />
          </div>

          <div
            className="rounded p-3"
            style={{ background: "#060910", border: "1px solid rgba(16,185,129,0.1)" }}
          >
            <p
              style={{
                color: "#64748b",
                fontSize: "10px",
                fontFamily: "JetBrains Mono, monospace",
                marginBottom: "6px",
              }}
            >
              UTXO FLOW
            </p>
            <div
              className="flex items-center gap-3"
              style={{ fontSize: "11px", fontFamily: "JetBrains Mono, monospace" }}
            >
              <div className="text-center">
                <div style={{ color: "#ef4444", marginBottom: "2px" }}>INPUT</div>
                <div
                  className="px-2 py-1 rounded"
                  style={{
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    color: "#94a3b8",
                  }}
                >
                  UTXO spent
                </div>
              </div>
              <ArrowRight size={12} style={{ color: "#64748b" }} />
              <div className="flex gap-2">
                <div className="text-center">
                  <div style={{ color: "#10b981", marginBottom: "2px" }}>OUTPUT 1</div>
                  <div
                    className="px-2 py-1 rounded"
                    style={{
                      background: "rgba(16,185,129,0.1)",
                      border: "1px solid rgba(16,185,129,0.3)",
                      color: "#94a3b8",
                    }}
                  >
                    {tx.amount} → recipient
                  </div>
                </div>
                <div className="text-center">
                  <div style={{ color: "#06b6d4", marginBottom: "2px" }}>OUTPUT 2</div>
                  <div
                    className="px-2 py-1 rounded"
                    style={{
                      background: "rgba(6,182,212,0.1)",
                      border: "1px solid rgba(6,182,212,0.3)",
                      color: "#94a3b8",
                    }}
                  >
                    change → sender
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <span
        className="shrink-0 w-20"
        style={{ color: "#64748b", fontFamily: "JetBrains Mono, monospace" }}
      >
        {label}
      </span>
      <span
        className="break-all"
        style={{
          color: highlight ? "#10b981" : "#94a3b8",
          fontFamily: "JetBrains Mono, monospace",
          wordBreak: "break-all",
        }}
      >
        {value}
      </span>
    </div>
  );
}
