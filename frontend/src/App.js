import React, { useState, useEffect, useCallback } from "react";
import {
  Layers, Wallet, ArrowRightLeft, Activity,
  ChevronRight, AlertCircle, CheckCircle, Info, HelpCircle
} from "lucide-react";
import { health } from "./api";

import Dashboard    from "./pages/Dashboard";
import Explorer     from "./pages/Explorer";
import Wallets      from "./pages/Wallets";
import Transactions from "./pages/Transactions";
import Send         from "./pages/Send";

import "./index.css";

/* ── Toast Context ──────────────────────────────────────────────── */
export const ToastCtx = React.createContext(null);

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, type = "info") => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  return { toasts, push };
}

/* ── Sidebar nav items ──────────────────────────────────────────── */
const NAV = [
  { id: "dashboard",    label: "Dashboard",      icon: Activity },
  { id: "explorer",     label: "Block Explorer",  icon: Layers },
  { id: "wallets",      label: "Wallets",         icon: Wallet },
  { id: "transactions", label: "Tx History",      icon: ArrowRightLeft },
  { id: "send",         label: "Send",            icon: ChevronRight },
];

/* ── ChainLink SVG Logo ─────────────────────────────────────────── */
function LogoIcon({ size = 18, color = "#fff" }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
      <rect x="2" y="2" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.5"/>
      <rect x="11" y="2" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.5"/>
      <rect x="2" y="11" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.5"/>
      <rect x="11" y="11" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.5"/>
      <line x1="9" y1="5.5" x2="11" y2="5.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="9" y1="14.5" x2="11" y2="14.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="5.5" y1="9" x2="5.5" y2="11" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="14.5" y1="9" x2="14.5" y2="11" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

/* ── Welcome Modal ──────────────────────────────────────────────── */
const STEPS = [
  {
    title: "Create a Blockchain",
    desc: "Go to Block Explorer → enter a wallet address → click Create. This mines the genesis block and awards the coinbase reward.",
  },
  {
    title: "Create a Wallet",
    desc: "Head to the Wallets page and click New Wallet. Each wallet gets a unique address you can use to send and receive coins.",
  },
  {
    title: "Check Your Balance",
    desc: "Wallet cards automatically display live balances. Refresh anytime to see the latest confirmed coins.",
  },
  {
    title: "Send a Transaction",
    desc: "Go to Send, choose a sender wallet, enter the recipient address and amount. Toggle Mine immediately to confirm instantly.",
  },
  {
    title: "Explore the Chain",
    desc: "Block Explorer shows every block, its hash, proof-of-work status, and all transactions within it.",
  },
];

function WelcomeModal({ onClose }) {
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-logo-row">
            <div className="modal-logo-icon">
              <LogoIcon />
            </div>
            <div className="modal-logo-name">
              Chain<span>Forge</span>
            </div>
          </div>
          <div className="modal-headline">Welcome to your blockchain node</div>
          <p className="modal-desc">
            ChainForge is a local blockchain built in Go. Here's how to get started in five simple steps.
          </p>
        </div>

        <div className="modal-steps">
          {STEPS.map((s, i) => (
            <div className="modal-step" key={i}>
              <div className="modal-step-num">{i + 1}</div>
              <div className="modal-step-content">
                <div className="modal-step-title">{s.title}</div>
                <div className="modal-step-desc">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <button className="modal-cta" onClick={onClose}>
          Get Started
        </button>
        <p className="modal-note">You can reopen this guide anytime via the&nbsp;<strong>?</strong>&nbsp;button in the sidebar.</p>
      </div>
    </div>
  );
}

/* ── App ────────────────────────────────────────────────────────── */
export default function App() {
  const [page, setPage]           = useState("dashboard");
  const [nodeOk, setNodeOk]       = useState(null);
  const [showModal, setShowModal] = useState(false);
  const { toasts, push }          = useToasts();

  /* Show welcome on first load */
  useEffect(() => {
    const seen = localStorage.getItem("cf_welcome_seen");
    if (!seen) {
      setShowModal(true);
      localStorage.setItem("cf_welcome_seen", "1");
    }
  }, []);

  /* Ping health */
  useEffect(() => {
    health()
      .then(() => setNodeOk(true))
      .catch(() => setNodeOk(false));
  }, []);

  const pageMap = {
    dashboard:    <Dashboard    toast={push} />,
    explorer:     <Explorer     toast={push} />,
    wallets:      <Wallets      toast={push} />,
    transactions: <Transactions toast={push} />,
    send:         <Send         toast={push} />,
  };

  return (
    <ToastCtx.Provider value={push}>
      <div className="app-shell">

        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-mark">
              <div className="logo-icon-wrap">
                <LogoIcon />
              </div>
              <div>
                <div className="logo-title">Chain<span>Forge</span></div>
                <div className="logo-subtitle">Blockchain Node</div>
              </div>
            </div>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-section-label">Navigation</div>
            {NAV.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`nav-item${page === id ? " active" : ""}`}
                onClick={() => setPage(id)}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div className="node-badge">
                <span
                  className="node-dot"
                  style={nodeOk === false
                    ? { background: "var(--crimson)", animation: "none" }
                    : {}}
                />
                {nodeOk === null ? "Connecting…" : nodeOk ? "Node Online" : "Node Offline"}
              </div>
              <button
                onClick={() => setShowModal(true)}
                title="How to use ChainForge"
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--ink3)",
                  cursor: "pointer",
                  padding: "2px 4px",
                  display: "flex",
                  alignItems: "center",
                  borderRadius: "4px",
                  transition: "color 0.12s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = "var(--ink)"}
                onMouseLeave={(e) => e.currentTarget.style.color = "var(--ink3)"}
              >
                <HelpCircle size={15} />
              </button>
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="main">
          {pageMap[page]}
        </main>
      </div>

      {/* ── Welcome Modal ── */}
      {showModal && <WelcomeModal onClose={() => setShowModal(false)} />}

      {/* ── Toasts ── */}
      <div className="toast-container">
        {toasts.map(({ id, msg, type }) => (
          <div key={id} className={`toast ${type}`}>
            {type === "success" && <CheckCircle size={15} color="var(--emerald)" style={{ flexShrink: 0, marginTop: 1 }} />}
            {type === "error"   && <AlertCircle size={15} color="var(--crimson)" style={{ flexShrink: 0, marginTop: 1 }} />}
            {type === "info"    && <Info        size={15} color="var(--ink2)"    style={{ flexShrink: 0, marginTop: 1 }} />}
            <span className="toast-msg">{msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
