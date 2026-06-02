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

// ── Health ────────────────────────────────────────────────────────────────────
export const health = () => api.get("/health");

export default api;
