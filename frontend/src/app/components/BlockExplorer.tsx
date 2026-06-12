import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Link2, Hash, Clock, ArrowRight } from "lucide-react";
import { getBlocks, getBlockchainExists, createBlockchain, type ApiBlock } from "../api";
import { shortHash, shortAddress } from "./mockData";

function BlockCard({ block, isExpanded, onToggle }: { block: ApiBlock; isExpanded: boolean; onToggle: () => void }) {
  const isGenesis = block.height === 0;
  return (
    <div
      className="border rounded-lg overflow-hidden transition-all duration-200"
      style={{ borderColor: isGenesis ? "rgba(16,185,129,0.5)" : "rgba(16,185,129,0.15)", background: "#0e1520" }}
    >
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
        onClick={onToggle}
      >
        <div
          className="flex items-center justify-center w-8 h-8 rounded text-xs font-bold shrink-0"
          style={{ background: isGenesis ? "#10b981" : "#131d2e", color: isGenesis ? "#080b0f" : "#10b981", fontFamily: "JetBrains Mono, monospace" }}
        >
          #{block.height}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ fontFamily: "JetBrains Mono, monospace", color: "#10b981", fontSize: "12px" }}>
              {shortHash(block.hash)}
            </span>
            {isGenesis && (
              <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", fontFamily: "JetBrains Mono, monospace" }}>
                GENESIS
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5" style={{ color: "#64748b", fontSize: "11px" }}>
            <span className="flex items-center gap-1">
              <Clock size={10} />
              block #{block.height}
            </span>
            <span>{block.txCount} tx</span>
            <span>nonce: {block.nonce.toLocaleString()}</span>
            <span style={{ color: block.pow === 'true' ? "#10b981" : "#ef4444" }}>
              PoW: {block.pow}
            </span>
          </div>
        </div>
        {isExpanded ? <ChevronDown size={14} style={{ color: "#64748b" }} /> : <ChevronRight size={14} style={{ color: "#64748b" }} />}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: "rgba(16,185,129,0.1)" }}>
          <div className="grid grid-cols-1 gap-2 mt-3">
            <HashRow label="Hash"      value={block.hash} />
            <HashRow label="Prev Hash" value={block.prevHash} dim={isGenesis} />
            <HashRow label="Nonce"     value={block.nonce.toString()} mono />
            <HashRow label="PoW Valid" value={block.pow} mono />
          </div>

          {block.transactions.length > 0 && (
            <div>
              <p style={{ color: "#64748b", fontSize: "11px", marginBottom: "8px", fontFamily: "JetBrains Mono, monospace" }}>
                TRANSACTIONS ({block.transactions.length})
              </p>
              {block.transactions.map((tx) => (
                <div key={tx.id} className="rounded p-3 space-y-1" style={{ background: "#131d2e", border: "1px solid rgba(16,185,129,0.1)" }}>
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#64748b" }}>
                    {shortHash(tx.id)}
                  </div>
                  <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                    TX ID: {tx.id}
                  </div>
                </div>
              ))}
            </div>
          )}

          {block.transactions.length === 0 && (
            <div className="rounded p-3 text-center" style={{ background: "#131d2e", color: "#64748b", fontSize: "12px" }}>
              Coinbase only — miner reward block
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HashRow({ label, value, dim = false, mono = false }: { label: string; value: string; dim?: boolean; mono?: boolean }) {
  return (
    <div className="flex gap-3 text-xs items-start">
      <span className="shrink-0 w-20" style={{ color: "#64748b", fontFamily: "JetBrains Mono, monospace" }}>{label}</span>
      <span
        className="break-all"
        style={{
          fontFamily: "JetBrains Mono, monospace",
          color: dim ? "#374151" : mono ? "#94a3b8" : "#10b981",
          wordBreak: "break-all",
        }}
      >
        {value}
      </span>
    </div>
  );
}

const goCode = `// proofofwork.go
const targetBits = 16

func (pow *ProofOfWork) Run() (int, []byte) {
    var hashInt big.Int
    var hash [32]byte
    nonce := 0

    for nonce < maxNonce {
        data := pow.prepareData(nonce)
        hash = sha256.Sum256(data)
        hashInt.SetBytes(hash[:])

        // Check if hash has enough leading zeros
        if hashInt.Cmp(pow.target) == -1 {
            break // Valid nonce found!
        }
        nonce++
    }
    return nonce, hash[:]
}`;

export function BlockExplorer({ onCreateWallet }: { onCreateWallet: () => void }) {
  const [blocks, setBlocks] = useState<ApiBlock[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [chainExists, setChainExists] = useState(true);
  const [genesisAddr, setGenesisAddr] = useState("");
  const [creatingChain, setCreatingChain] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadBlocks() {
    setLoading(true);
    setError(null);
    try {
      const existsRes = await getBlockchainExists();
      setChainExists(existsRes.exists);
      if (existsRes.exists) {
        const res = await getBlocks();
        // backend returns newest-first, keep that order
        setBlocks(res.blocks || []);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadBlocks(); }, []);

  async function handleCreate() {
    if (!genesisAddr.trim()) return;
    setCreatingChain(true);
    try {
      await createBlockchain(genesisAddr.trim());
      await loadBlocks();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreatingChain(false);
    }
  }

  // blocks from backend are sorted height desc; reverse for visual chain (left=genesis)
  const orderedForViz = [...blocks].reverse();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ color: "#e2e8f0" }}>Block Explorer</h2>
          <p style={{ color: "#64748b", fontSize: "13px" }}>
            Visual representation of the blockchain ledger
            {loading && <span style={{ color: "#f59e0b", marginLeft: "8px" }}>loading…</span>}
            {error && <span style={{ color: "#ef4444", marginLeft: "8px" }}>⚠ {error}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadBlocks}
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
            <Hash size={12} />
            {showCode ? "Hide" : "Show"} PoW Code
          </button>
        </div>
      </div>

      {showCode && (
        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid rgba(16,185,129,0.2)" }}>
          <div className="flex items-center gap-2 px-4 py-2" style={{ background: "#131d2e", borderBottom: "1px solid rgba(16,185,129,0.1)" }}>
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <div className="w-2 h-2 rounded-full" style={{ background: "#10b981" }} />
            <span style={{ color: "#64748b", fontSize: "11px", marginLeft: "8px", fontFamily: "JetBrains Mono, monospace" }}>proofofwork.go</span>
          </div>
          <pre className="p-4 overflow-x-auto" style={{ background: "#080b0f", fontFamily: "JetBrains Mono, monospace", fontSize: "12px", lineHeight: "1.6", color: "#94a3b8" }}>
            <code>{goCode.split('\n').map((line, i) => (
              <span key={i} className="block">
                {line.startsWith('//') ? (
                  <span style={{ color: "#64748b" }}>{line}</span>
                ) : ['const','func','for','if','break','return'].some(kw => line.includes(kw)) ? (
                  <span>
                    {line.split(/(const|func|for|if|break|return|var)/g).map((part, j) =>
                      ['const','func','for','if','break','return','var'].includes(part)
                        ? <span key={j} style={{ color: "#8b5cf6" }}>{part}</span>
                        : <span key={j}>{part}</span>
                    )}
                  </span>
                ) : line}
              </span>
            ))}</code>
          </pre>
        </div>
      )}

      {/* Visual Chain */}
      <div className="rounded-lg p-4" style={{ background: "#0e1520", border: "1px solid rgba(16,185,129,0.15)" }}>
        <p style={{ color: "#64748b", fontSize: "11px", marginBottom: "16px", fontFamily: "JetBrains Mono, monospace" }}>CHAIN VISUALIZATION</p>
        <div className="flex items-center gap-0 overflow-x-auto pb-2">
          {orderedForViz.map((block, idx) => (
            <div key={block.hash} className="flex items-center shrink-0">
              <button
                onClick={() => setExpanded(expanded === block.height ? null : block.height)}
                className="flex flex-col items-center p-3 rounded-lg transition-all hover:scale-105"
                style={{
                  background: expanded === block.height ? "rgba(16,185,129,0.15)" : "#131d2e",
                  border: `1px solid ${expanded === block.height ? "#10b981" : "rgba(16,185,129,0.2)"}`,
                  minWidth: "90px",
                }}
              >
                <div style={{ fontSize: "10px", color: "#64748b", fontFamily: "JetBrains Mono, monospace" }}>
                  {idx === 0 ? "GENESIS" : "BLOCK"}
                </div>
                <div style={{ color: "#10b981", fontFamily: "JetBrains Mono, monospace", fontSize: "16px", fontWeight: 700 }}>
                  #{block.height}
                </div>
                <div style={{ fontSize: "9px", color: "#374151", fontFamily: "JetBrains Mono, monospace", marginTop: "2px" }}>
                  {block.hash.slice(0, 8)}…
                </div>
                {block.txCount > 0 && (
                  <div className="mt-1 px-1.5 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.2)", color: "#10b981", fontSize: "9px", fontFamily: "JetBrains Mono, monospace" }}>
                    {block.txCount} tx
                  </div>
                )}
              </button>
              {idx < orderedForViz.length - 1 && (
                <div className="flex items-center" style={{ margin: "0 4px" }}>
                  <div style={{ width: "20px", height: "1px", background: "rgba(16,185,129,0.4)" }} />
                  <Link2 size={10} style={{ color: "rgba(16,185,129,0.5)" }} />
                </div>
              )}
            </div>
          ))}
          <div className="flex items-center shrink-0 ml-1">
            <div style={{ width: "20px", height: "1px", background: "rgba(16,185,129,0.2)" }} />
            <div
              className="flex flex-col items-center justify-center p-3 rounded-lg"
              style={{ background: "#0a0e17", border: "1px dashed rgba(16,185,129,0.2)", minWidth: "90px" }}
            >
              <div style={{ color: "#374151", fontSize: "20px" }}>+</div>
              <div style={{ color: "#374151", fontSize: "9px", fontFamily: "JetBrains Mono, monospace" }}>next block</div>
            </div>
          </div>
        </div>
      </div>

      {!chainExists && (
        <div className="rounded-lg p-5" style={{ background: "#0e1520", border: "1px solid rgba(245,158,11,0.3)" }}>
          <p style={{ color: "#f59e0b", fontSize: "12px", marginBottom: "12px", fontFamily: "JetBrains Mono, monospace" }}>
            ⚠ No blockchain found. Initialize with a genesis block.
          </p>
          <div className="flex gap-3">
            <input
              className="flex-1 rounded px-3 py-2 text-sm outline-none focus:ring-1"
              style={{ background: "#131d2e", border: "1px solid rgba(16,185,129,0.2)", color: "#e2e8f0", fontFamily: "JetBrains Mono, monospace", fontSize: "12px" }}
              placeholder="Genesis reward address (1K6iLUQ6...)"
              value={genesisAddr}
              onChange={(e) => setGenesisAddr(e.target.value)}
            />
            <button
              onClick={handleCreate}
              disabled={creatingChain}
              className="px-4 py-2 rounded text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-50"
              style={{ background: "#10b981", color: "#080b0f", fontFamily: "JetBrains Mono, monospace" }}
            >
              {creatingChain ? "Creating…" : "Create Blockchain"}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p style={{ color: "#64748b", fontSize: "11px", fontFamily: "JetBrains Mono, monospace" }}>
          BLOCKS — {blocks.length} total, newest first
        </p>
        {blocks.map((block) => (
          <BlockCard
            key={block.hash}
            block={block}
            isExpanded={expanded === block.height}
            onToggle={() => setExpanded(expanded === block.height ? null : block.height)}
          />
        ))}
      </div>
    </div>
  );
}
