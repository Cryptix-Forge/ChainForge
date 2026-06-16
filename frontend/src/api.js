import axios from "axios";

const api = axios.create({ baseURL: "/api" });

// ── Blockchain ────────────────────────────────────────────────────────────────
export const getChain   = ()         => api.get("/blockchain/chain");
export const getHeight  = ()         => api.get("/blockchain/height");
export const getBlocks  = (page = 1) => api.get(`/blockchain/blocks?page=${page}&limit=10`);
export const createChain = (address) => api.post("/blockchain/create", { address });
export const reindex     = ()        => api.post("/blockchain/reindex");

// ── Wallet ────────────────────────────────────────────────────────────────────
export const listWallets  = ()        => api.get("/wallet/list");
export const createWallet = ()        => api.post("/wallet/create");
export const getBalance   = (address) => api.get(`/wallet/balance/${address}`);
export const setLabel     = (address, label) => api.patch(`/wallet/${address}/label`, { label });

// ── Transactions ──────────────────────────────────────────────────────────────
export const sendTx  = (payload) => api.post("/transaction/send", payload);
export const getTxHistory = (address, page = 1) =>
  api.get(`/transaction/history?address=${address || ""}&page=${page}&limit=20`);

// ── Fork Resolution ───────────────────────────────────────────────────────────
export const getFork      = ()  => api.get("/fork");
export const simulateFork = ()  => api.post("/fork/simulate");
export const resolveFork  = ()  => api.post("/fork/resolve");
export const clearFork    = ()  => api.delete("/fork");

// ── Validation ───────────────────────────────────────────────────────────────
export const validateBlock = (hash) => api.post("/validate/block", { hash });

// ── Mempool ───────────────────────────────────────────────────────────────────
export const getMempool      = ()             => api.get("/mempool");
export const submitToMempool = (payload)      => api.post("/mempool/submit", payload);
export const mineMempool     = (minerAddress) => api.post("/mempool/mine", { minerAddress });
export const rejectMempoolTx = (id)           => api.delete(`/mempool/${id}`);

// ── P2P Network ───────────────────────────────────────────────────────────────
export const getP2PStatus = ()              => api.get("/p2p/status");
export const startP2PNode = (payload)       => api.post("/p2p/start", payload || {});
export const stopP2PNode  = ()              => api.post("/p2p/stop");
export const getP2PPeers  = ()              => api.get("/p2p/peers");
export const addP2PPeer   = (address)       => api.post("/p2p/peers", { address });

// ── Health ────────────────────────────────────────────────────────────────────
export const health = () => api.get("/health");

export default api;
