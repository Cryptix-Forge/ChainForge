import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, Filter } from "lucide-react";
import { getTxHistory, listWallets } from "../api";

export default function Transactions({ toast }) {
  const [txs, setTxs]         = useState([]);
  const [wallets, setWallets] = useState([]);
  const [filter, setFilter]   = useState("");
  const [meta, setMeta]       = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (addr = filter, page = 1) => {
      setLoading(true);
      try {
        const { data } = await getTxHistory(addr || null, page);
        setTxs(data.transactions || []);
        setMeta({ page: data.page, pages: data.pages, total: data.total });
      } catch (e) {
        toast(e.response?.data?.error || e.message, "error");
      }
      setLoading(false);
    },
    [filter, toast]
  );

  useEffect(() => {
    load();
    listWallets()
      .then((r) => setWallets(r.data.wallets || []))
      .catch(() => {});
  }, []);

  const applyFilter = (addr) => {
    setFilter(addr);
    load(addr, 1);
  };

  return (
    <>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Tx History</h1>
            <p className="page-sub">
              {meta.total} transaction{meta.total !== 1 ? "s" : ""} logged
            </p>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => load(filter, meta.page)}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Filter Panel */}
        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-header">
            <span className="panel-title" style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Filter size={12} /> Filter Transactions
            </span>
          </div>
          <div className="panel-body" style={{ paddingTop: 16, paddingBottom: 16 }}>
            <div className="flex gap-3 items-center" style={{ flexWrap: "wrap" }}>
              <div className="field" style={{ flex: 1, minWidth: 220, marginBottom: 0 }}>
                <label>Filter by Address</label>
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Paste address or leave empty for all"
                />
              </div>

              {wallets.length > 0 && (
                <div className="field" style={{ marginBottom: 0, minWidth: 160 }}>
                  <label>Quick Select</label>
                  <select onChange={(e) => applyFilter(e.target.value)} value={filter}>
                    <option value="">— All wallets —</option>
                    {wallets.map((w) => (
                      <option key={w.address} value={w.address}>
                        {w.label || w.address.slice(0, 16) + "…"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: "flex", gap: 7, marginTop: 18 }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => applyFilter(filter)}
                >
                  Apply
                </button>
                {filter && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => applyFilter("")}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-dots"><span /><span /><span /></div>
        ) : txs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon" style={{ fontSize: 32 }}>📋</div>
            No transactions match this filter.
          </div>
        ) : (
          <div className="panel">
            <table className="tx-table">
              <thead>
                <tr>
                  <th>TXID</th>
                  <th>FROM</th>
                  <th>TO</th>
                  <th>AMOUNT</th>
                  <th>MINED</th>
                  <th>STATUS</th>
                  <th>DATE</th>
                </tr>
              </thead>
              <tbody>
                {txs.map((tx) => (
                  <tr key={tx._id}>
                    <td title={tx.txid} style={{ fontFamily: "monospace" }}>
                      {tx.txid.slice(0, 14)}…
                    </td>
                    <td title={tx.from} style={{ fontFamily: "monospace" }}>
                      {tx.from.slice(0, 12)}…
                    </td>
                    <td title={tx.to} style={{ fontFamily: "monospace" }}>
                      {tx.to.slice(0, 12)}…
                    </td>
                    <td className="amount-out">−{tx.amount}</td>
                    <td>
                      {tx.mined
                        ? <span style={{ color: "var(--emerald)", fontSize: 12 }}>Yes</span>
                        : <span style={{ color: "var(--ink3)", fontSize: 12 }}>No</span>}
                    </td>
                    <td>
                      <span
                        className={`status-pill status-${
                          tx.status === "success"
                            ? "success"
                            : tx.status === "pending"
                            ? "pending"
                            : "failed"
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td style={{ color: "var(--ink3)" }}>
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {meta.pages > 1 && (
              <div className="pagination" style={{ padding: "16px 0 8px" }}>
                <button
                  className="pg-btn"
                  disabled={meta.page <= 1}
                  onClick={() => load(filter, meta.page - 1)}
                >← Prev</button>
                {Array.from({ length: meta.pages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    className={`pg-btn${p === meta.page ? " active" : ""}`}
                    onClick={() => load(filter, p)}
                  >{p}</button>
                ))}
                <button
                  className="pg-btn"
                  disabled={meta.page >= meta.pages}
                  onClick={() => load(filter, meta.page + 1)}
                >Next →</button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
