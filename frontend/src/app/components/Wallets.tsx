import { useState, useEffect } from "react";
import { Plus, Pencil, Check, Copy, Wallet as WalletIcon, Code, Trash2 } from "lucide-react";
import { listWallets, createWallet, getBalance, deleteWallet, resetEverything, updateWalletLabel, type ApiWallet } from "../api";

const walletCode = `// wallet.go
func NewWallet() *Wallet {
    private, public := newKeyPair()
    return &Wallet{
        PrivateKey: private,
        PublicKey:  public,
    }
}

func newKeyPair() (ecdsa.PrivateKey, []byte) {
    curve := elliptic.P256()
    private, _ := ecdsa.GenerateKey(curve, rand.Reader)
    pubKey := append(
        private.PublicKey.X.Bytes(),
        private.PublicKey.Y.Bytes()...,
    )
    return *private, pubKey
}

// Address derivation (Bitcoin-style)
func (w Wallet) GetAddress() []byte {
    pubKeyHash := HashPubKey(w.PublicKey)
    versionedPayload := append([]byte{version}, pubKeyHash...)
    checksum := checksum(versionedPayload)
    fullPayload := append(versionedPayload, checksum...)
    return Base58Encode(fullPayload)
}`;

const COLORS = ["#10b981", "#06b6d4", "#8b5cf6", "#f59e0b", "#f43f5e", "#3b82f6"];

type WalletWithBalance = ApiWallet & { balance: number; color: string };

export function Wallets() {
  const [wallets, setWallets] = useState<WalletWithBalance[]>([]);
  const [creating, setCreating] = useState(false);
  const [creationStep, setCreationStep] = useState<"idle" | "generating" | "done">("idle");
  const [newAddress, setNewAddress] = useState<string | null>(null);
  const [editingAddr, setEditingAddr] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingAddr, setDeletingAddr] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function loadWallets() {
    setLoading(true);
    setError(null);
    try {
      const res = await listWallets();
      const addresses = res.addresses || [];
      // Fetch balances for each address in parallel
      const withBalances: WalletWithBalance[] = await Promise.all(
        addresses.map(async (addr, idx) => {
          let balance = 0;
          try {
            const balRes = await getBalance(addr);
            balance = balRes.balance;
          } catch (_) {}
          // Try to find label from DB wallets
          const dbWallet = (res.wallets || []).find((w) => w.address === addr);
          return {
            address: addr,
            label: dbWallet?.label || `Wallet ${idx + 1}`,
            createdAt: dbWallet?.createdAt || new Date().toISOString(),
            balance,
            color: COLORS[idx % COLORS.length],
          };
        })
      );
      setWallets(withBalances);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadWallets(); }, []);

  async function handleCreate() {
    setCreationStep("generating");
    setError(null);
    try {
      const res = await createWallet();
      if (res.success && res.address) {
        setNewAddress(res.address);
        setCreationStep("done");
        await loadWallets();
        setTimeout(() => {
          setCreationStep("idle");
          setCreating(false);
          setNewAddress(null);
        }, 2500);
      } else {
        throw new Error("Wallet creation failed");
      }
    } catch (e: any) {
      setError(e.message);
      setCreationStep("idle");
    }
  }

  function handleCopy(addr: string) {
    navigator.clipboard.writeText(addr);
    setCopied(addr);
    setTimeout(() => setCopied(null), 2000);
  }

  async function saveLabel(addr: string) {
    const newLabel = editLabel;
    setWallets(wallets.map((w) => (w.address === addr ? { ...w, label: newLabel } : w)));
    setEditingAddr(null);
    try {
      await updateWalletLabel(addr, newLabel);
    } catch (_) {
      // label saved in local state regardless; MongoDB update is best-effort
    }
  }

  async function handleDelete(addr: string) {
    setDeletingAddr(addr);
    try {
      await deleteWallet(addr);
      await loadWallets();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeletingAddr(null);
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      await resetEverything();
      setConfirmReset(false);
      await loadWallets();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ color: "#e2e8f0" }}>Wallets</h2>
          <p style={{ color: "#64748b", fontSize: "13px" }}>
            ECDSA key pairs — {wallets.length} wallets stored in wallet_3000.dat
            {loading && <span style={{ color: "#f59e0b", marginLeft: "8px" }}>loading…</span>}
            {error && <span style={{ color: "#ef4444", marginLeft: "8px" }}>⚠ {error}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadWallets}
            className="flex items-center gap-2 px-3 py-1.5 rounded border text-xs transition-colors hover:bg-white/5"
            style={{ borderColor: "rgba(16,185,129,0.3)", color: "#10b981", fontFamily: "JetBrains Mono, monospace" }}
          >
            ↻ Refresh
          </button>
          <button
            onClick={() => setShowCode(!showCode)}
            className="flex items-center gap-2 px-3 py-1.5 rounded border text-xs transition-colors hover:bg-white/5"
            style={{ borderColor: "rgba(16,185,129,0.3)", color: "#10b981", fontFamily: "JetBrains Mono, monospace" }}
          >
            <Code size={12} />
            wallet.go
          </button>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors hover:opacity-90"
            style={{ background: "#10b981", color: "#080b0f", fontFamily: "JetBrains Mono, monospace" }}
          >
            <Plus size={12} />
            New Wallet
          </button>
          <button
            onClick={() => setConfirmReset(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded border text-xs transition-colors hover:bg-white/5"
            style={{ borderColor: "rgba(239,68,68,0.4)", color: "#ef4444", fontFamily: "JetBrains Mono, monospace" }}
          >
            <Trash2 size={12} />
            Reset All
          </button>
        </div>
      </div>

      {showCode && (
        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid rgba(16,185,129,0.2)" }}>
          <div className="flex items-center gap-2 px-4 py-2" style={{ background: "#131d2e", borderBottom: "1px solid rgba(16,185,129,0.1)" }}>
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <div className="w-2 h-2 rounded-full" style={{ background: "#10b981" }} />
            <span style={{ color: "#64748b", fontSize: "11px", marginLeft: "8px", fontFamily: "JetBrains Mono, monospace" }}>wallet.go</span>
          </div>
          <pre className="p-4 overflow-x-auto" style={{ background: "#080b0f", fontFamily: "JetBrains Mono, monospace", fontSize: "11px", lineHeight: "1.7", color: "#94a3b8" }}>
            {walletCode.split('\n').map((line, i) => (
              <span key={i} className="block">
                {line.startsWith('//') ? (
                  <span style={{ color: "#64748b" }}>{line}</span>
                ) : (
                  <span>
                    {line.split(/(func|return|var|type|append|struct)/g).map((part, j) =>
                      ['func', 'return', 'var', 'type', 'append', 'struct'].includes(part)
                        ? <span key={j} style={{ color: "#8b5cf6" }}>{part}</span>
                        : <span key={j}>{part}</span>
                    )}
                  </span>
                )}
              </span>
            ))}
          </pre>
        </div>
      )}

      {creating && (
        <div className="rounded-lg p-4 space-y-3" style={{ background: "#0e1520", border: "1px solid rgba(16,185,129,0.3)" }}>
          <p style={{ color: "#10b981", fontSize: "12px", fontFamily: "JetBrains Mono, monospace" }}>
            $ chainforge createwallet
          </p>
          {creationStep === "generating" ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2" style={{ color: "#64748b", fontSize: "12px", fontFamily: "JetBrains Mono, monospace" }}>
                <span className="animate-spin">⟳</span>
                Generating ECDSA P-256 key pair…
              </div>
              <div className="flex items-center gap-2" style={{ color: "#64748b", fontSize: "12px", fontFamily: "JetBrains Mono, monospace" }}>
                <span className="animate-pulse">▋</span>
                SHA-256 → RIPEMD-160 → Base58Check…
              </div>
            </div>
          ) : creationStep === "done" && newAddress ? (
            <div className="space-y-2">
              <div style={{ color: "#10b981", fontSize: "12px", fontFamily: "JetBrains Mono, monospace" }}>
                ✓ New address generated!
              </div>
              <div style={{ color: "#94a3b8", fontFamily: "JetBrains Mono, monospace", fontSize: "11px", wordBreak: "break-all" }}>
                {newAddress}
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={handleCreate}
                className="px-4 py-2 rounded text-xs font-medium"
                style={{ background: "#10b981", color: "#080b0f", fontFamily: "JetBrains Mono, monospace" }}
              >
                Generate
              </button>
              <button
                onClick={() => setCreating(false)}
                className="px-3 py-2 rounded text-xs"
                style={{ border: "1px solid rgba(16,185,129,0.2)", color: "#64748b", fontFamily: "JetBrains Mono, monospace" }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {confirmReset && (
        <div className="rounded-lg p-4 space-y-3" style={{ background: "#1a0a0a", border: "1px solid rgba(239,68,68,0.4)" }}>
          <p style={{ color: "#ef4444", fontSize: "13px", fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>⚠ Nuclear option</p>
          <p style={{ color: "#94a3b8", fontSize: "12px", fontFamily: "JetBrains Mono, monospace" }}>
            This will delete <strong style={{color:"#ef4444"}}>blockchain_3000.db</strong> and <strong style={{color:"#ef4444"}}>wallet_3000.dat</strong> — all wallets and chain data gone forever.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              disabled={resetting}
              className="px-4 py-2 rounded text-xs font-medium"
              style={{ background: "#ef4444", color: "#fff", fontFamily: "JetBrains Mono, monospace", opacity: resetting ? 0.6 : 1 }}
            >
              {resetting ? "Wiping…" : "Yes, wipe everything"}
            </button>
            <button
              onClick={() => setConfirmReset(false)}
              className="px-3 py-2 rounded text-xs"
              style={{ border: "1px solid rgba(100,116,139,0.3)", color: "#64748b", fontFamily: "JetBrains Mono, monospace" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {creationStep === "done" && newAddress && (
        <div className="rounded p-3 text-xs" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981", fontFamily: "JetBrains Mono, monospace" }}>
          ✓ New wallet created and saved to wallet_3000.dat
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {wallets.map((wallet) => (
          <div key={wallet.address} className="rounded-lg p-4" style={{ background: "#0e1520", border: "1px solid rgba(16,185,129,0.15)" }}>
            <div className="flex items-start gap-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: wallet.color + "20", border: `1px solid ${wallet.color}40` }}
              >
                <WalletIcon size={16} style={{ color: wallet.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {editingAddr === wallet.address ? (
                    <div className="flex items-center gap-2">
                      <input
                        className="rounded px-2 py-0.5 text-sm outline-none"
                        style={{ background: "#131d2e", border: "1px solid rgba(16,185,129,0.3)", color: "#e2e8f0", width: "140px" }}
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveLabel(wallet.address)}
                        autoFocus
                      />
                      <button onClick={() => saveLabel(wallet.address)}>
                        <Check size={12} style={{ color: "#10b981" }} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span style={{ color: "#e2e8f0", fontSize: "14px" }}>{wallet.label}</span>
                      <button onClick={() => { setEditingAddr(wallet.address); setEditLabel(wallet.label); }}>
                        <Pencil size={11} style={{ color: "#64748b" }} />
                      </button>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "#64748b" }}>
                    {wallet.address}
                  </span>
                  <button onClick={() => handleCopy(wallet.address)}>
                    {copied === wallet.address
                      ? <Check size={10} style={{ color: "#10b981" }} />
                      : <Copy size={10} style={{ color: "#64748b" }} />
                    }
                  </button>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div style={{ color: "#10b981", fontFamily: "JetBrains Mono, monospace", fontSize: "18px", fontWeight: 700 }}>
                  {wallet.balance}
                </div>
                <div style={{ color: "#64748b", fontSize: "11px", fontFamily: "JetBrains Mono, monospace" }}>coins</div>
                <button
                  onClick={() => handleDelete(wallet.address)}
                  disabled={deletingAddr === wallet.address}
                  className="mt-2 flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors hover:bg-red-500/10"
                  style={{ border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444", fontFamily: "JetBrains Mono, monospace", opacity: deletingAddr === wallet.address ? 0.5 : 1 }}
                >
                  <Trash2 size={10} />
                  {deletingAddr === wallet.address ? "..." : "Delete"}
                </button>
              </div>
            </div>

            <div className="mt-3 pt-3 grid grid-cols-3 gap-3" style={{ borderTop: "1px solid rgba(16,185,129,0.08)" }}>
              <InfoCell label="UTXO Balance" value={`${wallet.balance} coins`} />
              <InfoCell label="Key Curve"    value="P-256 ECDSA" />
              <InfoCell label="Addr Format"  value="Base58Check" />
            </div>
          </div>
        ))}

        {wallets.length === 0 && !loading && (
          <div className="text-center py-16" style={{ color: "#374151", fontFamily: "JetBrains Mono, monospace", fontSize: "13px" }}>
            No wallets yet — click "New Wallet" to generate one.
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ color: "#64748b", fontSize: "10px", fontFamily: "JetBrains Mono, monospace" }}>{label}</div>
      <div style={{ color: "#94a3b8", fontSize: "11px", fontFamily: "JetBrains Mono, monospace", marginTop: "2px" }}>{value}</div>
    </div>
  );
}
