import React, { useState, useEffect, useCallback } from "react";
import { Plus, RefreshCw, Copy, Edit2, Check } from "lucide-react";
import { listWallets, createWallet, getBalance, setLabel } from "../api";

/* Distinct palette for wallet avatars */
const PALETTE = [
  "#3b6fa0", "#7a4e8a", "#2e7d5e", "#a06030", "#8a3838", "#4a6e8a"
];
const avatarColor = (addr) => PALETTE[addr.charCodeAt(0) % PALETTE.length];

/* ── Single Wallet Card ─────────────────────────────────────────── */
function WalletCard({ wallet, onLabel, toast }) {
  const [balance, setBalance] = useState(null);
  const [editing, setEditing] = useState(false);
  const [label, setLbl]       = useState(wallet.label || "");
  const [copied, setCopied]   = useState(false);

  useEffect(() => {
    getBalance(wallet.address)
      .then((r) => setBalance(r.data.balance))
      .catch(() => setBalance("—"));
  }, [wallet.address]);

  const copy = () => {
    navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast("Address copied!", "success");
  };

  const saveLabel = async () => {
    await onLabel(wallet.address, label);
    setEditing(false);
  };

  return (
    <div className="wallet-card">
      <div className="wallet-card-top">
        <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
          <div
            className="wallet-avatar"
            style={{ background: avatarColor(wallet.address) }}
          >
            {wallet.address.slice(0, 2).toUpperCase()}
          </div>
          <div>
            {editing ? (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  value={label}
                  onChange={(e) => setLbl(e.target.value)}
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--line)",
                    borderRadius: 5,
                    color: "var(--ink)",
                    fontSize: 12,
                    padding: "3px 8px",
                    width: 130,
                    outline: "none",
                    fontFamily: "var(--sans)",
                  }}
                  onKeyDown={(e) => e.key === "Enter" && saveLabel()}
                  autoFocus
                />
                <button
                  onClick={saveLabel}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--emerald)",
                    cursor: "pointer",
                    padding: 2,
                  }}
                >
                  <Check size={13} />
                </button>
              </div>
            ) : (
              <div
                className="wallet-label"
                style={{ display: "flex", gap: 6, alignItems: "center" }}
              >
                {wallet.label || "Unnamed Wallet"}
                <button
                  onClick={() => setEditing(true)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--ink3)",
                    cursor: "pointer",
                    padding: 2,
                  }}
                >
                  <Edit2 size={11} />
                </button>
              </div>
            )}
            <div className="wallet-addr">{wallet.address}</div>
          </div>
        </div>

        <button className="copy-btn" onClick={copy} title="Copy address">
          {copied
            ? <Check size={13} color="var(--emerald)" />
            : <Copy size={13} />}
        </button>
      </div>

      <div className="wallet-balance-label">Balance</div>
      <div className="wallet-balance">
        {balance === null ? "…" : balance}
        <span style={{ fontSize: 14, color: "var(--ink3)", marginLeft: 5 }}>coins</span>
      </div>
    </div>
  );
}

/* ── Wallets Page ───────────────────────────────────────────────── */
export default function Wallets({ toast }) {
  const [wallets, setWallets]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await listWallets();
      setWallets(data.wallets || []);
    } catch (e) {
      toast(e.response?.data?.error || e.message, "error");
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const { data } = await createWallet();
      toast(`Wallet created: ${data.address}`, "success");
      load();
    } catch (e) {
      toast(e.response?.data?.error || e.message, "error");
    }
    setCreating(false);
  };

  const handleLabel = async (address, label) => {
    try {
      await setLabel(address, label);
      setWallets((w) =>
        w.map((x) => (x.address === address ? { ...x, label } : x))
      );
      toast("Label saved", "success");
    } catch (e) {
      toast("Failed to save label", "error");
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Wallets</h1>
            <p className="page-sub">
              {wallets.length} wallet{wallets.length !== 1 ? "s" : ""} found
            </p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-secondary btn-sm" onClick={load}>
              <RefreshCw size={13} /> Refresh
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleCreate}
              disabled={creating}
            >
              <Plus size={13} />
              {creating ? "Creating…" : "New Wallet"}
            </button>
          </div>
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <div className="loading-dots"><span /><span /><span /></div>
        ) : wallets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Wallet size={36} /></div>
            No wallets yet — create one above.
          </div>
        ) : (
          <div className="wallet-grid">
            {wallets.map((w) => (
              <WalletCard
                key={w.address}
                wallet={w}
                onLabel={handleLabel}
                toast={toast}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
