ChainForge — Blockchain in Go
ChainForge is a fully working blockchain built from scratch in Go, with a web dashboard you can open in your browser. It implements the core ideas behind Bitcoin — blocks, proof-of-work mining, wallets, digital signatures, and peer-to-peer networking — without using any existing blockchain library. Everything from the cryptography to the storage layer is written by hand.

The project has three parts that work together:

The Go core — the actual blockchain engine (mining, wallets, transactions, networking)
The Node.js backend — a REST API that acts as a bridge between the browser and the Go binary
The React frontend — a clean web dashboard to interact with your node visually
How the Whole System Works — End to End
This section explains the complete lifecycle of everything that happens in ChainForge, from the moment you start the app to the moment coins move between wallets. Read this first — it will make every other part of the documentation make sense.

Step 1 — Wallets are created
Before anything else, you need at least one wallet. A wallet is not an account on a server somewhere. It is just a cryptographic key pair generated entirely on your machine:

A private key — a randomly generated 256-bit number. This never leaves your machine and is used to sign transactions (prove ownership).
A public key — mathematically derived from the private key. This can be shared freely.
An address — derived from the public key using SHA-256, then RIPEMD-160 hashing, then Base58Check encoding. The result is a ~34 character string starting with 1, for example 1K6iLUQ6oxv4nNoLw5sZnVndkRGqLLn2hd. This is what you share with others to receive coins.
All wallets are stored in a file called wallet_3000.dat on disk. There is no password — whoever has this file has access to all the private keys in it.

Step 2 — The blockchain is initialized (genesis block)
A blockchain is a linked list of blocks stored in a BoltDB database file (blockchain_3000.db). Before any transactions can happen, someone has to create the very first block — the genesis block.

When you run createblockchain -address YOUR_ADDRESS, this happens:

A special coinbase transaction is created. A coinbase transaction has no inputs (it does not spend any existing coins). It simply creates 10 new coins out of thin air and locks them to your address. This is the only legitimate way new coins enter the system.
The genesis block is assembled — it contains this coinbase transaction, a timestamp, and no previous hash (since it is the first block).
Proof of Work mining begins. The node starts hashing the block's data combined with a nonce (a counter starting at 0). It keeps incrementing the nonce and rehashing until it finds a hash that starts with enough leading zero bits (controlled by targetBits = 16). This takes real CPU effort and proves that work was done.
Once a valid nonce is found, the block is written to blockchain_3000.db.
The UTXO set is built — a separate BoltDB bucket called chainstate is populated with all unspent transaction outputs. Right now, that is just the one output from the coinbase transaction: 10 coins locked to your address.
After this step, your address has a balance of 10 coins and the chain has exactly one block.

Step 3 — Balances are calculated from UTXOs
ChainForge does not store balances anywhere. There is no "account balance" field in a database. Instead, it uses the UTXO model (Unspent Transaction Output), the same model Bitcoin uses.

Think of it like this: instead of a bank account with a running total, you have a collection of unspent cheques. Each cheque is locked to your address and has a value. Your balance is the sum of all those cheques.

When you run getbalance -address YOUR_ADDRESS, the system scans the UTXO set in chainstate and adds up every output that is locked to your public key hash. That sum is your balance. No scanning of the full chain is needed — the UTXO set is a fast cache maintained specifically for this.

Step 4 — A transaction is created and signed
When you run send -from SENDER -to RECIPIENT -amount 5:

The system looks through the UTXO set and finds outputs locked to the sender's address that add up to at least 5 coins. For example, if the sender has one UTXO worth 10 coins, that single output is selected.
A new transaction is constructed:
Inputs — each input references one of the selected UTXOs by its transaction ID and output index. This marks those coins as "being spent."
Outputs — two new outputs are created:
One output worth 5 coins locked to the recipient's address.
One change output worth 5 coins locked back to the sender's address (since the full 10-coin UTXO was consumed).
The sender's private key is used to create a digital signature for each input. The signature proves that the person creating this transaction actually owns the coins being spent, without revealing the private key itself.
The transaction is complete and ready to be included in a block.
Step 5 — The transaction is mined into a block
A transaction floating on its own is not confirmed yet — it needs to be packaged into a block and added to the chain. This is what mining does.

If you used the -mine flag:

The transaction is placed into a new block along with a coinbase transaction (the miner reward).
Proof of Work begins — the node hashes the block data + nonce over and over until it finds a hash with enough leading zeros.
Once found, the new block is appended to the chain in blockchain_3000.db.
The UTXO set is updated — the old outputs that were spent as inputs are removed from chainstate, and the new outputs (recipient's coins + sender's change) are added.
If you did NOT use -mine, the transaction is broadcast to the network. A dedicated miner node picks it up from the mempool, bundles it into a block, mines it, and broadcasts the new block back to all nodes.

Step 6 — Nodes stay in sync over the network
When multiple nodes are running, they talk to each other over raw TCP connections using a simple message protocol. Each message is 12 bytes of command name followed by a gob-encoded payload.

Here is how two nodes sync:

When a new node starts up, it sends a version message to the seed node (localhost:3000), which includes its current best block height.
The seed node compares heights. If the new node is behind, the seed node sends back its block hashes via an inv message.
The new node requests the missing blocks using getdata messages.
The seed node responds with the full block data.
The new node adds each block to its own chain and updates its UTXO set.
When a new transaction is broadcast, nodes forward it to all other known nodes via inv → getdata → tx messages until the whole network has it in the mempool.

Step 7 — Miners earn coins by mining blocks
The only way new coins enter the system is through coinbase transactions in mined blocks. Every time a block is successfully mined, the miner who found the valid nonce earns 10 coins (the subsidy constant), credited to their address via the coinbase transaction.

There are two ways to mine in ChainForge:

Manual mining — run mine -address YOUR_ADDRESS at any time. This immediately mines a new block with just a coinbase transaction and credits 10 coins to your address.
Miner node — run startnode -miner YOUR_ADDRESS. This keeps a node running continuously. Whenever the mempool accumulates a transaction, the node automatically mines a new block containing that transaction plus a coinbase, and your address receives the 10-coin reward.
The full picture in one flow
createwallet  ──►  wallet key pair saved to wallet_3000.dat
      │
      ▼
createblockchain  ──►  genesis block mined  ──►  10 coins in UTXO set
      │
      ▼
getbalance  ──►  scan UTXO set  ──►  sum outputs locked to address
      │
      ▼
send  ──►  find UTXOs  ──►  build transaction  ──►  sign with private key
      │
      ▼
mine  ──►  proof of work (hash until leading zeros)  ──►  block added to chain
      │
      ▼
UTXOSet.Update  ──►  remove spent inputs  ──►  add new outputs
      │
      ▼
getbalance  ──►  sender balance reduced  ──►  recipient balance increased
      │
      ▼
startnode -miner  ──►  node watches mempool  ──►  auto-mines  ──►  earns coinbase reward
Every piece of this — the hashing, the signatures, the UTXO tracking, the TCP networking — is implemented from scratch in the Go source files. No blockchain library is used anywhere.

Table of Contents
What This Project Actually Does
How the Three Parts Connect
Project Structure
Prerequisites
Installation & Setup
Running the App
Using the Web Dashboard
Using the CLI Directly
How the Blockchain Works
API Reference
Configuration
Running Tests
Common Errors & Fixes
Tech Stack
What This Project Actually Does
When you run ChainForge, you get your own private blockchain running on your computer. Here is what you can actually do with it:

Create a blockchain. Before anything else, you need to initialize the chain. This mines the very first block (called the genesis block) and sends a reward of 10 coins to a wallet address you specify.

Create wallets. Each wallet is a cryptographic key pair — a private key and a public key — that gets turned into a Bitcoin-style address (a string starting with 1). The private key signs your transactions. The address is what you share with others to receive coins.

Check balances. The system scans every unspent transaction output (UTXO) locked to your address and adds them up to give you your current balance.

Send coins. You can send coins from one address to another. The transaction is cryptographically signed with the sender's private key, verified by the network, and optionally mined into a new block immediately.

Explore blocks. You can inspect every block on the chain — its hash, the previous block's hash, proof-of-work validity, and every transaction inside it.

Run a node. You can start a node on a specific port and connect multiple nodes together. Nodes exchange blocks and transactions automatically using a simple TCP protocol.

How the Three Parts Connect
Browser (React)
      │
      │  HTTP requests to localhost:5000
      ▼
Node.js Express API  ←──── MongoDB (stores tx logs, wallet labels, block cache)
      │
      │  Runs the Go binary as a subprocess
      ▼
chainforge.exe (Go binary)
      │
      │  Reads/writes BoltDB files on disk
      ▼
blockchain_3000.db   wallet_3000.dat
The React frontend talks to the Express API over HTTP. The Express API runs the compiled Go binary (chainforge.exe) as a subprocess and passes it commands like getbalance -address 1Abc.... The Go binary reads and writes its own database files on disk. MongoDB sits alongside this to store extra metadata — transaction logs, wallet labels, and a cache of blocks so the dashboard loads faster when the Go binary is unavailable.

Project Structure
ChainForge-Blockchain-in-Go/
│
├── Go source files (the blockchain core)
│   ├── main.go                  Entry point — just starts the CLI
│   ├── cli.go                   Command-line interface router
│   ├── cli_createblockchain.go  "createblockchain" command
│   ├── cli_createwallet.go      "createwallet" command
│   ├── cli_getbalance.go        "getbalance" command
│   ├── cli_listaddress.go       "listaddresses" command
│   ├── cli_printchain.go        "printchain" command
│   ├── cli_reindexutxo.go       "reindexutxo" command
│   ├── cli_send.go              "send" command
│   ├── cli_startnode.go         "startnode" command
│   ├── block.go                 Block data structure & serialization
│   ├── blockchain.go            Chain logic (create, add, find, mine)
│   ├── blockchain_iterator.go   Walks the chain from tip to genesis
│   ├── proofofwork.go           SHA-256 proof-of-work (targetBits = 16)
│   ├── transaction.go           Transaction structure, signing, verification
│   ├── transaction_input.go     TXInput — references a previous output
│   ├── transaction_output.go    TXOutput — coins locked to a public key hash
│   ├── utxo_set.go              UTXO cache in BoltDB (fast balance lookups)
│   ├── wallet.go                Key generation, address derivation
│   ├── wallets.go               Manages the wallet file on disk
│   ├── merkle_tree.go           Merkle tree for transaction hashing
│   ├── base58.go                Base58 encode/decode (Bitcoin-style addresses)
│   ├── server.go                P2P TCP networking between nodes
│   ├── utils.go                 Small helpers (IntToHex, etc.)
│   ├── go.mod                   Go module definition
│   └── chainforge.exe           Compiled binary (Windows)
│
├── backend/                     Node.js Express API
│   ├── server.js                App entry point, middleware, route wiring
│   ├── goRunner.js              Spawns chainforge.exe as a subprocess
│   ├── db.js                    MongoDB connection
│   ├── .env                     Environment variables (Mongo URI, PORT, NODE_ID)
│   ├── routes/
│   │   ├── blockchain.js        /api/blockchain/* endpoints
│   │   ├── wallet.js            /api/wallet/* endpoints
│   │   └── transaction.js       /api/transaction/* endpoints
│   └── models/
│       ├── Block.js             MongoDB schema for cached blocks
│       ├── Wallet.js            MongoDB schema for wallet labels
│       └── TxLog.js             MongoDB schema for transaction history
│
└── frontend/                    React web dashboard
    └── src/
        ├── App.js               Shell, sidebar, toast system, welcome modal
        ├── index.css            Global styles and design tokens
        ├── api.js               Axios API client
        └── pages/
            ├── Dashboard.js     Overview stats and charts
            ├── Explorer.js      Block browser with expandable details
            ├── Wallets.js       Wallet cards with live balances
            ├── Transactions.js  Transaction history with filtering
            └── Send.js          Send coins form
Prerequisites
Before you start, make sure you have these installed:

Tool	Version	What it's for
Go	1.21 or later	Compiling the blockchain core
Node.js	18 or later	Running the API and frontend
MongoDB	Any (local or Atlas)	Storing transaction logs and wallet metadata
Git	Any	Cloning the project
You also need a MongoDB connection string. The project is pre-configured to use MongoDB Atlas (cloud-hosted), but you can point it at a local MongoDB instance just as easily.

Installation & Setup
Step 1 — Clone the repository
git clone https://github.com/your-username/ChainForge-Blockchain-in-Go.git
cd ChainForge-Blockchain-in-Go
Step 2 — Build the Go binary
This compiles the entire Go source into a single executable. Run this from the project root:

# On Windows
go build -o chainforge.exe .

# On Linux / macOS
go build -o chainforge .
You should see a chainforge.exe (or chainforge) file appear in the project root. The backend needs this file to exist — it runs it as a subprocess every time you click something in the dashboard.

Step 3 — Set up the backend
Navigate into the backend folder and install dependencies:

cd backend
npm install
Now open the .env file in the backend folder. It looks like this:

MONGO_URI=mongodb+srv://...your connection string...
PORT=5000
NODE_ID=3000
MONGO_URI — your MongoDB connection string. The default points to a cloud Atlas cluster. Replace it with your own, or use mongodb://localhost:27017/chainforge if you have MongoDB running locally.
PORT — the port the Express API listens on. Leave this as 5000.
NODE_ID — the ID of your blockchain node. This controls which database file is used (blockchain_3000.db) and which port the Go P2P server listens on. Leave it as 3000 unless you are running multiple nodes.
Step 4 — Set up the frontend
Navigate into the frontend folder and install dependencies:

cd ../frontend
npm install
No additional configuration is needed for the frontend. It is pre-set to proxy API requests to localhost:5000.

Running the App
You need three terminals open at the same time.

Terminal 1 — Start the backend API
cd backend
npm run dev
You should see:

✅ MongoDB connected
🔗 ChainForge API  →  http://localhost:5000
   NODE_ID: 3000
Terminal 2 — Start the frontend
cd frontend
npm start
This opens the dashboard in your browser at http://localhost:3000. The page will load and show you a welcome modal explaining how to use the app.

Terminal 3 — (Optional) Run a second node for P2P testing
If you want to test the peer-to-peer networking, you can start a second node in a separate terminal. First set a different NODE_ID:

# On Windows (PowerShell)
$env:NODE_ID = "3001"
.\chainforge.exe startnode

# On Linux / macOS
NODE_ID=3001 ./chainforge startnode
The second node will connect to the first one (localhost:3000 is the default seed node), sync the chain, and relay transactions.

Using the Web Dashboard
Once the app is running, open http://localhost:3000 in your browser. A welcome modal walks you through the workflow. Here is the full explanation of each page:

Dashboard
The first page you see. It shows four summary cards — block height, total blocks, number of wallets, and confirmed transactions. Below that is a bar chart of transaction volume over the last 7 days, and a table of your most recent transactions.

Block Explorer
This is where you initialize the blockchain. The very first thing you need to do when starting fresh is:

Go to the Block Explorer page
Paste a wallet address into the "Genesis Reward Address" field (create a wallet first — see below)
Click Create Blockchain
This mines the genesis block and sends 10 coins to that address. After that, you can see every block on the chain. Click any block row to expand it and see its hash, previous hash, timestamp, and every transaction inside.

The Reindex UTXO button rebuilds the unspent output cache. Use this if balances look wrong.

Wallets
This page lists all your wallets. Click New Wallet to generate a fresh key pair and Bitcoin-style address. Each wallet card shows the address, its label (which you can edit by clicking the pencil icon), and its live balance in coins.

The avatar color is derived from the first character of the address, so each wallet gets a consistent color automatically.

Tx History
Shows every transaction that has passed through your node, logged to MongoDB. You can filter by address — either paste one in manually or pick from the dropdown of your wallets. The table shows the transaction ID, sender, recipient, amount, whether it was mined into a block, its status (success / pending / failed), and the date.

Send
Fill in the form to send coins. Choose the sender from the dropdown (populated from your wallets), enter the recipient's address, and enter the amount. Toggle Mine immediately on if you want the node to mine a new block right away containing this transaction — useful for testing. Without this flag, the transaction goes into the mempool and waits for a mining node to include it.

After submitting, a result banner appears showing whether the transaction succeeded or failed, along with the transaction ID.

Using the CLI Directly
If you prefer working in the terminal, you can run commands directly against the Go binary. You must always set the NODE_ID environment variable first.

# On Windows (PowerShell)
$env:NODE_ID = "3000"

# On Linux / macOS
export NODE_ID=3000
Create a blockchain
This mines the genesis block and awards the coinbase reward (10 coins) to the address you provide.

./chainforge createblockchain -address YOUR_ADDRESS
Create a wallet
Generates a new key pair and saves it to wallet_3000.dat. Prints the new address.

./chainforge createwallet
List all wallet addresses
Prints every address stored in the wallet file.

./chainforge listaddresses
Check a balance
./chainforge getbalance -address YOUR_ADDRESS
Send coins
Sends coins from one address to another. Add -mine to mine a new block immediately after creating the transaction.

./chainforge send -from SENDER_ADDRESS -to RECIPIENT_ADDRESS -amount 5 -mine
Mine a block manually
Mines a new block with a coinbase transaction only, earning 10 coins as a reward for the given address.

./chainforge mine -address YOUR_ADDRESS
Print the entire chain
Prints every block in the chain from newest to oldest, including all transactions inside each block.

./chainforge printchain
Reindex the UTXO set
Rebuilds the unspent transaction output index from scratch. Run this if balances look stale or incorrect.

./chainforge reindexutxo
Start a node
Starts the TCP P2P server. Use -miner to enable automatic mining — the node will mine a new block and collect the coinbase reward to your address whenever a transaction arrives in the mempool.

./chainforge startnode
./chainforge startnode -miner YOUR_ADDRESS
How the Blockchain Works
This section explains the key concepts behind the code, in plain terms.

Blocks
A block is just a container. It holds a list of transactions, the hash of the previous block (which is how the chain forms), a timestamp, a nonce (a number used in mining), and a height (its position in the chain, starting from 0).

Every block is stored as serialized bytes in a BoltDB file (blockchain_3000.db) on disk.

Proof of Work
Mining a block means finding a nonce value such that the SHA-256 hash of the block's data starts with a certain number of leading zero bits. The number of required leading zeros is controlled by targetBits, which is set to 16 in this project.

In plain terms: the node keeps trying different nonce values (0, 1, 2, 3...) until it finds one where the resulting hash is small enough. This takes real computational effort, which is what makes the chain tamper-resistant. Once a valid nonce is found, the block is locked — changing anything inside it would invalidate the hash and break the chain.

Wallets and Addresses
A wallet is an ECDSA key pair on the P-256 elliptic curve. Your private key is secret and is used to sign transactions. Your public key is derived from the private key and can be shared freely.

Your address is derived from your public key using the same steps Bitcoin uses:

SHA-256 hash the public key
RIPEMD-160 hash the result
Add a version byte (0x00) at the front
Double SHA-256 the result and take the first 4 bytes as a checksum
Append the checksum
Base58-encode the whole thing
The result is a ~34-character address that starts with 1.

Wallets are saved to wallet_3000.dat on disk using Go's gob encoding.

Transactions and UTXOs
ChainForge uses the UTXO model, the same model Bitcoin uses. There are no account balances stored anywhere. Instead, the chain records unspent transaction outputs — chunks of coins that are locked to a public key hash.

When you send coins, you find UTXOs locked to your address that add up to at least the amount you want to send. You create a new transaction that spends those old outputs as inputs and creates new outputs — one locked to the recipient's address for the amount, and one locked back to your address for the change (if any).

To prevent fraud, each input in a transaction contains a digital signature made with the sender's private key. The network verifies this signature before accepting the transaction.

The coinbase transaction is a special case — it has no inputs and is how new coins enter the system. Every mined block starts with a coinbase transaction that pays the miner a reward of 10 coins.

The UTXO Set
Scanning the entire chain to calculate a balance would be slow. ChainForge maintains a separate UTXO cache in a BoltDB bucket called chainstate. This cache stores only the unspent outputs and is updated every time a new block is mined. The reindexutxo command rebuilds it from scratch if it ever gets out of sync.

Merkle Trees
Inside each block, transactions are hashed together using a Merkle tree. Each transaction is hashed individually, then pairs of hashes are hashed together, and so on up to a single root hash. This root hash is what gets included in the block. It is a compact cryptographic summary of all the transactions — if any transaction is modified, the root hash changes.

Peer-to-Peer Networking
Nodes communicate over raw TCP connections using a simple command-based protocol. Each message starts with a 12-byte command name (like version, getblocks, inv, block, tx), followed by a gob-encoded payload.

When a new node starts up, it connects to the seed node (localhost:3000) and sends a version message containing its best block height. The seed node compares heights and sends back its block hashes if it has more. Nodes then request and exchange missing blocks until they are in sync. New transactions are broadcast to all known nodes.

API Reference
The Express backend exposes these endpoints. All are prefixed with /api.

Health
Method	Path	Description
GET	/api/health	Returns { status: "ok" }. Confirms the API is running.
Blockchain
Method	Path	Description
GET	/api/blockchain/chain	Parses the full chain from the Go binary and returns all blocks. Upserts them into MongoDB as a cache.
GET	/api/blockchain/height	Returns the current block height and total block count.
GET	/api/blockchain/blocks	Returns paginated blocks from MongoDB. Query params: page, limit.
POST	/api/blockchain/create	Creates the blockchain. Body: { "address": "1Abc..." }
POST	/api/blockchain/reindex	Runs reindexutxo on the Go binary. Rebuilds the UTXO cache.
Wallet
Method	Path	Description
GET	/api/wallet/list	Lists all wallet addresses from the Go binary. Syncs them to MongoDB.
POST	/api/wallet/create	Creates a new wallet. Returns { "address": "1Xyz..." }
GET	/api/wallet/balance/:address	Returns the balance of the given address.
PATCH	/api/wallet/:address/label	Updates the display label for a wallet. Body: { "label": "My Wallet" }
Transaction
Method	Path	Description
POST	/api/transaction/send	Sends coins. Body: { "from", "to", "amount", "mine" }. Logs to MongoDB.
GET	/api/transaction/history	Returns paginated transaction history. Query params: address, page, limit.
Configuration
backend/.env
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/BlockChain
PORT=5000
NODE_ID=3000
NODE_ID controls which .db and .dat files the Go binary uses. Node 3000 uses blockchain_3000.db and wallet_3000.dat. If you set NODE_ID=3001, it uses blockchain_3001.db and wallet_3001.dat. This is how you run multiple independent nodes on the same machine.

Proof-of-Work Difficulty
The mining difficulty is set in proofofwork.go:

const targetBits = 16
Higher values mean harder mining (more leading zeros required). 16 is fast enough for development. Bitcoin uses a dynamically adjusted target. Changing this and recompiling the binary will affect all new blocks mined.

Coinbase Reward
The block reward is set in transaction.go:

const subsidy = 10
Every mined block's coinbase transaction pays this many coins to the miner's address.

Running Tests
The project includes tests for the Merkle tree and Base58 encoding:

# Run all tests from the project root
go test ./...

# Run a specific test file
go test -v -run TestMerkleTree
go test -v -run TestBase58
Common Errors & Fixes
"No existing blockchain found. Create one first." You have not initialized the blockchain yet. Go to Block Explorer in the dashboard and use the Create Blockchain form, or run ./chainforge createblockchain -address YOUR_ADDRESS in the terminal.

"Blockchain already exists." You tried to run createblockchain when a blockchain_3000.db file already exists. Delete the .db file and try again if you want a fresh chain.

"ERROR: Not enough funds" The sender wallet does not have enough coins to cover the transaction amount. Check the balance on the Wallets page first.

"NODE_ID env. var is not set!" The Go binary requires the NODE_ID environment variable. In the terminal, run export NODE_ID=3000 (Linux/macOS) or $env:NODE_ID = "3000" (PowerShell) before running any commands.

MongoDB connection fails on startup Check that your MONGO_URI in backend/.env is correct and that your IP address is whitelisted in MongoDB Atlas (or that your local MongoDB service is running).

Balances look wrong or stale Run Reindex UTXO from the Block Explorer page, or run ./chainforge reindexutxo in the terminal. This rebuilds the UTXO cache from scratch.

The dashboard loads but all API calls fail Make sure the backend is running (npm run dev in the backend folder) and that it is listening on port 5000. The frontend proxies all /api requests to localhost:5000.

Tech Stack
Layer	Technology	Why
Blockchain core	Go 1.21	Performance, simplicity, strong standard library for cryptography
On-disk storage	BoltDB	Embedded key-value store — no separate database server needed for the chain
Cryptography	Go crypto/ecdsa, crypto/sha256, golang.org/x/crypto/ripemd160	Standard, audited implementations
API server	Node.js + Express	Easy subprocess management, quick REST API setup
Transaction logging	MongoDB + Mongoose	Flexible schema for logs and metadata that don't belong on-chain
Frontend	React 18	Component model suits the dashboard layout
Charts	Recharts	Simple declarative chart components for React
Icons	Lucide React	Consistent, clean icon set
Fonts	Instrument Serif + Geist	Editorial serif for headings, clean geometric sans for UI
License
This project is licensed under the MIT License. See the LICENSE file for details.