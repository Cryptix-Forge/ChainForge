package main

import (
	"fmt"
)

func (cli *CLI) createBlockchain(address, nodeID string) {
	if !ValidateAddress(address) {
		fmt.Println("CLI_ERROR:Address is not valid")
		return
	}
	bc := CreateBlockchain(address, nodeID)
	defer bc.db.Close()

	UTXOSet := UTXOSet{bc}
	UTXOSet.Reindex()

	fmt.Println("Done!")
}
