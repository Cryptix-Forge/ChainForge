// Central API service — all calls go through here
// Backend runs on http://localhost:5000 (proxied via Vite as /api)

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Types ──────────────────────────────────────────────────────────────────

export type ApiBlock = {
  height: number;
  hash: string;
  prevHash: string;
  nonce: number;
  txCount: number;
  transactions: { id: string }[];
  pow: string;
};

export type ApiWallet = {
  address: string;
  label: string;
  createdAt: string;
};

export type ApiTx = {
  txId: string;
  from: string;
  to: string;
  amount: number;
  timestamp: string;
  nodeId?: string;
};

export type BackendTrace = { file: string; fn: string }[];

// ── Health ─────────────────────────────────────────────────────────────────

export function getHealth() {
  return request<{ status: string; nodeId: string; timestamp: number; mongoOnline: boolean }>('/health');
}

// ── Blockchain ─────────────────────────────────────────────────────────────

export function getBlocks() {
  return request<{ success: boolean; blocks: ApiBlock[]; source: string }>('/blockchain/blocks');
}

export function getBlockchainExists() {
  return request<{ exists: boolean; nodeId: string }>('/blockchain/exists');
}

export function createBlockchain(address: string) {
  return request<{ success: boolean; rawOutput: string; backendTrace: BackendTrace }>(
    '/blockchain/create',
    { method: 'POST', body: JSON.stringify({ address }) }
  );
}

// ── Wallets ────────────────────────────────────────────────────────────────

export function listWallets() {
  return request<{ success: boolean; addresses: string[]; wallets: ApiWallet[] }>('/wallet/list');
}

export function createWallet() {
  return request<{ success: boolean; address: string; rawOutput: string; backendTrace: BackendTrace }>(
    '/wallet/create',
    { method: 'POST' }
  );
}

export function getBalance(address: string) {
  return request<{ success: boolean; address: string; balance: number; backendTrace: BackendTrace }>(
    `/wallet/balance/${address}`
  );
}

export function deleteWallet(address: string) {
  return request<{ success: boolean; address: string; note: string }>(
    `/wallet/${address}`,
    { method: 'DELETE' }
  );
}

export function resetEverything() {
  return request<{ success: boolean; message: string }>(
    '/reset',
    { method: 'POST' }
  );
}

// ── Transactions ───────────────────────────────────────────────────────────

export function sendTransaction(from: string, to: string, amount: number, mine: boolean) {
  return request<{ success: boolean; rawOutput: string; backendTrace: BackendTrace }>(
    '/transaction/send',
    { method: 'POST', body: JSON.stringify({ from, to, amount, mine }) }
  );
}

export function getTxHistory() {
  return request<{ success: boolean; transactions: ApiTx[] }>('/transaction/history');
}

// ── Mining ─────────────────────────────────────────────────────────────────

/**
 * Mine a real block on the Go blockchain.
 * Runs: chainforge send -from ADDR -to ADDR -amount 1 -mine
 * The coinbase TX in that block delivers the block reward to minerAddress.
 */
export function mineBlock(minerAddress: string) {
  return request<{
    success: boolean;
    minerAddress: string;
    newBalance: number | null;
    rawOutput: string;
    backendTrace: BackendTrace;
    error?: string;
    hint?: string;
  }>('/mine/block', {
    method: 'POST',
    body: JSON.stringify({ minerAddress }),
  });
}

// ── UTXO ───────────────────────────────────────────────────────────────────

export function reindexUTXO() {
  return request<{ success: boolean; transactionCount: number | null; rawOutput: string }>(
    '/utxo/reindex',
    { method: 'POST' }
  );
}

export function updateWalletLabel(address: string, label: string) {
  return request<{ success: boolean; wallet: ApiWallet }>(
    `/wallet/${address}/label`,
    { method: 'PATCH', body: JSON.stringify({ label }) }
  );
}

// ── Node ───────────────────────────────────────────────────────────────────

export function getNodeStatus() {
  return request<{ success: boolean; nodeId: string; address: string; mempoolSize: number; status: string }>('/node/status');
}

// ── Mempool ────────────────────────────────────────────────────────────────

export function submitToMempool(from: string, to: string, amount: number) {
  return request<{ success: boolean; message: string; tx: any }>(
    '/mempool/submit',
    { method: 'POST', body: JSON.stringify({ from, to, amount }) }
  );
}
