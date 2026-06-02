package main

import (
	"bytes"
	"encoding/gob"
	"fmt"
	"io/ioutil"
	"log"
	"os"
)

const walletFile = "wallet_%s.dat"

// walletsGobFile is the gob-safe map we actually persist.
type walletsGobFile struct {
	Wallets map[string]WalletGob
}

// Wallets stores a collection of wallets
type Wallets struct {
	Wallets map[string]*Wallet
}

// NewWallets creates Wallets and fills it from a file if it exists
func NewWallets(nodeID string) (*Wallets, error) {
	wallets := Wallets{}
	wallets.Wallets = make(map[string]*Wallet)
	err := wallets.LoadFromFile(nodeID)
	return &wallets, err
}

// CreateWallet adds a Wallet to Wallets
func (ws *Wallets) CreateWallet() string {
	wallet := NewWallet()
	address := fmt.Sprintf("%s", wallet.GetAddress())
	ws.Wallets[address] = wallet
	return address
}

// GetAddresses returns an array of addresses stored in the wallet file
func (ws *Wallets) GetAddresses() []string {
	var addresses []string
	for address := range ws.Wallets {
		addresses = append(addresses, address)
	}
	return addresses
}

// GetWallet returns a Wallet by its address
func (ws Wallets) GetWallet(address string) Wallet {
	return *ws.Wallets[address]
}

// LoadFromFile loads wallets from the file
func (ws *Wallets) LoadFromFile(nodeID string) error {
	walletFile := fmt.Sprintf(walletFile, nodeID)
	if _, err := os.Stat(walletFile); os.IsNotExist(err) {
		return err
	}

	fileContent, err := ioutil.ReadFile(walletFile)
	if err != nil {
		log.Panic(err)
	}

	var gobFile walletsGobFile
	decoder := gob.NewDecoder(bytes.NewReader(fileContent))
	err = decoder.Decode(&gobFile)
	if err != nil {
		log.Panic(err)
	}

	ws.Wallets = make(map[string]*Wallet)
	for addr, wg := range gobFile.Wallets {
		ws.Wallets[addr] = WalletFromGob(wg)
	}
	return nil
}

// SaveToFile saves wallets to a file
func (ws Wallets) SaveToFile(nodeID string) {
	walletFile := fmt.Sprintf(walletFile, nodeID)

	gobFile := walletsGobFile{Wallets: make(map[string]WalletGob)}
	for addr, w := range ws.Wallets {
		gobFile.Wallets[addr] = w.ToGob()
	}

	var content bytes.Buffer
	encoder := gob.NewEncoder(&content)
	err := encoder.Encode(gobFile)
	if err != nil {
		log.Panic(err)
	}

	err = ioutil.WriteFile(walletFile, content.Bytes(), 0644)
	if err != nil {
		log.Panic(err)
	}
}
