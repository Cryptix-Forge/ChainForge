package main

import (
	"fmt"
	"log"
	"os"
)

func (cli *CLI) listAddresses(nodeID string) {
	wallets, err := NewWallets(nodeID)
	if err != nil {
		if os.IsNotExist(err) {
			// No wallet file yet — print nothing and exit cleanly.
			return
		}
		log.Panic(err)
	}
	addresses := wallets.GetAddresses()

	for _, address := range addresses {
		fmt.Println(address)
	}
}
