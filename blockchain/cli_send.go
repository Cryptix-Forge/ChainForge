package main

import (
	"fmt"
	"log"
)

func (cli *CLI) send(from, to string, amount int, nodeID string, mineNow bool) {
	// Bad addresses and insufficient funds are normal, expected outcomes that
	// the API lets users trigger directly (e.g. a typo'd address, or trying
	// to send more than the balance) — report them cleanly instead of
	// log.Panic'ing, which would leak a raw Go stack trace through the
	// Express layer and into the UI.
	if !ValidateAddress(from) {
		fmt.Println("CLI_ERROR:Sender address is not valid")
		return
	}
	if !ValidateAddress(to) {
		fmt.Println("CLI_ERROR:Recipient address is not valid")
		return
	}

	bc := NewBlockchain(nodeID)
	UTXOSet := UTXOSet{bc}
	defer bc.db.Close()

	wallets, err := NewWallets(nodeID)
	if err != nil {
		log.Panic(err)
	}
	wallet := wallets.GetWallet(from)

	tx, err := NewUTXOTransaction(&wallet, to, amount, &UTXOSet)
	if err != nil {
		fmt.Printf("CLI_ERROR:%s\n", err.Error())
		return
	}

	// Print the real transaction ID so callers (the Express backend) can log
	// the actual on-chain txid instead of generating their own — needed so
	// fork resolution can later match this transaction back to its sender.
	fmt.Printf("TXID:%x\n", tx.ID)

	if mineNow {
		// Only mine the user's transaction — no coinbase reward.
		// Coinbase rewards belong to dedicated miner nodes, not send participants.
		txs := []*Transaction{tx}

		newBlock := bc.MineBlock(txs)
		UTXOSet.Update(newBlock)
	} else if len(knownNodes) > 0 {
		// No hardcoded default peer to fall back to — if this node has no
		// known peers, there's nowhere to broadcast to, so just skip it
		// rather than index into an empty slice.
		sendTx(knownNodes[0], tx)
	}

	fmt.Println("Success!")
}
