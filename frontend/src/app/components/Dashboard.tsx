import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Layers, Wallet, ArrowLeftRight, Cpu, ArrowRight } from "lucide-react";
import { getBlocks, listWallets, getTxHistory, type ApiBlock, type ApiTx, type ApiWallet } from "../api";
import { shortAddress, shortHash } from "./mockData";

type Props = {
  onNav: (page: string) => void;
  transactions?: any[];
};

export function Dashboard({ onNav }: Props) {
  const [blocks, setBlocks] = useState<ApiBlock[]>([]);
  const [wallets, setWallets] = useState<ApiWallet[]>([]);
  const [addresses, setAddresses] = useState<string[]>([]);
  const [transactions, setTransactions] = useState<ApiTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [blocksRes, walletsRes, txRes] = await Promise.all([
          getBlocks(),
          listWallets(),
          getTxHistory(),
        ]);
        setBlocks(blocksRes.blocks || []);
        // addresses comes from the Go binary reading wallet_3000.dat directly — always accurate
        // wallets comes from MongoDB cache — can be stale across resets, only used for metadata
        setAddresses(walletsRes.addresses || []);
        setWallets(walletsRes.wallets || []);
        setTransactions(txRes.transactions || []);
      } catch (e: any) {
        setError(e.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const latestBlock = blocks[0];
  const totalBlocks = blocks.length;

  // Build last-7-days chart from real transaction timestamps
  const chartData = (() => {
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const counts: Record<string, number> = {};
    const now = new Date();
    // initialise last 7 days with 0
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      counts[days[d.getDay()]] = 0;
    }
    // sum tx amounts per day
    transactions.forEach(tx => {
      const d = new Date(tx.timestamp);
      const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
      if (diffDays <= 6) {
        const key = days[d.getDay()];
        counts[key] = (counts[key] || 0) + (tx.amount || 1);
      }
    });
    return Object.entries(counts).map(([day, vol]) => ({ day, vol }));
  })();

  return (
    <div className="space-y-6">
      <div>
        <h2 style={{ color: "#e2e8f0" }}>Dashboard</h2>
        <p style={{ color: "#64748b", fontSize: "13px" }}>
          ChainForge node overview — NODE_ID: 3000
          {loading && <span style={{ color: "#f59e0b", marginLeft: "8px" }}>loading…</span>}
          {error && <span style={{ color: "#ef4444", marginLeft: "8px" }}>⚠ {error}</span>}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="BLOCK HEIGHT"
          value={latestBlock?.height ?? 0}
          icon={<Layers size={16} style={{ color: "#10b981" }} />}
          sub={`${totalBlocks} blocks`}
          color="#10b981"
        />
        <StatCard
          label="WALLETS"
          value={addresses.length}
          icon={<Wallet size={16} style={{ color: "#06b6d4" }} />}
          sub="in wallet_3000.dat"
          color="#06b6d4"
        />
        <StatCard
          label="TRANSACTIONS"
          value={transactions.length}
          icon={<ArrowLeftRight size={16} style={{ color: "#8b5cf6" }} />}
          sub="in history"
          color="#8b5cf6"
        />
        <StatCard
          label="TOTAL TX ACROSS BLOCKS"
          value={blocks.reduce((s, b) => s + (b.txCount || 0), 0)}
          icon={<Cpu size={16} style={{ color: "#f59e0b" }} />}
          sub="mined txs"
          color="#f59e0b"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Chart */}
        <div className="lg:col-span-2 rounded-lg p-5" style={{ background: "#0e1520", border: "1px solid rgba(16,185,129,0.15)" }}>
          <p style={{ color: "#64748b", fontSize: "11px", fontFamily: "JetBrains Mono, monospace", marginBottom: "16px" }}>
            TRANSACTION VOLUME — LAST 7 DAYS
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={24}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: "#131d2e", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "6px", color: "#e2e8f0", fontFamily: "JetBrains Mono, monospace", fontSize: "12px" }}
                cursor={{ fill: "rgba(16,185,129,0.05)" }}
              />
              <Bar dataKey="vol" fill="#10b981" radius={[3, 3, 0, 0]} name="coins" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick actions */}
        <div className="rounded-lg p-5 space-y-2" style={{ background: "#0e1520", border: "1px solid rgba(16,185,129,0.15)" }}>
          <p style={{ color: "#64748b", fontSize: "11px", fontFamily: "JetBrains Mono, monospace", marginBottom: "12px" }}>QUICK ACTIONS</p>
          {[
            { label: "Create Wallet",  cmd: "createwallet",           page: "wallets",  color: "#10b981" },
            { label: "Send Coins",     cmd: "send -from … -to … -mine", page: "send",   color: "#06b6d4" },
            { label: "Mine Block",     cmd: "mine -address …",         page: "mining",  color: "#f59e0b" },
            { label: "Explore Chain",  cmd: "printchain",              page: "explorer", color: "#8b5cf6" },
          ].map((action) => (
            <button
              key={action.page}
              onClick={() => onNav(action.page)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded transition-colors hover:bg-white/5 text-left"
              style={{ border: "1px solid rgba(16,185,129,0.1)" }}
            >
              <div className="w-1.5 h-5 rounded-full shrink-0" style={{ background: action.color }} />
              <div className="flex-1 min-w-0">
                <div style={{ color: "#e2e8f0", fontSize: "13px" }}>{action.label}</div>
                <div style={{ color: "#64748b", fontSize: "10px", fontFamily: "JetBrains Mono, monospace" }}>$ chainforge {action.cmd}</div>
              </div>
              <ArrowRight size={12} style={{ color: "#374151" }} />
            </button>
          ))}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="rounded-lg p-5" style={{ background: "#0e1520", border: "1px solid rgba(16,185,129,0.15)" }}>
        <div className="flex items-center justify-between mb-4">
          <p style={{ color: "#64748b", fontSize: "11px", fontFamily: "JetBrains Mono, monospace" }}>RECENT TRANSACTIONS</p>
          <button onClick={() => onNav("history")} style={{ color: "#10b981", fontSize: "11px", fontFamily: "JetBrains Mono, monospace" }}>
            View all →
          </button>
        </div>
        <div className="space-y-2">
          {transactions.slice(0, 4).map((tx) => (
            <div key={tx.txId} className="flex items-center gap-4 py-2 border-b" style={{ borderColor: "rgba(16,185,129,0.05)" }}>
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#10b981" }} />
              <span style={{ color: "#64748b", fontFamily: "JetBrains Mono, monospace", fontSize: "11px" }}>
                {shortHash(tx.txId)}
              </span>
              <span style={{ color: "#94a3b8", fontSize: "12px" }}>{shortAddress(tx.from)}</span>
              <ArrowRight size={10} style={{ color: "#374151" }} />
              <span style={{ color: "#94a3b8", fontSize: "12px" }}>{shortAddress(tx.to)}</span>
              <span style={{ color: "#10b981", fontFamily: "JetBrains Mono, monospace", fontSize: "12px", marginLeft: "auto" }}>
                {tx.amount} ⬡
              </span>
            </div>
          ))}
          {transactions.length === 0 && !loading && (
            <div style={{ color: "#374151", fontSize: "13px", fontFamily: "JetBrains Mono, monospace", textAlign: "center", padding: "24px" }}>
              No transactions yet — send some coins!
            </div>
          )}
        </div>
      </div>

      {/* Latest block */}
      {latestBlock && (
        <div className="rounded-lg p-5" style={{ background: "#0e1520", border: "1px solid rgba(16,185,129,0.15)" }}>
          <p style={{ color: "#64748b", fontSize: "11px", fontFamily: "JetBrains Mono, monospace", marginBottom: "16px" }}>LATEST BLOCK</p>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: "Height", value: `#${latestBlock.height}` },
              { label: "Hash",   value: shortHash(latestBlock.hash) },
              { label: "Nonce",  value: latestBlock.nonce.toLocaleString() },
              { label: "TXs",    value: `${latestBlock.txCount} transaction(s)` },
            ].map((item) => (
              <div key={item.label}>
                <p style={{ color: "#64748b", fontSize: "10px", fontFamily: "JetBrains Mono, monospace" }}>{item.label}</p>
                <p style={{ color: "#10b981", fontFamily: "JetBrains Mono, monospace", fontSize: "13px", marginTop: "4px" }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, sub, color }: { label: string; value: number; icon: React.ReactNode; sub: string; color: string }) {
  return (
    <div className="rounded-lg p-4" style={{ background: "#0e1520", border: "1px solid rgba(16,185,129,0.15)" }}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span style={{ color: "#64748b", fontSize: "10px", fontFamily: "JetBrains Mono, monospace" }}>{label}</span>
      </div>
      <div style={{ color, fontFamily: "JetBrains Mono, monospace", fontSize: "28px", fontWeight: 700, lineHeight: 1 }}>{value}</div>
      <div style={{ color: "#64748b", fontSize: "11px", fontFamily: "JetBrains Mono, monospace", marginTop: "6px" }}>{sub}</div>
    </div>
  );
}
