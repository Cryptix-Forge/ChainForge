import { useState } from "react";
import {
  LayoutDashboard,
  Wallet,
  Send,
  Cpu,
  Search,
  History,
  ChevronRight,
  Terminal,
  Menu,
  X,
} from "lucide-react";
import { Dashboard } from "./components/Dashboard";
import { BlockExplorer } from "./components/BlockExplorer";
import { Wallets } from "./components/Wallets";
import { Mining } from "./components/Mining";
import { SendTransaction } from "./components/SendTransaction";
import { TxHistory } from "./components/TxHistory";

type Page = "dashboard" | "explorer" | "wallets" | "send" | "mining" | "history";

// Locally-added transactions (from SendTransaction this session)
// These are merged inside TxHistory with live API data
type LocalTx = {
  id: string;
  from: string;
  to: string;
  amount: number;
  blockHeight: number;
  status: "confirmed" | "pending" | "failed";
  timestamp: string;
  mined: boolean;
};

const NAV = [
  { id: "dashboard" as Page, label: "Dashboard",    icon: LayoutDashboard, cmd: "—" },
  { id: "explorer"  as Page, label: "Block Explorer", icon: Search,        cmd: "printchain" },
  { id: "wallets"   as Page, label: "Wallets",       icon: Wallet,         cmd: "createwallet" },
  { id: "send"      as Page, label: "Send",          icon: Send,           cmd: "send" },
  { id: "mining"    as Page, label: "Mining",        icon: Cpu,            cmd: "mine" },
  { id: "history"   as Page, label: "Tx History",    icon: History,        cmd: "—" },
];

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [localTxs, setLocalTxs] = useState<LocalTx[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function addTransaction(tx: LocalTx) {
    setLocalTxs((prev) => [...prev, tx]);
  }

  const activePage = NAV.find((n) => n.id === page)!;

  return (
    <div
      className="size-full flex"
      style={{ background: "#080b0f", fontFamily: "Inter, sans-serif", color: "#e2e8f0" }}
    >
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 lg:hidden"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className="fixed lg:static inset-y-0 left-0 z-30 flex flex-col shrink-0 transition-transform duration-200"
        style={{
          width: "220px",
          background: "#060910",
          borderRight: "1px solid rgba(16,185,129,0.12)",
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2.5 px-5 py-5"
          style={{ borderBottom: "1px solid rgba(16,185,129,0.1)" }}
        >
          <div
            className="flex items-center justify-center w-7 h-7 rounded"
            style={{
              background: "rgba(16,185,129,0.15)",
              border: "1px solid rgba(16,185,129,0.3)",
            }}
          >
            <Terminal size={14} style={{ color: "#10b981" }} />
          </div>
          <div>
            <div
              style={{
                color: "#e2e8f0",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "-0.5px",
              }}
            >
              ChainForge
            </div>
            <div
              style={{
                color: "#374151",
                fontSize: "10px",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              NODE_ID: 3000
            </div>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X size={14} style={{ color: "#64748b" }} />
          </button>
        </div>

        {/* Node status */}
        <div
          className="mx-4 my-3 px-3 py-2 rounded"
          style={{
            background: "rgba(16,185,129,0.08)",
            border: "1px solid rgba(16,185,129,0.15)",
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: "#10b981" }}
            />
            <span
              style={{
                color: "#10b981",
                fontSize: "10px",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              NODE RUNNING
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
            localhost:3000
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setPage(item.id);
                  setSidebarOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-all"
                style={{
                  background: active ? "rgba(16,185,129,0.12)" : "transparent",
                  border: active
                    ? "1px solid rgba(16,185,129,0.25)"
                    : "1px solid transparent",
                }}
              >
                <Icon size={14} style={{ color: active ? "#10b981" : "#64748b" }} />
                <span
                  style={{
                    color: active ? "#e2e8f0" : "#94a3b8",
                    fontSize: "13px",
                    flex: 1,
                  }}
                >
                  {item.label}
                </span>
                {active && <ChevronRight size={10} style={{ color: "#10b981" }} />}
              </button>
            );
          })}
        </nav>

        {/* Bottom — CLI hint */}
        <div className="px-4 py-4" style={{ borderTop: "1px solid rgba(16,185,129,0.08)" }}>
          <div
            style={{
              color: "#374151",
              fontSize: "10px",
              fontFamily: "JetBrains Mono, monospace",
              lineHeight: "1.6",
            }}
          >
            <div style={{ color: "#64748b", marginBottom: "4px" }}>CLI equivalent:</div>
            <div style={{ color: "#10b981" }}>$ chainforge {activePage.cmd}</div>
          </div>
        </div>
      </aside>

      {/* Large-screen sidebar override */}
      <style>{`@media (min-width: 1024px) { aside { transform: none !important; } }`}</style>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header
          className="flex items-center gap-4 px-5 py-3 shrink-0"
          style={{
            borderBottom: "1px solid rgba(16,185,129,0.1)",
            background: "#060910",
          }}
        >
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu size={16} style={{ color: "#64748b" }} />
          </button>

          <div className="flex items-center gap-2">
            <span
              style={{
                color: "#64748b",
                fontSize: "12px",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              ~/chainforge
            </span>
            <span style={{ color: "#374151" }}>/</span>
            <span
              style={{
                color: "#10b981",
                fontSize: "12px",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {activePage.label.toLowerCase().replace(" ", "-")}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div
              className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded"
              style={{
                background: "#0e1520",
                border: "1px solid rgba(16,185,129,0.15)",
              }}
            >
              <span
                style={{
                  color: "#64748b",
                  fontSize: "11px",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                blockchain_3000.db
              </span>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#10b981" }} />
            </div>
            <div
              style={{
                color: "#64748b",
                fontSize: "11px",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {localTxs.filter((t) => t.status === "confirmed").length} confirmed ·{" "}
              {localTxs.filter((t) => t.status === "pending").length} pending
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-5 lg:p-6">
          {page === "dashboard"  && <Dashboard transactions={localTxs} onNav={(p) => setPage(p as Page)} />}
          {page === "explorer"   && <BlockExplorer onCreateWallet={() => setPage("wallets")} />}
          {page === "wallets"    && <Wallets />}
          {page === "send"       && <SendTransaction onTxSent={addTransaction} />}
          {page === "mining"     && <Mining onBlockMined={() => {}} />}
          {page === "history"    && <TxHistory transactions={localTxs} />}
        </main>
      </div>
    </div>
  );
}
