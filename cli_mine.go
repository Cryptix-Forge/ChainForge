package main

import (
	"fmt"
	"log"
)

func (cli *CLI) mineBlock(address, nodeID string) {
	if !ValidateAddress(address) {
		log.Panic("ERROR: Address is not valid")
	}

	bc := NewBlockchain(nodeID)
	UTXOSet := UTXOSet{bc}
	defer bc.db.Close()

	// Create a coinbase transaction — this is the mining reward
	cbTx := NewCoinbaseTX(address, "")
	txs := []*Transaction{cbTx}

	// Mine a new block with just the coinbase transaction
	newBlock := bc.MineBlock(txs)

	// Update the UTXO set so the reward shows up in balance
	UTXOSet.Update(newBlock)

	fmt.Printf("Success! Block mined. Reward of 10 coins sent to '%s'\n", address)
}
