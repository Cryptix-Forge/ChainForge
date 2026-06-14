package main

import "bytes"

// TXInput represents a transaction input
type TXInput struct {
	Txid      []byte
	Vout      int
	Signature []byte
	PubKey    []byte
}

// UsesKey checks whether the address initiated the transaction
func (in *TXInput) UsesKey(pubKeyHash []byte) bool {
	lockingHash := HashPubKey(in.PubKey)

	// BUG FIX: was bytes.Compare(...) == 0 — bytes.Equal is the idiomatic and
	// correct way to test byte-slice equality.
	return bytes.Equal(lockingHash, pubKeyHash)
}
