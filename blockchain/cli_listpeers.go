package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"
)

func peersFilePath(nodeID string) string {
	return fmt.Sprintf("peers_%s.dat", nodeID)
}

func loadPeers(nodeID string) []string {
	f, err := os.Open(peersFilePath(nodeID))
	if err != nil {
		return []string{}
	}
	defer f.Close()

	var peers []string
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		if line := strings.TrimSpace(scanner.Text()); line != "" {
			peers = append(peers, line)
		}
	}
	return peers
}

func savePeers(nodeID string, peers []string) {
	f, err := os.Create(peersFilePath(nodeID))
	if err != nil {
		fmt.Printf("Could not save peers: %v\n", err)
		return
	}
	defer f.Close()
	for _, p := range peers {
		fmt.Fprintln(f, p)
	}
}

func (cli *CLI) listPeers(nodeID string) {
	peers := loadPeers(nodeID)
	if len(peers) == 0 {
		fmt.Println("No peers saved")
		return
	}
	for _, p := range peers {
		fmt.Println(p)
	}
}
