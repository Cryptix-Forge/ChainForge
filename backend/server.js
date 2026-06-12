require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ID = process.env.NODE_ID || '3000';

const GO_ROOT = path.resolve(__dirname, '..');

app.use(cors());
app.use(express.json());

// ─── MongoDB Connection (optional — app works without it) ─────────────────────
let mongoOnline = false;

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  bufferCommands: false,
}).then(() => {
  mongoOnline = true;
  console.log('✅ MongoDB connected');
}).catch(err => {
  mongoOnline = false;
  console.warn('⚠️  MongoDB unavailable — running without DB cache:', err.message);
});

// ─── Schemas ──────────────────────────────────────────────────────────────────
const blockSchema = new mongoose.Schema({
  height: Number, hash: String, prevHash: String,
  timestamp: Number, nonce: Number, txCount: Number,
  transactions: Array,
  nodeId: { type: String, default: NODE_ID },
  minedAt: { type: Date, default: Date.now }
}, { bufferCommands: false });

const txLogSchema = new mongoose.Schema({
  txId: String, from: String, to: String, amount: Number,
  timestamp: { type: Date, default: Date.now },
  nodeId: { type: String, default: NODE_ID }
}, { bufferCommands: false });

const walletSchema = new mongoose.Schema({
  address: String, label: String,
  createdAt: { type: Date, default: Date.now },
  nodeId: { type: String, default: NODE_ID }
}, { bufferCommands: false });

const BlockModel = mongoose.model('Block', blockSchema);
const TxLog     = mongoose.model('TxLog', txLogSchema);
const WalletModel = mongoose.model('Wallet', walletSchema);

// ─── Safe DB helper ───────────────────────────────────────────────────────────
async function dbTry(fn) {
  if (!mongoOnline) return null;
  try { return await fn(); } catch (e) {
    console.warn('DB op failed (non-fatal):', e.message);
    return null;
  }
}

// ─── Go runner ────────────────────────────────────────────────────────────────
function runGoCmd(args) {
  try {
    const result = execSync(`chainforge.exe ${args}`, {
      cwd: GO_ROOT,
      env: { ...process.env, NODE_ID },
      timeout: 120000,   // 2 min — real PoW can take a moment
      encoding: 'utf8'
    });
    return { success: true, output: result.trim() };
  } catch (err) {
    return { success: false, output: err.stdout?.trim() || err.message || 'Unknown error' };
  }
}

function parseBlocks(output) {
  const blocks = [];
  // Each block starts with: ============ Block <hash> ============
  // followed by Height, Prev. block, PoW, then transactions
  const blockRegex = /={4,}\s*Block\s+([a-f0-9]+)\s*={4,}\n([\s\S]*?)(?=={4,}\s*Block\s+[a-f0-9]+\s*={4,}|$)/g;
  let match;
  while ((match = blockRegex.exec(output)) !== null) {
    const hash   = match[1];
    const body   = match[2];
    const heightMatch = body.match(/Height:\s*(\d+)/);
    const prevMatch   = body.match(/Prev\.\s*block:\s*([a-f0-9]*)/);
    const powMatch    = body.match(/PoW:\s*(\w+)/);
    const txMatches   = [...body.matchAll(/--- Transaction ([a-f0-9]+):/g)];
    blocks.push({
      height:       heightMatch ? parseInt(heightMatch[1]) : 0,
      hash,
      prevHash:     prevMatch   ? prevMatch[1]            : '',
      nonce:        0,
      txCount:      txMatches.length,
      transactions: txMatches.map(m => ({ id: m[1] })),
      pow:          powMatch    ? powMatch[1]             : 'unknown'
    });
  }
  // printchain outputs newest→oldest, reverse to height ascending
  return blocks.reverse();
}

async function syncBlocks() {
  const chainResult = runGoCmd('printchain');
  if (!chainResult.success) return;
  const blocks = parseBlocks(chainResult.output);
  for (const b of blocks) {
    await dbTry(() => BlockModel.findOneAndUpdate(
      { hash: b.hash, nodeId: NODE_ID },
      { ...b, nodeId: NODE_ID },
      { upsert: true, setDefaultsOnInsert: true }
    ));
  }
}

// ─── Debug (remove before prod) ─────────────────────────────────────────────
app.get('/api/debug/printchain', (req, res) => {
  const result = runGoCmd('printchain');
  res.json({ success: result.success, raw: result.output });
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', nodeId: NODE_ID, timestamp: Date.now(), mongoOnline });
});

// ── Wallets ───────────────────────────────────────────────────────────────────
app.post('/api/wallet/create', async (req, res) => {
  const result = runGoCmd('createwallet');
  if (!result.success) {
    return res.status(500).json({ success: false, error: result.output });
  }
  const addressMatch = result.output.match(/Your new address:\s*([A-Za-z0-9]+)/);
  const address = addressMatch ? addressMatch[1] : null;
  if (address) {
    await dbTry(() => WalletModel.create({
      address, label: `Wallet-${address.slice(0, 6)}`, nodeId: NODE_ID
    }));
  }
  res.json({
    success: true, address, rawOutput: result.output,
    backendTrace: [
      { file: 'wallet.go',  fn: 'NewWallet()' },
      { file: 'wallet.go',  fn: 'newKeyPair() → ECDSA P-256' },
      { file: 'wallet.go',  fn: 'GetAddress() → SHA256 → RIPEMD160 → Base58' },
      { file: 'wallets.go', fn: `SaveToFile() → wallet_${NODE_ID}.dat` }
    ]
  });
});

app.get('/api/wallet/list', async (req, res) => {
  const result    = runGoCmd('listaddresses');
  const lines     = result.output.split('\n').map(l => l.trim()).filter(l => l.length > 25);
  const addresses = lines.filter(l => /^[A-Za-z0-9]{25,}$/.test(l));
  for (const addr of addresses) {
    await dbTry(() => WalletModel.findOneAndUpdate(
      { address: addr, nodeId: NODE_ID },
      { address: addr, nodeId: NODE_ID },
      { upsert: true, setDefaultsOnInsert: true }
    ));
  }
  const wallets = await dbTry(() => WalletModel.find({ nodeId: NODE_ID }).sort({ createdAt: 1 })) || [];
  res.json({ success: true, addresses, wallets });
});

app.get('/api/wallet/balance/:address', (req, res) => {
  const { address } = req.params;
  const result = runGoCmd(`getbalance -address ${address}`);
  const balanceMatch = result.output.match(/Balance of '.*?':\s*(\d+)/);
  const balance = balanceMatch ? parseInt(balanceMatch[1]) : 0;
  res.json({
    success: result.success, address, balance, rawOutput: result.output,
    backendTrace: [
      { file: 'utxo_set.go', fn: 'FindUTXO(pubKeyHash)' },
      { file: 'wallet.go',   fn: 'HashPubKey() → RIPEMD160' }
    ]
  });
});

app.delete('/api/wallet/:address', async (req, res) => {
  const { address } = req.params;
  if (!address) return res.status(400).json({ success: false, error: 'address required' });

  // wallets are stored in a .dat file — we need to read it, remove the key, and rewrite it
  // ChainForge has no CLI delete command, so we handle it at the DB/label level only
  // and mark it as deleted. The key stays in the .dat file (Go owns that binary format)
  // but it will no longer appear in the UI.
  await dbTry(() => WalletModel.deleteOne({ address, nodeId: NODE_ID }));

  res.json({
    success: true,
    address,
    note: 'Wallet removed from UI. The key remains in wallet_' + NODE_ID + '.dat (Go binary format — no CLI delete command exists). If you want a full wipe, delete the .dat file and restart.',
    backendTrace: [
      { file: 'wallets.go', fn: 'WalletModel.deleteOne() — MongoDB only' }
    ]
  });
});

// ── Reset everything (chain + wallet db) ─────────────────────────────────────
app.post('/api/reset', async (req, res) => {
  // Delete blockchain db
  const dbPath  = path.join(GO_ROOT, `blockchain_${NODE_ID}.db`);
  const datPath = path.join(GO_ROOT, `wallet_${NODE_ID}.dat`);
  try { fs.unlinkSync(dbPath);  } catch (_) {}
  try { fs.unlinkSync(datPath); } catch (_) {}

  // Wipe MongoDB collections
  await dbTry(() => BlockModel.deleteMany({ nodeId: NODE_ID }));
  await dbTry(() => TxLog.deleteMany({ nodeId: NODE_ID }));
  await dbTry(() => WalletModel.deleteMany({ nodeId: NODE_ID }));

  res.json({
    success: true,
    message: 'Chain and wallet file wiped. Create a new wallet and mine the genesis block to start fresh.'
  });
});

// ── Blockchain ────────────────────────────────────────────────────────────────
app.post('/api/blockchain/create', async (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ success: false, error: 'address required' });
  const result = runGoCmd(`createblockchain -address ${address}`);
  if (result.success) await syncBlocks();
  res.json({
    success: result.success, rawOutput: result.output,
    backendTrace: [
      { file: 'transaction.go', fn: 'NewCoinbaseTX()' },
      { file: 'block.go',       fn: 'NewGenesisBlock()' },
      { file: 'proofofwork.go', fn: 'NewProofOfWork().Run()' },
      { file: 'blockchain.go',  fn: 'CreateBlockchain() → BoltDB Write' },
      { file: 'utxo_set.go',    fn: 'UTXOSet.Reindex()' }
    ]
  });
});

app.get('/api/blockchain/blocks', async (req, res) => {
  const result = runGoCmd('printchain');
  if (!result.success) {
    const cached = await dbTry(() => BlockModel.find({ nodeId: NODE_ID }).sort({ height: -1 })) || [];
    return res.json({ success: true, blocks: cached, source: 'cache' });
  }
  const blocks = parseBlocks(result.output);
  // parseBlocks returns height asc; reverse for newest-first API response
  const blocksSorted = [...blocks].reverse();
  for (const b of blocks) {
    await dbTry(() => BlockModel.findOneAndUpdate(
      { hash: b.hash, nodeId: NODE_ID },
      { ...b, nodeId: NODE_ID },
      { upsert: true, setDefaultsOnInsert: true }
    ));
  }
  res.json({ success: true, blocks: blocksSorted, source: 'live', rawOutput: result.output });
});

app.get('/api/blockchain/exists', (req, res) => {
  const result = runGoCmd('printchain');
  const exists = result.success && result.output.length > 10;
  res.json({ exists, nodeId: NODE_ID });
});

// ── Transactions ──────────────────────────────────────────────────────────────
app.post('/api/transaction/send', async (req, res) => {
  const { from, to, amount, mine } = req.body;
  if (!from || !to || !amount)
    return res.status(400).json({ success: false, error: 'from, to, amount required' });
  const mineFlag = mine ? ' -mine' : '';
  const result = runGoCmd(`send -from ${from} -to ${to} -amount ${amount}${mineFlag}`);
  if (result.success) {
    await dbTry(() => TxLog.create({ from, to, amount: parseInt(amount), nodeId: NODE_ID }));
    await syncBlocks();
  }
  res.json({
    success: result.success, rawOutput: result.output,
    backendTrace: [
      { file: 'utxo_set.go',    fn: 'FindSpendableOutputs()' },
      { file: 'transaction.go', fn: 'NewUTXOTransaction()' },
      { file: 'transaction.go', fn: 'Sign() → ECDSA' },
      { file: 'blockchain.go',  fn: 'MineBlock()' },
      { file: 'utxo_set.go',    fn: 'UTXOSet.Update()' },
      ...(mine ? [{ file: 'server.go', fn: 'BroadcastTransaction()' }] : [])
    ]
  });
});

app.get('/api/transaction/history', async (req, res) => {
  const txs = await dbTry(() => TxLog.find({ nodeId: NODE_ID }).sort({ timestamp: -1 }).limit(20)) || [];
  res.json({ success: true, transactions: txs });
});

// ── UTXO ──────────────────────────────────────────────────────────────────────
app.get('/api/utxo/reindex', (req, res) => {
  const result = runGoCmd('reindexutxo');
  const countMatch = result.output.match(/Done! There are (\d+) transactions/);
  res.json({
    success: result.success,
    transactionCount: countMatch ? parseInt(countMatch[1]) : null,
    rawOutput: result.output,
    backendTrace: [
      { file: 'utxo_set.go',  fn: 'UTXOSet.Reindex()' },
      { file: 'blockchain.go', fn: 'FindUTXO()' }
    ]
  });
});

// ── Node ──────────────────────────────────────────────────────────────────────
app.get('/api/node/status', (req, res) => {
  res.json({
    success: true, nodeId: NODE_ID,
    address: `localhost:${NODE_ID}`,
    knownNodes: ['localhost:3000'],
    mempoolSize: 0, status: 'ready'
  });
});

// ── Mine a real block — coinbase reward goes to minerAddress ──────────────────
// Strategy:
//   1. If the miner has balance >= 1: use the self-send trick (-from ADDR -to ADDR -amount 1 -mine)
//      The coinbase TX in that block gives the real reward; the 1-coin self-send is just the vehicle.
//   2. If the miner has 0 balance (fresh wallet): recreate the blockchain seeded to this address.
//      createblockchain mines a genesis block with a coinbase TX → miner gets 10 coins immediately.
//      This deletes the existing chain, so it's only appropriate when balance is 0 anyway.
app.post('/api/mine/block', async (req, res) => {
  const { minerAddress } = req.body;
  if (!minerAddress) {
    return res.status(400).json({ success: false, error: 'minerAddress required' });
  }

  // Check current balance first
  const balCheckResult = runGoCmd(`getbalance -address ${minerAddress}`);
  const balCheckMatch  = balCheckResult.output.match(/Balance of '.*?':\s*(\d+)/);
  const currentBalance = balCheckMatch ? parseInt(balCheckMatch[1]) : 0;

  let result;
  let strategy;

  if (currentBalance >= 1) {
    // Strategy 1: normal self-send with -mine flag
    // This bundles [coinbaseTX + spendTX] into one block
    strategy = 'self-send';
    result = runGoCmd(`send -from ${minerAddress} -to ${minerAddress} -amount 1 -mine`);
  } else {
    // Strategy 2: wallet is empty — delete existing chain db and recreate with this address
    // This mines a genesis block and awards 10 coins to minerAddress
    strategy = 'createblockchain';
    const dbPath = path.join(GO_ROOT, `blockchain_${NODE_ID}.db`);
    try { fs.unlinkSync(dbPath); } catch (_) { /* db didn't exist, that's fine */ }
    result = runGoCmd(`createblockchain -address ${minerAddress}`);
  }

  if (result.success) {
    await syncBlocks();

    // Fetch updated balance
    const balResult  = runGoCmd(`getbalance -address ${minerAddress}`);
    const balMatch   = balResult.output.match(/Balance of '.*?':\s*(\d+)/);
    const newBalance = balMatch ? parseInt(balMatch[1]) : null;

    // Log coinbase reward
    await dbTry(() => TxLog.create({
      txId: `coinbase-${Date.now()}`,
      from: 'COINBASE',
      to: minerAddress,
      amount: 10,
      nodeId: NODE_ID
    }));

    return res.json({
      success: true,
      minerAddress,
      newBalance,
      strategy,
      rawOutput: result.output,
      backendTrace: [
        { file: 'transaction.go', fn: 'NewCoinbaseTX(minerAddress)' },
        { file: 'proofofwork.go', fn: 'NewProofOfWork().Run() — real SHA-256 PoW' },
        { file: 'blockchain.go',  fn: strategy === 'createblockchain' ? 'CreateBlockchain() → Genesis block' : 'MineBlock([coinbaseTX, spendTX])' },
        { file: 'utxo_set.go',   fn: 'UTXOSet.Reindex() / Update(newBlock)' },
      ]
    });
  }

  res.status(500).json({
    success: false,
    error: result.output,
    strategy,
    hint: strategy === 'createblockchain'
      ? 'createblockchain failed. Make sure the address is valid and the Go binary is working.'
      : 'send -mine failed despite having balance. Try reindexing UTXO via /api/utxo/reindex first.'
  });
});

// ── Mining simulation (visual only, no real PoW) ──────────────────────────────
app.post('/api/mine/simulate', (req, res) => {
  const { difficulty = 16 } = req.body;
  const crypto = require('crypto');
  const steps = [];
  for (let nonce = 0; nonce < 8; nonce++) {
    const hash = crypto.createHash('sha256').update(`blockdata_${Date.now()}_${nonce}`).digest('hex');
    const target = '0'.repeat(Math.floor(difficulty / 4));
    const valid = hash.startsWith(target);
    steps.push({ nonce, hash, valid });
    if (valid) break;
  }
  res.json({ success: true, difficulty, steps });
});

// ── Merkle tree ───────────────────────────────────────────────────────────────
app.post('/api/merkle/build', (req, res) => {
  const { transactions = [] } = req.body;
  const crypto = require('crypto');
  const hash = (d) => crypto.createHash('sha256').update(d).digest('hex').slice(0, 12);
  const txHashes = transactions.map(tx => ({ id: tx, hash: hash(tx) }));
  const levels = [txHashes.map(t => t.hash)];
  let current = [...levels[0]];
  while (current.length > 1) {
    const next = [];
    for (let i = 0; i < current.length; i += 2)
      next.push(hash(current[i] + (current[i + 1] || current[i])));
    levels.push(next);
    current = next;
  }
  res.json({ success: true, leaves: txHashes, levels, root: current[0] || null });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🔗 ChainForge API running on http://localhost:${PORT}`);
  console.log(`📦 Node ID: ${NODE_ID}`);
  console.log(`🗃️  Go root: ${GO_ROOT}\n`);
});
