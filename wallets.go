package main

import (
	"bytes"
	"crypto/x509"
	"encoding/gob"
	"fmt"
	"io/ioutil"
	"log"
	"os"
)

const walletFile = "wallet_%s.dat"

// Wallets stores a collection of wallets
type Wallets struct {
	Wallets map[string]*Wallet
}

// serializedWallet is a gob-safe, Go 1.20+ compatible wallet format.
// We avoid encoding ecdsa.PrivateKey directly (breaks on Go 1.20+ due to
// unexported elliptic.nistCurve fields). Instead we use x509 DER encoding.
type serializedWallet struct {
	PrivKeyBytes []byte // x509.MarshalECPrivateKey output
	PublicKey    []byte // raw X||Y bytes
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

	var serialized map[string]*serializedWallet
	decoder := gob.NewDecoder(bytes.NewReader(fileContent))
	err = decoder.Decode(&serialized)
	if err != nil {
		log.Panic(err)
	}

	ws.Wallets = make(map[string]*Wallet)
	for addr, sw := range serialized {
		privKey, err := x509.ParseECPrivateKey(sw.PrivKeyBytes)
		if err != nil {
			log.Panic(err)
		}
		ws.Wallets[addr] = &Wallet{
			PrivateKey: *privKey,
			PublicKey:  sw.PublicKey,
		}
	}

	return nil
}

// SaveToFile saves wallets to a file using x509 DER encoding (Go 1.20+ safe)
func (ws Wallets) SaveToFile(nodeID string) {
	var content bytes.Buffer
	walletFile := fmt.Sprintf(walletFile, nodeID)

	serialized := make(map[string]*serializedWallet)
	for addr, w := range ws.Wallets {
		privBytes, err := x509.MarshalECPrivateKey(&w.PrivateKey)
		if err != nil {
			log.Panic(err)
		}
		serialized[addr] = &serializedWallet{
			PrivKeyBytes: privBytes,
			PublicKey:    w.PublicKey,
		}
	}

	encoder := gob.NewEncoder(&content)
	err := encoder.Encode(serialized)
	if err != nil {
		log.Panic(err)
	}

	err = ioutil.WriteFile(walletFile, content.Bytes(), 0644)
	if err != nil {
		log.Panic(err)
	}
}
