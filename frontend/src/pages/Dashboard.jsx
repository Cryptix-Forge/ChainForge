import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Layers, Wallet, ArrowRightLeft, Cpu, RefreshCw } from "lucide-react";
import { getHeight, listWallets, getTxHistory } from "../api";

export default function Dashboard({ toast }) {
  const [height, setHeight]   = useState(null);
  const [wallets, setWallets] = useState([]);
  const [txs, setTxs]         = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [h, w, t] = await Promise.allSettled([
        getHeight(), listWallets(), getTxHistory(null, 1),
      ]);
      if (h.status === "fulfilled") setHeight(h.value.data);
      if (w.status === "fulfilled") setWallets(w.value.data.wallets || []);
      if (t.status === "fulfilled") setTxs(t.value.data.transactions || []);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const chartData = (() => {
    const result = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return { day: d.toLocaleDateString("en", { weekday: "short" }), val: 0, date: d.toDateString() };
    });
    txs.forEach((tx) => {
      const txDate = new Date(tx.timestamp).toDateString();
      const entry = result.find((r) => r.date === txDate);
      if (entry) entry.val += tx.amount;
    });
    return result;
  })();

  const successTx = txs.filter((t) => t.status === "success").length;

  return (
    <>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-sub">ChainForge node overview</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={load}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <div className="loading-dots"><span /><span /><span /></div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-label">Block Height</div>
                <div className="stat-value">{height?.height ?? "—"}</div>
                <Layers size={42} className="stat-icon" />
              </div>
              <div className="stat-card">
                <div className="stat-label">Total Blocks</div>
                <div className="stat-value">{height?.totalBlocks ?? "—"}</div>
                <Cpu size={42} className="stat-icon" />
              </div>
              <div className="stat-card">
                <div className="stat-label">Wallets</div>
                <div className="stat-value brass">{wallets.length}</div>
                <Wallet size={42} className="stat-icon" />
              </div>
              <div className="stat-card">
                <div className="stat-label">Confirmed Txs</div>
                <div className="stat-value green">{successTx}</div>
                <ArrowRightLeft size={42} className="stat-icon" />
              </div>
            </div>

            {/* Chart */}
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Transaction Volume — Last 7 Days</span>
              </div>
              <div className="panel-body">
                {chartData.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon"><ArrowRightLeft size={34} /></div>
                    No transaction data yet
                  </div>
                ) : (
                  <div className="chart-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                        <XAxis
                          dataKey="day"
                          tick={{ fill: "var(--ink3)", fontSize: 10, fontFamily: "var(--sans)" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: "var(--ink3)", fontSize: 10, fontFamily: "var(--sans)" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "var(--surface)",
                            border: "1px solid var(--line)",
                            borderRadius: 8,
                            fontSize: 12,
                            fontFamily: "var(--sans)",
                            color: "var(--ink)",
                            boxShadow: "var(--shadow-md)",
                          }}
                          cursor={{ fill: "rgba(28,26,23,0.03)" }}
                        />
                        <Bar dataKey="val" radius={[4, 4, 0, 0]}>
                          {chartData.map((_, i) => (
                            <Cell
                              key={i}
                              fill={
                                i === chartData.length - 1
                                  ? "var(--ink)"
                                  : "var(--line2)"
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Recent Transactions</span>
              </div>
              {txs.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon"><ArrowRightLeft size={34} /></div>
                  No transactions logged yet
                </div>
              ) : (
                <table className="tx-table">
                  <thead>
                    <tr>
                      <th>TXID</th>
                      <th>FROM</th>
                      <th>TO</th>
                      <th>AMOUNT</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txs.slice(0, 6).map((tx) => (
                      <tr key={tx._id}>
                        <td style={{ fontFamily: "monospace" }}>{tx.txid.slice(0, 16)}…</td>
                        <td style={{ fontFamily: "monospace" }}>{tx.from.slice(0, 12)}…</td>
                        <td style={{ fontFamily: "monospace" }}>{tx.to.slice(0, 12)}…</td>
                        <td className="amount-out">−{tx.amount}</td>
                        <td>
                          <span className={`status-pill status-${tx.status}`}>{tx.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
