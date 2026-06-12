import { useState, useEffect, useRef } from "react";
import { Cpu, Zap, CheckCircle, Code, AlertCircle } from "lucide-react";
import { listWallets, mineBlock, getBalance, type ApiWallet } from "../api";

const TARGET_PREFIX = "0000";

function randomHex(length: number): string {
  const chars = "0123456789abcdef";
  let result = "";
  for (let i = 0; i < length; i++) result += chars[Math.floor(Math.random() * 16)];
  return result;
}

// Visual-only hash mock — simulates the feel of PoW without real computation
function sha256Mock(nonce: number, data: string): string {
  let h = nonce * 2654435761 + data.charCodeAt(0) * 31;
  h = Math.abs(h >>> 0);
  const prefix =
    nonce > 50000 ? "0000" : nonce > 30000 ? "000" : nonce > 10000 ? "00" : "0";
  return prefix + randomHex(64 - prefix.length);
}

const mineCode = `// proofofwork.go — Mining loop
func (pow *ProofOfWork) Run() (int, []byte) {
    nonce := 0
    for nonce < math.MaxInt64 {
        data := pow.prepareData(nonce)
        hash := sha256.Sum256(data)

        // Target: hash must start with 16 zero bits
        // i.e. first 4 hex chars must be "0000"
        hashInt.SetBytes(hash[:])
        if hashInt.Cmp(pow.target) == -1 {
            fmt.Printf("Found: %x\\n", hash)
            break // ✓ Valid proof-of-work
        }
        nonce++ // Keep trying
    }
    return nonce, hash[:]
}`;

export function Mining({ onBlockMined }: { onBlockMined: (addr: string) => void }) {
  const [wallets, setWallets] = useState<ApiWallet[]>([]);
  const [loadingWallets, setLoadingWallets] = useState(true);
  const [minerAddr, setMinerAddr] = useState("");

  // PoW simulation state
  const [mining, setMining] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [currentHash, setCurrentHash] = useState("");
  const [foundNonce, setFoundNonce] = useState<number | null>(null);
  const [hashRate, setHashRate] = useState(0);
  const [showCode, setShowCode] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [minedBlocks, setMinedBlocks] = useState(0);

  // Real mining state (after simulation finds hash)
  const [submitting, setSubmitting] = useState(false);
  const [mineResult, setMineResult] = useState<{
    success: boolean;
    newBalance: number | null;
    rawOutput: string;
    error?: string;
    hint?: string;
  } | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const logRef = useRef<HTMLDivElement | null>(null);

  // Load live wallets
  useEffect(() => {
    async function load() {
      setLoadingWallets(true);
      try {
        const res = await listWallets();
        const addresses = res.addresses || [];
        const mapped: ApiWallet[] = addresses.map((addr, idx) => {
          const db = (res.wallets || []).find((w) => w.address === addr);
          return {
            address: addr,
            label: db?.label || `Wallet ${idx + 1}`,
            createdAt: db?.createdAt || new Date().toISOString(),
          };
        });
        setWallets(mapped);
        if (mapped.length > 0) setMinerAddr(mapped[0].address);
      } catch (_) {
        // API down — miner picker stays empty
      } finally {
        setLoadingWallets(false);
      }
    }
    load();
  }, []);

  // Refresh balance whenever minerAddr changes
  useEffect(() => {
    if (!minerAddr) return;
    getBalance(minerAddr)
      .then((r) => setBalance(r.balance))
      .catch(() => setBalance(null));
  }, [minerAddr]);

  // Scroll log to bottom
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  function appendLog(msg: string) {
    setLog((prev) => [...prev.slice(-60), msg]);
  }

  // ── Phase 1: visual PoW simulation ────────────────────────────────────────
  function startMining() {
    if (!minerAddr) return;
    setMining(true);
    setFoundNonce(null);
    setCurrentHash("");
    setNonce(0);
    setLog([]);
    setMineResult(null);
    startTimeRef.current = Date.now();

    appendLog(`[INFO] Starting miner for address ${minerAddr.slice(0, 12)}...`);
    appendLog(`[INFO] Target: ${TARGET_PREFIX}${"f".repeat(60)}`);
    appendLog(`[INFO] targetBits = 16 (2 bytes leading zeros)`);

    let n = 0;
    intervalRef.current = setInterval(() => {
      const batchSize = 1500;
      n += batchSize;
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const rate = Math.round(n / elapsed / 1000);
      setNonce(n);
      setHashRate(rate);

      const hash = sha256Mock(n, minerAddr);
      setCurrentHash(hash);
      if (n % 5000 < batchSize) {
        appendLog(`[HASH] nonce=${n.toLocaleString()} → ${hash.slice(0, 20)}...`);
      }

      // Simulation "wins" after a random-ish nonce
      if (n > 60000 + Math.random() * 20000) {
        const winHash = "0000" + randomHex(60);
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setMining(false);
        setFoundNonce(n);
        setCurrentHash(winHash);

        appendLog(`[SUCCESS] Visual PoW complete — valid hash found!`);
        appendLog(`[SUCCESS] nonce = ${n.toLocaleString()}`);
        appendLog(`[SUCCESS] hash  = ${winHash}`);
        appendLog(`[INFO] Submitting real block to Go blockchain…`);

        // ── Phase 2: submit real block to backend ──────────────────────────
        submitRealBlock(n, winHash);
      }
    }, 60);
  }

  // ── Phase 2: call the real Go backend ─────────────────────────────────────
  async function submitRealBlock(simNonce: number, simHash: string) {
    setSubmitting(true);
    try {
      const res = await mineBlock(minerAddr);
      setMineResult(res);

      if (res.success) {
        setMinedBlocks((b) => b + 1);
        if (res.newBalance !== null) setBalance(res.newBalance);
        appendLog(`[CHAIN] Real block mined on blockchain_3000.db`);
        appendLog(`[CHAIN] Coinbase reward → ${minerAddr.slice(0, 12)}...`);
        appendLog(`[CHAIN] New balance: ${res.newBalance} coins`);
        onBlockMined(minerAddr);
      } else {
        appendLog(`[ERROR] Backend mining failed: ${res.error}`);
        if (res.hint) appendLog(`[HINT]  ${res.hint}`);
      }
    } catch (e: any) {
      const msg = e.message || "Network error";
      setMineResult({ success: false, newBalance: null, rawOutput: "", error: msg });
      appendLog(`[ERROR] ${msg}`);
    } finally {
      setSubmitting(false);
    }
  }

  function stopMining() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setMining(false);
    appendLog(`[WARN] Mining stopped by user at nonce=${nonce.toLocaleString()}`);
  }

  function reset() {
    setFoundNonce(null);
    setCurrentHash("");
    setNonce(0);
    setLog([]);
    setMineResult(null);
    setHashRate(0);
  }

  const hashColor = currentHash.startsWith("0000")
    ? "#10b981"
    : currentHash.startsWith("000")
    ? "#f59e0b"
    : "#ef4444";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ color: "#e2e8f0" }}>Mining</h2>
          <p style={{ color: "#64748b", fontSize: "13px" }}>
            Proof-of-Work — SHA-256, targetBits = 16
          </p>
        </div>
        <button
          onClick={() => setShowCode(!showCode)}
          className="flex items-center gap-2 px-3 py-1.5 rounded border text-xs transition-colors hover:bg-white/5"
          style={{ borderColor: "rgba(16,185,129,0.3)", color: "#10b981", fontFamily: "JetBrains Mono, monospace" }}
        >
          <Code size={12} />
          proofofwork.go
        </button>
      </div>

      {showCode && (
        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid rgba(16,185,129,0.2)" }}>
          <div className="flex items-center gap-2 px-4 py-2" style={{ background: "#131d2e", borderBottom: "1px solid rgba(16,185,129,0.1)" }}>
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <div className="w-2 h-2 rounded-full" style={{ background: "#10b981" }} />
            <span style={{ color: "#64748b", fontSize: "11px", marginLeft: "8px", fontFamily: "JetBrains Mono, monospace" }}>proofofwork.go</span>
          </div>
          <pre className="p-4 overflow-x-auto" style={{ background: "#080b0f", fontFamily: "JetBrains Mono, monospace", fontSize: "11px", lineHeight: "1.7", color: "#94a3b8" }}>
            {mineCode.split("\n").map((line, i) => (
              <span key={i} className="block">
                {line.startsWith("//") ? (
                  <span style={{ color: "#64748b" }}>{line}</span>
                ) : line.includes("✓") ? (
                  <span style={{ color: "#10b981" }}>{line}</span>
                ) : (
                  <span>
                    {line.split(/(func|for|if|break|return|fmt\.Printf)/g).map((part, j) =>
                      ["func", "for", "if", "break", "return", "fmt.Printf"].includes(part) ? (
                        <span key={j} style={{ color: "#8b5cf6" }}>{part}</span>
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

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="BLOCKS MINED"   value={minedBlocks.toString()}            icon={<CheckCircle size={14} style={{ color: "#10b981" }} />} />
        <StatCard label="HASH RATE"      value={mining ? `${hashRate}K/s` : "—"}   icon={<Cpu size={14} style={{ color: "#06b6d4" }} />} />
        <StatCard label="CURRENT NONCE"  value={mining ? nonce.toLocaleString() : foundNonce?.toLocaleString() ?? "—"} icon={<Zap size={14} style={{ color: "#f59e0b" }} />} />
      </div>

      {/* Miner config */}
      <div className="rounded-lg p-4 space-y-4" style={{ background: "#0e1520", border: "1px solid rgba(16,185,129,0.15)" }}>
        <p style={{ color: "#64748b", fontSize: "11px", fontFamily: "JetBrains Mono, monospace" }}>MINER CONFIGURATION</p>

        <div>
          <label style={{ color: "#94a3b8", fontSize: "11px", fontFamily: "JetBrains Mono, monospace", display: "block", marginBottom: "6px" }}>
            REWARD ADDRESS
            {balance !== null && (
              <span style={{ color: "#10b981", marginLeft: "12px" }}>
                current balance: {balance} coins
              </span>
            )}
          </label>
          {loadingWallets ? (
            <div style={{ color: "#64748b", fontSize: "12px", fontFamily: "JetBrains Mono, monospace", padding: "8px" }}>Loading wallets…</div>
          ) : wallets.length === 0 ? (
            <div style={{ color: "#f59e0b", fontSize: "12px", fontFamily: "JetBrains Mono, monospace", padding: "8px" }}>
              No wallets found — create one in the Wallets tab first.
            </div>
          ) : (
            <select
              className="w-full rounded px-3 py-2 outline-none text-sm"
              style={{ background: "#131d2e", border: "1px solid rgba(16,185,129,0.2)", color: "#e2e8f0", fontFamily: "JetBrains Mono, monospace", fontSize: "12px" }}
              value={minerAddr}
              onChange={(e) => setMinerAddr(e.target.value)}
              disabled={mining || submitting}
            >
              {wallets.map((w) => (
                <option key={w.address} value={w.address}>
                  {w.label} — {w.address.slice(0, 16)}…
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Note about first-time mining */}
        <div className="rounded p-3 text-xs" style={{ background: "#131d2e", color: "#64748b", fontFamily: "JetBrains Mono, monospace", lineHeight: "1.7" }}>
          <span style={{ color: "#f59e0b" }}>ℹ</span>{" "}
          Mining runs real PoW on the Go blockchain. The miner wallet needs at least 1 coin
          to self-send (the vehicle for a coinbase block). If this is a fresh chain with 0 coins,
          use <span style={{ color: "#10b981" }}>Block Explorer → Create Blockchain</span> first
          to mint the genesis coinbase reward, then come back here.
        </div>

        <div className="flex gap-3">
          {!mining && !submitting ? (
            <button
              onClick={foundNonce ? reset : startMining}
              disabled={!minerAddr}
              className="flex items-center gap-2 px-5 py-2.5 rounded font-medium transition-colors hover:opacity-90 disabled:opacity-40"
              style={{ background: "#10b981", color: "#080b0f", fontFamily: "JetBrains Mono, monospace", fontSize: "13px" }}
            >
              <Cpu size={14} />
              {foundNonce ? "Mine Again" : "Start Mining"}
            </button>
          ) : submitting ? (
            <div className="flex items-center gap-3 px-5 py-2.5" style={{ color: "#f59e0b", fontFamily: "JetBrains Mono, monospace", fontSize: "13px" }}>
              <span className="animate-spin">⟳</span>
              Submitting block to Go chain…
            </div>
          ) : (
            <button
              onClick={stopMining}
              className="flex items-center gap-2 px-5 py-2.5 rounded font-medium transition-colors hover:opacity-90"
              style={{ background: "#ef4444", color: "#fff", fontFamily: "JetBrains Mono, monospace", fontSize: "13px" }}
            >
              Stop Mining
            </button>
          )}
        </div>
      </div>

      {/* Result banner */}
      {mineResult && (
        <div
          className="rounded-lg p-4 space-y-2"
          style={{
            background: mineResult.success ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
            border: `1px solid ${mineResult.success ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
          }}
        >
          <div className="flex items-center gap-2" style={{ color: mineResult.success ? "#10b981" : "#ef4444", fontFamily: "JetBrains Mono, monospace", fontSize: "13px" }}>
            {mineResult.success ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            {mineResult.success
              ? `Block mined! Coinbase reward added to wallet. New balance: ${mineResult.newBalance} coins`
              : `Mining failed: ${mineResult.error}`}
          </div>
          {mineResult.hint && (
            <p style={{ color: "#f59e0b", fontSize: "11px", fontFamily: "JetBrains Mono, monospace" }}>
              {mineResult.hint}
            </p>
          )}
          {mineResult.rawOutput && (
            <pre style={{ color: "#64748b", fontSize: "10px", fontFamily: "JetBrains Mono, monospace", whiteSpace: "pre-wrap", marginTop: "8px" }}>
              {mineResult.rawOutput}
            </pre>
          )}
        </div>
      )}

      {/* Live hash display */}
      {(mining || currentHash) && (
        <div className="rounded-lg p-4 space-y-3" style={{ background: "#0e1520", border: `1px solid ${hashColor}30` }}>
          <div className="flex items-center justify-between">
            <p style={{ color: "#64748b", fontSize: "11px", fontFamily: "JetBrains Mono, monospace" }}>CURRENT HASH ATTEMPT</p>
            {mining && (
              <span className="flex items-center gap-1.5" style={{ color: "#f59e0b", fontSize: "11px", fontFamily: "JetBrains Mono, monospace" }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#f59e0b", display: "inline-block" }} />
                HASHING
              </span>
            )}
            {foundNonce && !mining && (
              <span className="flex items-center gap-1.5" style={{ color: "#10b981", fontSize: "11px", fontFamily: "JetBrains Mono, monospace" }}>
                <CheckCircle size={11} />
                VALID HASH FOUND
              </span>
            )}
          </div>

          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-1">
              <span style={{ color: "#64748b", fontSize: "10px", fontFamily: "JetBrains Mono, monospace" }}>nonce:</span>
              <div style={{ color: "#06b6d4", fontFamily: "JetBrains Mono, monospace", fontSize: "16px", fontWeight: 700 }}>
                {nonce.toLocaleString()}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <span style={{ color: "#64748b", fontSize: "10px", fontFamily: "JetBrains Mono, monospace" }}>sha256(block_data + nonce):</span>
              <div className="mt-1 break-all" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "13px", color: hashColor, wordBreak: "break-all", lineHeight: "1.5" }}>
                <span style={{ color: "#10b981", fontWeight: 700 }}>{currentHash.slice(0, 4)}</span>
                <span>{currentHash.slice(4)}</span>
              </div>
            </div>
          </div>

          <div className="rounded p-3" style={{ background: "#131d2e" }}>
            <span style={{ color: "#64748b", fontSize: "10px", fontFamily: "JetBrains Mono, monospace" }}>target (must be ≤):</span>
            <div style={{ color: "#374151", fontFamily: "JetBrains Mono, monospace", fontSize: "13px", marginTop: "2px" }}>
              <span style={{ color: "#10b981" }}>0000</span>{"ffff".repeat(15)}
            </div>
          </div>
        </div>
      )}

      {/* Terminal log */}
      {log.length > 0 && (
        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid rgba(16,185,129,0.15)" }}>
          <div className="px-4 py-2" style={{ background: "#131d2e", borderBottom: "1px solid rgba(16,185,129,0.1)" }}>
            <span style={{ color: "#64748b", fontSize: "11px", fontFamily: "JetBrains Mono, monospace" }}>MINING LOG</span>
          </div>
          <div
            ref={logRef}
            className="p-4 space-y-0.5 overflow-y-auto"
            style={{ background: "#060910", maxHeight: "220px", fontFamily: "JetBrains Mono, monospace", fontSize: "11px" }}
          >
            {log.map((line, i) => (
              <div
                key={i}
                style={{
                  color: line.startsWith("[SUCCESS]") || line.startsWith("[CHAIN]")
                    ? "#10b981"
                    : line.startsWith("[WARN]")
                    ? "#f59e0b"
                    : line.startsWith("[INFO]")
                    ? "#06b6d4"
                    : line.startsWith("[ERROR]")
                    ? "#ef4444"
                    : line.startsWith("[HINT]")
                    ? "#f59e0b"
                    : "#64748b",
                }}
              >
                {line}
              </div>
            ))}
            {(mining || submitting) && <div style={{ color: "#10b981" }} className="animate-pulse">▋</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg p-4" style={{ background: "#0e1520", border: "1px solid rgba(16,185,129,0.15)" }}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span style={{ color: "#64748b", fontSize: "10px", fontFamily: "JetBrains Mono, monospace" }}>{label}</span>
      </div>
      <div style={{ color: "#e2e8f0", fontFamily: "JetBrains Mono, monospace", fontSize: "20px", fontWeight: 700 }}>{value}</div>
    </div>
  );
}
