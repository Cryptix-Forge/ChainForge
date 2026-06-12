export type Wallet = {
  address: string;
  label: string;
  balance: number;
  color: string;
};

export type Transaction = {
  id: string;
  from: string;
  to: string;
  amount: number;
  blockHeight: number;
  status: "confirmed" | "pending" | "failed";
  timestamp: string;
  mined: boolean;
};

export type Block = {
  height: number;
  hash: string;
  prevHash: string;
  nonce: number;
  timestamp: string;
  transactions: Transaction[];
  difficulty: number;
};

export const WALLETS: Wallet[] = [
  { address: "1K6iLUQ6oxv4nNoLw5sZnVndkRGqLLn2hd", label: "Genesis Wallet", balance: 10, color: "#10b981" },
  { address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf8h", label: "Alice", balance: 25, color: "#06b6d4" },
  { address: "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2", label: "Bob", balance: 5, color: "#8b5cf6" },
  { address: "1HLoD9E4SDFFPDiYfNYnkBLQ85Y51J3Zb1", label: "Miner Node", balance: 40, color: "#f59e0b" },
];

export const TRANSACTIONS: Transaction[] = [
  {
    id: "a3f4e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4",
    from: "1K6iLUQ6oxv4nNoLw5sZnVndkRGqLLn2hd",
    to: "1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf8h",
    amount: 5,
    blockHeight: 2,
    status: "confirmed",
    timestamp: "2024-01-15T10:23:11Z",
    mined: true,
  },
  {
    id: "b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4",
    from: "1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf8h",
    to: "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2",
    amount: 3,
    blockHeight: 3,
    status: "confirmed",
    timestamp: "2024-01-15T11:05:44Z",
    mined: true,
  },
  {
    id: "c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5",
    from: "1HLoD9E4SDFFPDiYfNYnkBLQ85Y51J3Zb1",
    to: "1K6iLUQ6oxv4nNoLw5sZnVndkRGqLLn2hd",
    amount: 10,
    blockHeight: 4,
    status: "confirmed",
    timestamp: "2024-01-15T12:45:00Z",
    mined: true,
  },
  {
    id: "d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
    from: "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2",
    to: "1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf8h",
    amount: 2,
    blockHeight: 0,
    status: "pending",
    timestamp: "2024-01-15T14:10:22Z",
    mined: false,
  },
];

export const BLOCKS: Block[] = [
  {
    height: 0,
    hash: "0000a3f4e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6",
    prevHash: "0000000000000000000000000000000000000000000000000000000000000000",
    nonce: 31245,
    timestamp: "2024-01-15T09:00:00Z",
    transactions: [],
    difficulty: 16,
  },
  {
    height: 1,
    hash: "0000b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2",
    prevHash: "0000a3f4e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6",
    nonce: 58921,
    timestamp: "2024-01-15T09:42:33Z",
    transactions: [],
    difficulty: 16,
  },
  {
    height: 2,
    hash: "0000c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3",
    prevHash: "0000b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2",
    nonce: 102384,
    timestamp: "2024-01-15T10:23:11Z",
    transactions: [TRANSACTIONS[0]],
    difficulty: 16,
  },
  {
    height: 3,
    hash: "0000d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4",
    prevHash: "0000c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3",
    nonce: 77512,
    timestamp: "2024-01-15T11:05:44Z",
    transactions: [TRANSACTIONS[1]],
    difficulty: 16,
  },
  {
    height: 4,
    hash: "0000e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5",
    prevHash: "0000d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4",
    nonce: 143207,
    timestamp: "2024-01-15T12:45:00Z",
    transactions: [TRANSACTIONS[2]],
    difficulty: 16,
  },
];

export function shortHash(hash: string): string {
  if (!hash || hash.length < 14) return hash || '—';
  return hash.slice(0, 8) + "…" + hash.slice(-6);
}

export function shortAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr || '—';
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}
