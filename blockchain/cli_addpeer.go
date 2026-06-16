package main

import "fmt"

func (cli *CLI) addPeer(address, nodeID string) {
	peers := loadPeers(nodeID)
	for _, p := range peers {
		if p == address {
			fmt.Printf("Peer %s already saved\n", address)
			return
		}
	}
	peers = append(peers, address)
	savePeers(nodeID, peers)
	fmt.Printf("Peer %s added\n", address)
}
