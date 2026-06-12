import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { getBlocks, createChain, reindex } from "../api";

export default function Explorer({ toast }) {
  const [blocks, setBlocks]     = useState([]);
  const [meta, setMeta]         = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [newAddr, setNewAddr]   = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await getBlocks(page);
      setBlocks(data.blocks || []);
      setMeta({ page: data.page, pages: data.pages, total: data.total });
    } catch (e) {
      toast(e.response?.data?.error || e.message, "error");
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(1); }, [load]);

  const handleCreate = async () => {
    if (!newAddr.trim()) return toast("Enter a valid address", "error");
    setCreating(true);
    try {
      const { data } = await createChain(newAddr.trim());
      toast(data.message || "Blockchain created!", "success");
      load(1);
    } catch (e) {
      toast(e.response?.data?.error || e.message, "error");
    }
    setCreating(false);
  };

  const handleReindex = async () => {
    try {
      const { data } = await reindex();
      toast(data.message || `Reindexed — ${data.utxoCount} UTXOs`, "success");
    } catch (e) {
      toast(e.response?.data?.error || e.message, "error");
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Block Explorer</h1>
            <p className="page-sub">
              {meta.total} block{meta.total !== 1 ? "s" : ""} on chain
            </p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-secondary btn-sm" onClick={handleReindex}>
              Reindex UTXO
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => load(meta.page)}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Create Blockchain */}
        <div className="panel" style={{ marginBottom: 24 }}>
          <div className="panel-header">
            <span className="panel-title">Initialize Blockchain</span>
          </div>
          <div className="panel-body">
            <div className="flex gap-3 items-center" style={{ flexWrap: "wrap" }}>
              <div className="field" style={{ flex: 1, minWidth: 220, marginBottom: 0 }}>
                <label>Genesis Reward Address</label>
                <input
                  value={newAddr}
                  onChange={(e) => setNewAddr(e.target.value)}
                  placeholder="Paste a wallet address…"
                />
              </div>
              <button
                className="btn btn-primary"
                style={{ marginTop: 18 }}
                onClick={handleCreate}
                disabled={creating}
              >
                {creating ? "Creating…" : "Create Blockchain"}
              </button>
            </div>
          </div>
        </div>

        {/* Block List */}
        {loading ? (
          <div className="loading-dots"><span /><span /><span /></div>
        ) : blocks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon" style={{ fontSize: 36 }}>⛓</div>
            No blocks found — initialize a blockchain above.
          </div>
        ) : (
          <>
            <div className="block-chain">
              {blocks.map((block) => (
                <div
                  key={block.hash}
                  className={`block-card${expanded === block.hash ? " expanded" : ""}`}
                >
                  <div
                    className="block-header"
                    onClick={() =>
                      setExpanded(expanded === block.hash ? null : block.hash)
                    }
                  >
                    <span className="block-height-badge">#{block.height}</span>
                    <span className="block-hash">{block.hash}</span>
                    <span className="block-tx-count">{block.txCount} tx</span>
                    <span className="block-pow">
                      {block.powValid ? "PoW ✓" : "PoW ✗"}
                    </span>
                    {expanded === block.hash
                      ? <ChevronUp size={14} color="var(--ink3)" />
                      : <ChevronDown size={14} color="var(--ink3)" />}
                  </div>

                  {expanded === block.hash && (
                    <div className="block-body">
                      <div className="block-meta-grid">
                        <div>
                          <div className="block-meta-label">Hash</div>
                          <div className="block-meta-val">{block.hash}</div>
                        </div>
                        <div>
                          <div className="block-meta-label">Prev Hash</div>
                          <div className="block-meta-val">{block.prevHash || "—"}</div>
                        </div>
                        <div>
                          <div className="block-meta-label">Timestamp</div>
                          <div className="block-meta-val">
                            {block.timestamp
                              ? new Date(block.timestamp).toLocaleString()
                              : "—"}
                          </div>
                        </div>
                        <div>
                          <div className="block-meta-label">Transactions</div>
                          <div className="block-meta-val">{block.txCount}</div>
                        </div>
                      </div>

                      {block.transactions?.length > 0 && (
                        <div className="tx-list">
                          {block.transactions.map((tx) => (
                            <div key={tx.txid} className="tx-item">
                              <div className="tx-id">
                                {tx.txid}
                                {tx.isCoinbase && (
                                  <span className="tx-coinbase-tag">COINBASE</span>
                                )}
                              </div>
                              <div className="io-row">
                                <span>
                                  {tx.inputs?.length || 0} input
                                  {tx.inputs?.length !== 1 ? "s" : ""}
                                </span>
                                <span>→</span>
                                <span>
                                  {tx.outputs?.length || 0} output
                                  {tx.outputs?.length !== 1 ? "s" : ""}
                                </span>
                                {tx.outputs?.length > 0 && (
                                  <span style={{ marginLeft: "auto", color: "var(--emerald)" }}>
                                    {tx.outputs.reduce((a, o) => a + (o.value || 0), 0)} coins
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {meta.pages > 1 && (
              <div className="pagination">
                <button
                  className="pg-btn"
                  disabled={meta.page <= 1}
                  onClick={() => load(meta.page - 1)}
                >← Prev</button>
                {Array.from({ length: meta.pages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    className={`pg-btn${p === meta.page ? " active" : ""}`}
                    onClick={() => load(p)}
                  >{p}</button>
                ))}
                <button
                  className="pg-btn"
                  disabled={meta.page >= meta.pages}
                  onClick={() => load(meta.page + 1)}
                >Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
