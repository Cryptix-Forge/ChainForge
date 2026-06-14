package main

import (
	"fmt"
	"log"
	"os"
)

func (cli *CLI) deleteWallet(address, nodeID string) {
	wallets, err := NewWallets(nodeID)
	if err != nil {
		if os.IsNotExist(err) {
			fmt.Println("No wallet file found.")
			return
		}
		log.Panic(err)
	}

	if _, ok := wallets.Wallets[address]; !ok {
		fmt.Printf("Address not found: %s\n", address)
		return
	}

	delete(wallets.Wallets, address)
	wallets.SaveToFile(nodeID)
	fmt.Printf("Deleted: %s\n", address)
}
