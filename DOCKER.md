# ChainForge — Docker Setup & Usage Guide

A full-stack blockchain system with four services, all orchestrated via Docker Compose.

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- That's it. No Go, Node, or pnpm needed on your machine.

---

## Services & Ports

| Service       | What it is               | URL                        |
|---------------|--------------------------|----------------------------|
| `landing`     | Next.js landing page     | http://localhost:3001       |
| `frontend`    | Vite/React dashboard     | http://localhost:5173       |
| `backend`     | Express REST API         | http://localhost:5000       |
| `go-builder`  | Compiles Go binary       | (no port — init only)       |

> **Note:** The landing page runs on **3001** (not 3000) to avoid conflict with the blockchain's `NODE_ID=3000` P2P port.

---

## Quick Start

### 1. Add your environment variable (optional)

Create a `.env` file in the project root (next to `docker-compose.yml`):

```env
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/BlockChain?appName=Testing
```

MongoDB is optional — the app works fully without it, just without persistent TX history caching.

### 2. Build and start everything

```bash
docker compose up --build
```

First run takes 3–5 minutes (downloading base images, compiling Go, installing node deps). Subsequent starts are fast.

### 3. Open the app

- **Landing page** → http://localhost:3001
- **Blockchain dashboard** → http://localhost:5173
- **API health check** → http://localhost:5000/api/health

---

## Common Commands

```bash
# Start all services (detached / background)
docker compose up --build -d

# View logs from all services
docker compose logs -f

# View logs from a specific service
docker compose logs -f backend
docker compose logs -f frontend

# Stop all services
docker compose down

# Stop and wipe all data (chain files, volumes)
docker compose down -v

# Rebuild a single service after code changes
docker compose up --build backend
docker compose up --build landing
```

---

## Using the Blockchain Dashboard

Once the frontend is running at http://localhost:5173, here's the workflow:

### Step 1 — Create a Wallet
Click **Create Wallet**. This generates an ECDSA key pair under the hood (`wallet.go → newKeyPair()`), derives a Bitcoin-style address via SHA-256 → RIPEMD-160 → Base58Check, and saves it to `wallet_3000.dat`.

### Step 2 — Create the Blockchain (Mine Genesis Block)
With your wallet address selected, click **Create Blockchain**. This:
- Creates a coinbase transaction rewarding your address with **10 coins**
- Runs real SHA-256 Proof of Work (`proofofwork.go`)
- Writes the genesis block to BoltDB (`blockchain_3000.db`)
- Indexes the UTXO set

### Step 3 — Check Balance
Your wallet should now show **10 BTC**. The balance is computed by scanning all UTXOs linked to your public key hash.

### Step 4 — Send a Transaction
Enter a recipient address and amount, then click **Send**. With `-mine` enabled, the transaction is bundled into a new block immediately.

### Step 5 — View the Chain
The **Blocks** tab shows the full chain. Each block shows height, hash, previous hash, PoW status, and included transactions.

### Step 6 — Reindex UTXO
If balances look off (e.g., after a reset), use **Reindex UTXO** to rebuild the UTXO set from scratch by scanning the entire chain.

---

## Resetting the Chain

To wipe everything and start fresh:

**Option A — Via the API:**
```bash
curl -X POST http://localhost:5000/api/reset
```

**Option B — Via the dashboard:**
Use the Reset button in the settings/danger zone section.

**Option C — Nuclear (wipe Docker volumes too):**
```bash
docker compose down -v
docker compose up --build
```

---

## Architecture Overview

```
                    ┌─────────────────┐
                    │   go-builder    │  Compiles Go binary
                    │  (init, exits)  │  → /go-bin volume
                    └────────┬────────┘
                             │ go-bin volume (/go-bin/chainforge)
                    ┌────────▼────────┐
   Browser          │    backend      │  Express :5000
   http://          │  /go-root/      │  CMD copies /go-bin/chainforge
   localhost:5000   │    backend/     │  → /usr/local/bin/chainforge.exe
                    │    server.js    │  then server.js calls it via execSync()
                    └────────┬────────┘
                             │ REST API (/api/*)
          ┌──────────────────┼──────────────────┐
          │                  │                  │
 ┌────────▼────────┐         │       ┌──────────▼──────┐
 │    frontend     │         │       │    landing      │
 │   Vite/React    │         │       │   Next.js       │
 │   :5173         │         │       │   :3001         │
 │  proxy /api →   │         │       └─────────────────┘
 │  backend:5000   │         │
 └─────────────────┘         │
       ↑ browser             │
  Blockchain dashboard       │ chain-data volume (/go-root)
                             │  blockchain_3000.db
                             │  wallet_3000.dat
                    ─────────┘

Container path layout (backend):
  /go-root/          ← GO_ROOT = path.resolve(__dirname, '..')
    backend/
      server.js      ← __dirname
      node_modules/
  /go-bin/           ← go-bin volume (Go binary from go-builder)
  /usr/local/bin/
    chainforge.exe   ← copied from /go-bin at container startup
```

The Go binary is a **CLI tool**, not a long-running server. The Express backend spawns it as a child process for each operation (create wallet, send TX, mine block, etc.) and parses stdout. BoltDB files persist between calls via Docker volumes.

---

## Environment Variables

| Variable    | Service   | Default      | Description                          |
|-------------|-----------|--------------|--------------------------------------|
| `MONGO_URI` | backend   | *(empty)*    | MongoDB Atlas connection string      |
| `PORT`      | backend   | `5000`       | Express server port                  |
| `NODE_ID`   | backend   | `3000`       | Blockchain node ID (affects filenames) |

---

## Troubleshooting

**`chainforge.exe: not found` in backend logs**
The Go binary didn't copy into the shared volume. Run:
```bash
docker compose down -v && docker compose up --build
```
This forces go-builder to recompile and re-populate the `go-bin` volume.

**Frontend shows "Failed to fetch" or API errors**
The Vite dev server proxies `/api` → `backend:5000` inside Docker (via `vite.config.docker.ts`). Make sure the backend container started successfully:
```bash
docker compose logs backend
```

**MongoDB connection warning**
```
⚠️  MongoDB unavailable — running without DB cache
```
This is non-fatal. The blockchain still works fully. TX history just won't persist across restarts. Add a valid `MONGO_URI` to `.env` to fix it.

**Port 3001 already in use**
Change the landing port in `docker-compose.yml`:
```yaml
landing:
  ports:
    - "3002:3000"  # or any free port
```

**Go build fails (go.mod toolchain version)**
`go.mod` may declare a toolchain version newer than `golang:1.23`. This is handled by `GOTOOLCHAIN=local` in `Dockerfile.go` which tells Go to use the installed compiler without checking the declared version. If you still hit issues:
```bash
docker compose down -v && docker compose up --build
```
