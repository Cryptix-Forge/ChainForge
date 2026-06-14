# ChainForge — Blockchain in Go

A full-stack, from-scratch blockchain implementation based on the Bitcoin protocol.
Written in Go for the core chain, with a Node.js REST API and a React dashboard.

```
┌─────────────────────────────────────────────────────────────────┐
│                        ChainForge Stack                         │
│                                                                 │
│   ┌──────────────┐    ┌──────────────┐    ┌─────────────────┐  │
│   │  React/Vite  │    │  Next.js     │    │                 │  │
│   │  Dashboard   │    │  Landing     │    │   Go Binary     │  │
│   │  :5173       │    │  :3001       │    │  chainforge.exe │  │
│   └──────┬───────┘    └──────────────┘    └────────┬────────┘  │
│          │ /api proxy                              │            │
│   ┌──────▼───────────────────────────────┐        │            │
│   │       Express REST API  :5000         │◄───────┘            │
│   │       (Node.js + MongoDB)             │  execFile()         │
│   └──────────────────────────────────────┘                     │
│          │                  │                                   │
│   ┌──────▼──────┐   ┌──────▼──────┐                           │
│   │   MongoDB   │   │   BoltDB    │                           │
│   │  (API cache)│   │ (chain data)│                           │
│   └─────────────┘   └─────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Table of Contents

1. [How the Blockchain Works](#how-the-blockchain-works)
2. [Blocks and the Chain](#blocks-and-the-chain)
3. [Proof of Work (Mining)](#proof-of-work-mining)
4. [Mining Rewards and Coinbase Transactions](#mining-rewards-and-coinbase-transactions)
5. [The UTXO Model](#the-utxo-model)
6. [Wallets and ECDSA](#wallets-and-ecdsa)
7. [Transaction Lifecycle](#transaction-lifecycle)
8. [Architecture Deep Dive](#architecture-deep-dive)
9. [Database Design](#database-design)
10. [API Reference](#api-reference)
11. [Getting Started](#getting-started)
12. [First-Time Setup Flow](#first-time-setup-flow)
13. [CLI Reference](#cli-reference)
14. [Project File Structure](#project-file-structure)

---

## How the Blockchain Works

A blockchain is a linked list of blocks where each block contains transactions and
a cryptographic hash of the previous block. Tampering with any block breaks every
hash that follows it — making the chain tamper-evident.

```
   GENESIS                  BLOCK 1                  BLOCK 2
  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
  │ Height: 0   │          │ Height: 1   │          │ Height: 2   │
  │             │          │             │          │             │
  │ PrevHash:   │    ┌────►│ PrevHash:   │    ┌────►│ PrevHash:   │
  │  0000...    │    │     │  a3f8...    │    │     │  9d21...    │
  │             │    │     │             │    │     │             │
  │ Nonce: 4891 │    │     │ Nonce:14372 │    │     │ Nonce:71059 │
  │             │    │     │             │    │     │             │
  │ Txs: [      │    │     │ Txs: [      │    │     │ Txs: [      │
  │  coinbase   │    │     │  coinbase   │    │     │  A → B: 5   │
  │  10→Alice   │    │     │  10→Bob     │    │     │ ]           │
  │ ]           │    │     │ ]           │    │     │             │
  │             │    │     │             │    │     │             │
  │ Hash: a3f8──┼────┘     │ Hash: 9d21──┼────┘     │ Hash: c71e  │
  └─────────────┘          └─────────────┘          └─────────────┘
```

If someone changes a transaction in Block 1, its hash changes → Block 2's `PrevHash`
no longer matches → Block 2's hash changes → and so on. The whole chain after the
tampered block becomes invalid.

---

## Blocks and the Chain

Each block in ChainForge contains:

| Field           | Type      | Description                                          |
|-----------------|-----------|------------------------------------------------------|
| `Timestamp`     | `int64`   | Unix timestamp when the block was created            |
| `Transactions`  | `[]*Tx`   | List of transactions included in this block          |
| `PrevBlockHash` | `[]byte`  | SHA-256 hash of the previous block                   |
| `Hash`          | `[]byte`  | SHA-256 hash of this block's contents + nonce        |
| `Nonce`         | `int`     | The value found by Proof of Work                     |
| `Height`        | `int`     | Block number (genesis = 0)                           |

```go
// block.go
type Block struct {
    Timestamp     int64
    Transactions  []*Transaction
    PrevBlockHash []byte
    Hash          []byte
    Nonce         int
    Height        int
}
```

The block hash is computed over: `PrevBlockHash + MerkleRoot(Txs) + Timestamp + TargetBits + Nonce`.

---

## Proof of Work (Mining)

Mining is the process of finding a `Nonce` value such that the block's SHA-256 hash
starts with a required number of leading zero bits.

```
   targetBits = 16  →  hash must be less than:
   0000 ffff ffff ffff ffff ffff ffff ffff ffff ffff ffff ffff ffff ffff ffff ffff
   ^^^^
   Must start with at least 2 zero bytes (16 bits)

   MINING LOOP:
   ┌─────────────────────────────────────────────────────────┐
   │  nonce = 0                                              │
   │  loop:                                                  │
   │    data  = PrevHash ‖ MerkleRoot ‖ Timestamp ‖ nonce   │
   │    hash  = SHA-256(data)                                │
   │    if hash < target:  ✓ FOUND — store nonce + hash     │
   │    else:              nonce++, try again                │
   └─────────────────────────────────────────────────────────┘

   Example attempt log:
   nonce=0       → f1c3a8... (too big, first bytes are not 0000)
   nonce=1       → 3d77b2... (too big)
   nonce=14,372  → 0000a3b7f1c29d84... ✓  VALID!
```

With `targetBits = 16`, on average ~65,536 hashes are tried per block.
This is intentionally easy for development. Bitcoin uses ~67 zero bits today,
requiring trillions of attempts per block.

```go
// proofofwork.go
const targetBits = 16

func (pow *ProofOfWork) Run() (int, []byte) {
    nonce := 0
    for nonce < math.MaxInt64 {
        data := pow.prepareData(nonce)
        hash := sha256.Sum256(data)
        hashInt.SetBytes(hash[:])

        if hashInt.Cmp(pow.target) == -1 {
            break // Valid nonce found!
        }
        nonce++
    }
    return nonce, hash[:]
}
```

### Merkle Tree

Transaction IDs within a block are hashed together into a binary Merkle tree.
Only the root hash is stored in the block, so changing any single transaction
changes the root and thus the entire block hash.

```
                     MerkleRoot
                    /          \
               H(AB)            H(CD)
              /    \           /    \
           H(A)   H(B)      H(C)  H(D)
            |      |         |      |
           Tx0    Tx1       Tx2    Tx3
```

---

## Mining Rewards and Coinbase Transactions

### What is a Coinbase Transaction?

A coinbase transaction is the **first transaction in every mined block**. Unlike normal
transactions, it has **no inputs** — coins are created from nothing as the block reward.
This is how new currency enters circulation.

```
   Normal Transaction:            Coinbase Transaction:
   ┌──────────────────┐          ┌──────────────────────┐
   │ INPUT:           │          │ INPUT:               │
   │  TXID: abc123    │          │  TXID: (empty)       │
   │  Vout: 0         │          │  Vout: -1            │
   │  Sig:  valid ✓   │          │  Data: random bytes  │
   │                  │          │  (no signature)      │
   │ OUTPUTS:         │          │                      │
   │  5 coins → Bob   │          │ OUTPUT:              │
   │  5 coins → Alice │          │  10 coins → Miner    │
   │  (change)        │          │  (reward, no input!) │
   └──────────────────┘          └──────────────────────┘
```

### In ChainForge: Two Mining Commands

**`mine -address ADDR`** — Creates a coinbase-only block. Miner earns 10 coins.

```
   $ chainforge mine -address 1Alice...

   ┌─────────────────────────────┐
   │  New Block (height N)       │
   │                             │
   │  Tx[0]: COINBASE            │
   │    IN:  (empty — no input)  │
   │    OUT: 10 coins → Alice    │  ← Alice balance +10
   └─────────────────────────────┘
```

**`send -from A -to B -amount 5 -mine`** — Creates a user transaction and mines it into
a block immediately. **No coinbase is added** — the miner receives no extra reward from
this command. Only the transferred coins change hands.

```
   $ chainforge send -from 1Alice... -to 1Bob... -amount 5 -mine

   ┌─────────────────────────────────┐
   │  New Block (height N)           │
   │                                 │
   │  Tx[0]: USER TX                 │
   │    IN:  Alice's 10-coin UTXO    │
   │    OUT: 5  coins → Bob          │
   │    OUT: 5  coins → Alice        │  ← change back to sender
   └─────────────────────────────────┘

   Alice: 10 - 5 = 5 coins  ✓
   Bob:    0 + 5 = 5 coins  ✓
   Miner: no extra reward
```

> **In Bitcoin**, every block always contains a coinbase, and the miner who publishes
> the block earns it plus all transaction fees. ChainForge keeps it simple: use the
> dedicated `mine -address` command to earn rewards.

### Reward Summary

| Command                                | Coinbase? | Miner reward |
|----------------------------------------|-----------|--------------|
| `createblockchain -address ADDR`       | ✓ Yes     | 10 coins     |
| `mine -address ADDR`                   | ✓ Yes     | 10 coins     |
| `send -from A -to B -amount N -mine`   | ✗ No      | 0 coins      |

---

## The UTXO Model

ChainForge uses the **Unspent Transaction Output (UTXO)** model — the same as Bitcoin.
There are no stored account balances. Your balance is the sum of all unspent outputs
locked to your address.

```
   ALICE RECEIVES 10 COINS (genesis coinbase):

   UTXO Set
   ┌────────────────────────────────┐
   │  genesis_txid:0  →  Alice  10  │  ← Unspent ✓
   └────────────────────────────────┘
   Alice.balance = 10    Bob.balance = 0


   ALICE SENDS 3 COINS TO BOB:

   Old UTXO (genesis_txid:0) is CONSUMED as input.
   Two new UTXOs are created as outputs.

   UTXO Set (after)
   ┌────────────────────────────────┐
   │  genesis_txid:0  →  Alice  10  │  ← SPENT ✗  (removed)
   │  send_txid:0     →  Bob     3  │  ← Unspent ✓
   │  send_txid:1     →  Alice   7  │  ← Unspent ✓ (change)
   └────────────────────────────────┘
   Alice.balance = 7     Bob.balance = 3
```

**Key rule:** every input must reference an existing unspent output, and must be signed
by the private key that matches the output's locking script. Attempting to spend an
already-spent output is rejected.

### UTXO Set Index

Scanning every block to calculate a balance would be O(n) over the whole chain.
ChainForge maintains a `chainstate` BoltDB bucket as a live index of all unspent outputs:

```
   BoltDB
   ├── "blocks" bucket      ← full block history (immutable)
   └── "chainstate" bucket  ← current unspent outputs (live index)
       ├── txid_A → [output0, output1]
       ├── txid_B → [output0]
       └── ...
```

Run `reindexutxo` to rebuild `chainstate` by replaying the entire block history.

---

## Wallets and ECDSA

A ChainForge wallet is an **ECDSA P-256 key pair**. The private key never leaves the
wallet file. The public key is used to derive your address and verify your signatures.

```
   KEY GENERATION
   ──────────────────────────────────────────────────────────────
   random seed
       │
       ▼
   ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
       │
       ├──► PrivateKey.D  (secret scalar — keep this safe!)
       └──► PublicKey.(X, Y)  (point on curve)


   ADDRESS DERIVATION  (Bitcoin-compatible)
   ──────────────────────────────────────────────────────────────
   PublicKey bytes (X ‖ Y)
       │
       ▼
   SHA-256
       │
       ▼
   RIPEMD-160  →  PubKeyHash  (20 bytes)
       │
       ▼
   [0x00] + PubKeyHash  →  versionedPayload
       │
       ▼
   SHA-256(SHA-256(versionedPayload))[:4]  →  checksum
       │
       ▼
   Base58Encode(versionedPayload + checksum)
       │
       ▼
   "1A7xkG2fP9qTmR..."   ← your wallet address
```

### Locking and Unlocking Scripts

When coins are sent to an address, the output is "locked" to that address's
`PubKeyHash`. To spend it later, the spender must provide the matching public key
and a valid ECDSA signature:

```
   Locking (when output is created):
     output.PubKeyHash = RIPEMD-160(SHA-256(recipientPubKey))

   Unlocking (when output is spent as input):
     input.PubKey    = spenderPublicKey
     input.Signature = Sign(tx_hash, spenderPrivKey)

   Validation:
     ✓ RIPEMD-160(SHA-256(input.PubKey)) == output.PubKeyHash
     ✓ ecdsa.Verify(input.PubKey, tx_hash, input.Signature)
```

---

## Transaction Lifecycle

```
   User fills Send form: 5 coins, Alice → Bob, "Mine immediately" ON
         │
         ▼
   Frontend  POST /api/transaction/send
   { from: "1Alice...", to: "1Bob...", amount: 5, mine: true }
         │
         ▼
   Backend logs { txid, from, to, amount, status: "pending" } → MongoDB
         │
         ▼
   execFile("chainforge", ["send","-from","1Alice...","-to","1Bob...",
                           "-amount","5","-mine"])
         │
         ▼
   ┌─────────────────────────────────────────────────────────────┐
   │  Go binary (cli_send.go + transaction.go)                   │
   │                                                             │
   │  1. ValidateAddress(from) + ValidateAddress(to)             │
   │  2. UTXOSet.FindSpendableOutputs(AlicePubKeyHash, 5)        │
   │     finds UTXOs summing to ≥ 5 coins                        │
   │  3. Build TXInputs  (references to Alice's UTXOs)           │
   │  4. Build TXOutputs:                                        │
   │       out[0]  5 coins → Bob                                 │
   │       out[1]  change  → Alice                               │
   │  5. Sign each input with Alice's ECDSA private key          │
   │  6. MineBlock([tx]) — run SHA-256 PoW loop                  │
   │  7. Write new block to BoltDB                               │
   │  8. UTXOSet.Update(block):                                  │
   │       remove spent UTXOs from chainstate                    │
   │       add new UTXOs to chainstate                           │
   │  9. Print "Success!"                                        │
   └─────────────────────────────────────────────────────────────┘
         │
         ▼
   Backend:
     stdout includes "Success!" → status = "success"
     run printchain → sync new block into MongoDB Block collection
     return { success: true }
         │
         ▼
   Frontend shows ✓, refreshes Alice and Bob balances
```

---

## Architecture Deep Dive

### Go Binary (Core Blockchain)

The Go binary is a pure CLI program — stateless, no HTTP server, no goroutines.
The Node.js backend calls it as a subprocess for every operation.

```
   chainforge [command] [flags]
   │
   ├── createblockchain -address ADDR    genesis block + coinbase → ADDR
   ├── createwallet                      new ECDSA key pair → wallet file
   ├── deletewallet -address ADDR        remove key pair from wallet file
   ├── listaddresses                     print all wallet addresses
   ├── getbalance -address ADDR          sum UTXOs for ADDR
   ├── send -from A -to B -amount N      UTXO transaction ± immediate mining
   │    [-mine]
   ├── mine -address ADDR                coinbase block, 10 coins → ADDR
   ├── printchain                        dump all blocks to stdout
   ├── reindexutxo                       rebuild chainstate from blocks bucket
   └── startnode [-miner ADDR]           P2P TCP server (port = NODE_ID)
```

### How goRunner Works

```javascript
// goRunner.js — simplified
function run(args) {
  return new Promise((resolve, reject) => {
    execFile(
      "/usr/local/bin/chainforge.exe",
      args,
      { cwd: "/go-root", env: { NODE_ID: "3000" }, timeout: 15000 },
      (err, stdout, stderr) => {
        if (err && !stdout) return reject(new Error(stderr || err.message));
        resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
      }
    );
  });
}
```

All blockchain operations are synchronous from the API's perspective —
one Go binary call at a time, results parsed from stdout.

### Node.js Backend Layer

```
   /api/blockchain/blocks
      │
      ├─ run(["printchain"])               call Go binary
      │       │
      │       └─ parseChain(stdout)        parse text output into JS objects
      │               │
      │               └─ Block.findOneAndUpdate(...)   upsert into MongoDB
      │
      └─ return blocks[]                   to frontend
      
      on error → fallback to Block.find() from MongoDB cache
```

---

## Database Design

### BoltDB (on disk, written by Go binary)

```
   blockchain_3000.db
   └── bucket: "blocks"
       ├── key: "l"          → hash of latest block (tip pointer)
       ├── key: <hash_1>     → gob-encoded Block{}
       ├── key: <hash_2>     → gob-encoded Block{}
       └── ...

   chainstate_3000.db  (UTXO index, rebuilt by reindexutxo)
   └── bucket: "chainstate"
       ├── key: <txid_1>     → gob-encoded TXOutputs{}
       ├── key: <txid_2>     → gob-encoded TXOutputs{}
       └── ...

   wallet_3000.dat  (wallet key pairs, written by Go binary)
   └── gob-encoded: map[address]WalletGob{
         PrivKeyD, PrivKeyX, PrivKeyY, PublicKey
       }
```

### MongoDB (API cache, written by Node.js backend)

```
   database: chainforge
   │
   ├── collection: blocks
   │   { hash, height, prevHash, powValid, nonce, txCount,
   │     transactions: [{ txid, inputs[], outputs[], isCoinbase }] }
   │   indexes: hash (unique), height
   │
   ├── collection: wallets
   │   { address (unique), label, createdAt }
   │   — only stores metadata; actual key material stays in wallet_3000.dat
   │
   └── collection: txlogs
       { txid, from, to, amount, mined, status, raw, createdAt }
       indexes: from, to
```

**Important:** BoltDB is the source of truth. MongoDB is a cache and fallback.
If they diverge, reset MongoDB and let it re-sync from the Go binary.

---

## API Reference

All endpoints prefixed with `/api`. Frontend proxies `/api` → `http://localhost:5000`.

### Blockchain

| Method | Path                      | Body / Params       | Description                        |
|--------|---------------------------|---------------------|------------------------------------|
| GET    | `/blockchain/exists`      | —                   | `{ exists: bool, nodeId }`         |
| GET    | `/blockchain/blocks`      | —                   | All blocks newest-first            |
| GET    | `/blockchain/height`      | —                   | `{ height, totalBlocks }`          |
| POST   | `/blockchain/create`      | `{ address }`       | Create genesis block               |
| POST   | `/blockchain/reindex`     | —                   | Rebuild UTXO index                 |

### Wallets

| Method | Path                         | Body / Params       | Description                        |
|--------|------------------------------|---------------------|------------------------------------|
| GET    | `/wallet/list`               | —                   | All addresses + wallet metadata    |
| POST   | `/wallet/create`             | —                   | Generate new ECDSA wallet          |
| GET    | `/wallet/balance/:address`   | —                   | `{ balance }` from UTXO set        |
| PATCH  | `/wallet/:address/label`     | `{ label }`         | Update display label               |
| DELETE | `/wallet/:address`           | —                   | Permanently delete wallet          |

### Transactions

| Method | Path                      | Body / Params                    | Description               |
|--------|---------------------------|----------------------------------|---------------------------|
| POST   | `/transaction/send`       | `{ from, to, amount, mine }`    | Send coins                |
| GET    | `/transaction/history`    | `?address=&page=&limit=`        | Transaction log           |

### System

| Method | Path               | Body / Params          | Description                          |
|--------|--------------------|------------------------|--------------------------------------|
| POST   | `/mine/block`      | `{ minerAddress }`     | Mine coinbase block (+10 coins)      |
| POST   | `/utxo/reindex`    | —                      | Rebuild UTXO index                   |
| GET    | `/node/status`     | —                      | Node ID + online status              |
| GET    | `/health`          | —                      | API health + MongoDB status          |
| POST   | `/reset`           | —                      | ⚠ Wipe all data                      |

---

## Getting Started

### With Docker (recommended)

```bash
git clone <repo-url>
cd ChainForge-Blockchain-in-Go

# Set your MongoDB connection string (leave blank to use a local Mongo instance)
# Create a .env file:
echo "MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/chainforge" > .env

# Build and start all four services
docker compose up --build

# Open the dashboard
open http://localhost:5173
```

Docker service map:
```
   go-builder  →  compiles Go binary into shared volume /go-bin
   backend     →  copies binary from /go-bin, starts on :5000
   frontend    →  Vite dev server on :5173, /api proxied to backend
   landing     →  Next.js on :3001
```

To rebuild after Go code changes:
```bash
docker compose up --build
```

To wipe all chain data and start fresh:
```bash
docker compose down -v   # -v removes named volumes
docker compose up --build
```

### Without Docker (local development)

Requirements: Go 1.21+, Node.js 20+, pnpm, MongoDB

```bash
# Build the Go binary
go build -o chainforge.exe   # Windows
go build -o chainforge        # Linux / macOS

# Start MongoDB locally (or use Atlas and set MONGO_URI)
mongod

# Start the backend
cd backend
# Create .env:
#   NODE_ID=3000
#   MONGO_URI=mongodb://localhost:27017/chainforge
#   PORT=5000
npm install
node server.js

# Start the frontend (separate terminal)
cd frontend
pnpm install
pnpm dev
# → http://localhost:5173
```

---

## First-Time Setup Flow

Follow this order — each step depends on the previous one.

```
   ╔═══════════════════════════════════════════════════════════╗
   ║  STEP 1 — Create a Wallet                                ║
   ╚═══════════════════════════════════════════════════════════╝

   Dashboard → Wallets tab → "New Wallet"

   What happens inside Go:
     ecdsa.GenerateKey(P-256)
     address = Base58(version + RIPEMD-160(SHA-256(pubKey)) + checksum)
     append to wallet_3000.dat

   Result: you now have an address like  1A7xkG2fP9qTmR...
   Copy it — you need it in Step 2.


   ╔═══════════════════════════════════════════════════════════╗
   ║  STEP 2 — Create the Blockchain                          ║
   ╚═══════════════════════════════════════════════════════════╝

   Block Explorer tab → paste your address → "Create Blockchain"

   What happens inside Go:
     creates blockchain_3000.db (BoltDB file)
     mines genesis block (PoW loop finds valid nonce)
     adds coinbase tx:  10 coins → your address
     rebuilds UTXO set (reindexutxo)

   ┌────────────────────────────────────────────┐
   │  Genesis Block  (height: 0)                │
   │  Tx[0]: COINBASE                           │
   │    Output: 10 coins → 1A7xkG2fP9qTmR...   │
   └────────────────────────────────────────────┘

   Your balance is now 10 coins.


   ╔═══════════════════════════════════════════════════════════╗
   ║  STEP 3 — Mine More Blocks (earn more coins)             ║
   ╚═══════════════════════════════════════════════════════════╝

   Mining tab → select your wallet → "Start Mining"

   The UI runs a visual PoW simulation, then calls the real Go backend.
   Each successful mine adds a block with a coinbase transaction.

   ┌────────────────────────────────────────────┐
   │  Block  (height: 1)                        │
   │  Tx[0]: COINBASE                           │
   │    Output: 10 coins → 1A7xkG2fP9qTmR...   │
   └────────────────────────────────────────────┘

   Balance increases by 10 per block mined.


   ╔═══════════════════════════════════════════════════════════╗
   ║  STEP 4 — Send Coins Between Wallets                     ║
   ╚═══════════════════════════════════════════════════════════╝

   Wallets tab → create a second wallet
   Send tab → From: wallet1, To: wallet2, Amount: 5, [✓] Mine immediately

   IMPORTANT: Keep "Mine immediately" ON for a single-node setup.
   Without it, the transaction is broadcast to the P2P network,
   which requires other nodes to be running.

   ┌────────────────────────────────────────────┐
   │  Block  (height: 2)                        │
   │  Tx[0]: USER TX                            │
   │    In:  10-coin UTXO from wallet1          │
   │    Out: 5  coins → wallet2                 │
   │    Out: 5  coins → wallet1  (change)       │
   └────────────────────────────────────────────┘
```

---

## CLI Reference

The Go binary is the canonical interface. You can call it directly from the project root:

```bash
# Always set NODE_ID before running any command
export NODE_ID=3000           # Linux / macOS
$env:NODE_ID = "3000"         # Windows PowerShell

# ── Blockchain ──────────────────────────────────────────────────────────────
./chainforge createblockchain -address <ADDR>
  # Creates blockchain_3000.db, mines genesis block, sends 10 coins to ADDR

./chainforge printchain
  # Prints every block (newest first) to stdout

./chainforge reindexutxo
  # Scans all blocks and rebuilds the UTXO index (chainstate)

# ── Wallets ─────────────────────────────────────────────────────────────────
./chainforge createwallet
  # Generates new ECDSA P-256 key pair, prints address, saves to wallet file

./chainforge listaddresses
  # Prints all wallet addresses stored in wallet_3000.dat

./chainforge deletewallet -address <ADDR>
  # Permanently removes key pair from wallet_3000.dat (irreversible!)

./chainforge getbalance -address <ADDR>
  # Returns sum of unspent outputs for ADDR from UTXO index

# ── Transactions ─────────────────────────────────────────────────────────────
./chainforge send -from <A> -to <B> -amount <N> -mine
  # Creates UTXO transaction, mines it immediately into a new block

./chainforge send -from <A> -to <B> -amount <N>
  # Broadcasts transaction to P2P network (requires peer nodes running)

# ── Mining ───────────────────────────────────────────────────────────────────
./chainforge mine -address <ADDR>
  # Mines a coinbase-only block, sends 10 coin reward to ADDR

./chainforge startnode -miner <ADDR>
  # Starts P2P TCP node on port NODE_ID, mines rewards to ADDR
```

---

## Project File Structure

```
ChainForge-Blockchain-in-Go/
│
├── Go Blockchain Core
│   ├── main.go                    Entry point — creates CLI and calls Run()
│   ├── cli.go                     Command dispatcher (flag.FlagSet per command)
│   ├── cli_createblockchain.go    createblockchain command
│   ├── cli_createwallet.go        createwallet command
│   ├── cli_deletewallet.go        deletewallet command
│   ├── cli_getbalance.go          getbalance command
│   ├── cli_listaddress.go         listaddresses command
│   ├── cli_mine.go                mine command (coinbase block)
│   ├── cli_printchain.go          printchain command
│   ├── cli_reindexutxo.go         reindexutxo command
│   ├── cli_send.go                send command (UTXO transaction)
│   ├── cli_startnode.go           startnode command (P2P)
│   │
│   ├── block.go                   Block struct, NewBlock, Serialize
│   ├── blockchain.go              Blockchain DB ops (BoltDB), MineBlock
│   ├── blockchain_iterator.go     Walk chain newest → genesis
│   ├── transaction.go             Transaction struct, Sign, Verify, Coinbase
│   ├── transaction_input.go       TXInput — references a previous output
│   ├── transaction_output.go      TXOutput — value + locking script (PubKeyHash)
│   ├── utxo_set.go                UTXO index: Find, Update, Reindex
│   ├── wallet.go                  Wallet struct, ECDSA key gen, address derivation
│   ├── wallets.go                 WalletFile: load, save, create, delete
│   ├── proofofwork.go             SHA-256 PoW — targetBits=16, Run(), Validate()
│   ├── merkle_tree.go             Binary Merkle tree over transaction hashes
│   ├── server.go                  P2P TCP networking (version, inv, block, tx msgs)
│   ├── base58.go                  Base58Check encode/decode
│   └── utils.go                   IntToHex, helpers
│
├── Express Backend
│   └── backend/
│       ├── server.js              App setup, CORS, route mounting
│       ├── db.js                  MongoDB connection helper
│       ├── goRunner.js            execFile wrapper — calls Go binary
│       ├── models/
│       │   ├── Block.js           Mongoose schema for cached blocks
│       │   ├── Wallet.js          Mongoose schema for wallet metadata
│       │   └── TxLog.js           Mongoose schema for transaction history
│       └── routes/
│           ├── blockchain.js      /api/blockchain/* — parseChain, sync to Mongo
│           ├── wallet.js          /api/wallet/* — list, create, delete, label
│           ├── transaction.js     /api/transaction/* — send, history
│           └── system.js          /api/mine, /api/health, /api/reset, /api/utxo
│
├── React Frontend
│   └── frontend/src/
│       ├── main.tsx               React entry point
│       └── app/
│           ├── App.tsx            Shell layout, sidebar nav, page routing
│           ├── api.ts             Typed API client — all fetch() calls
│           └── components/
│               ├── Dashboard.tsx      Stats cards, TX chart, quick actions
│               ├── BlockExplorer.tsx  Chain visualization, block detail cards
│               ├── Wallets.tsx        Wallet list, create, delete, label edit
│               ├── Mining.tsx         PoW simulation + real mine backend call
│               ├── SendTransaction.tsx UTXO send form with animated flow
│               └── TxHistory.tsx      Transaction history table with filters
│
└── Docker
    ├── docker-compose.yml         Orchestrates 4 services + 2 named volumes
    ├── Dockerfile.go              Multi-stage: build Go binary → copy to /go-bin
    ├── Dockerfile.backend         node:20-alpine, copies binary from /go-bin
    ├── Dockerfile.frontend        node:20-alpine, pnpm dev with Docker Vite config
    └── Dockerfile.landing         Next.js landing page
```

---

## Concepts Quick Reference

```
   CONCEPT          DESCRIPTION                           IN THIS PROJECT
   ───────────────────────────────────────────────────────────────────────
   Wallet           ECDSA P-256 key pair + address        wallet.go / wallets.go
   Address          Base58Check(version+PubKeyHash+ck)    wallet.GetAddress()
   Private key      Secret scalar D — signs transactions  never leaves .dat file
   Transaction      Inputs (spend UTXOs) + Outputs        transaction.go
   Coinbase         First tx in block, no inputs          NewCoinbaseTX()
   UTXO             Unspent transaction output            utxo_set.go
   Block            Txs + PrevHash + Nonce + Height       block.go
   Proof of Work    SHA-256 hash < target (16 zero bits)  proofofwork.go
   Merkle Root      Hash tree of all txs in block         merkle_tree.go
   Block reward     10 coins via coinbase tx              const subsidy = 10
   Blockchain       Linked blocks stored in BoltDB        blockchain.go
   UTXO index       chainstate BoltDB bucket              utxo_set.go Reindex()
   API cache        MongoDB mirrors chain for REST layer  backend/models/
```
