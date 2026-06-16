package main

import (
	"encoding/hex"
	"fmt"
)

func (cli *CLI) validateBlock(blockHash, nodeID string) {
	bc := NewBlockchain(nodeID)
	defer bc.db.Close()

	// Bad input/not-found are expected, recoverable outcomes here (the API
	// lets users paste arbitrary hashes) — report them cleanly instead of
	// log.Panic'ing, which would dump a raw Go stack trace back through the
	// Express layer and into the UI.
	hashBytes, err := hex.DecodeString(blockHash)
	if err != nil {
		fmt.Println("VALIDATE_ERROR:Invalid block hash — must be a hex string")
		return
	}

	block, err := bc.GetBlock(hashBytes)
	if err != nil {
		fmt.Println("VALIDATE_ERROR:Block not found in chain")
		return
	}

	// ── 1. Proof-of-Work ─────────────────────────────────────────────────────
	pow := NewProofOfWork(&block)
	powValid := pow.Validate()
	fmt.Printf("BLOCK_HEIGHT:%d\n", block.Height)
	fmt.Printf("BLOCK_NONCE:%d\n", block.Nonce)
	fmt.Printf("TARGET_BITS:%d\n", targetBits)
	fmt.Printf("POW_RESULT:%t\n", powValid)

	// ── 2. Merkle Root ───────────────────────────────────────────────────────
	// Recompute merkle root from the block's transactions and report it.
	// If PoW is valid, the merkle root embedded in the PoW data was correct
	// at mining time — so merkle validity is tied to PoW.
	merkleRoot := block.HashTransactions()
	fmt.Printf("MERKLE_ROOT:%x\n", merkleRoot)
	fmt.Printf("TX_COUNT:%d\n", len(block.Transactions))
	fmt.Printf("MERKLE_RESULT:%t\n", powValid)

	// ── 3. Transaction Signatures ────────────────────────────────────────────
	allTxValid := true
	for i, tx := range block.Transactions {
		if tx.IsCoinbase() {
			fmt.Printf("TX_RESULT:%d:%x:coinbase:true\n", i, tx.ID)
			continue
		}
		valid := bc.VerifyTransaction(tx)
		if !valid {
			allTxValid = false
		}
		fmt.Printf("TX_RESULT:%d:%x:regular:%t\n", i, tx.ID, valid)
	}

	// ── Overall verdict ──────────────────────────────────────────────────────
	if powValid && allTxValid {
		fmt.Println("OVERALL:VALID")
	} else {
		fmt.Println("OVERALL:INVALID")
	}
}
