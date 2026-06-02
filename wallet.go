package main

import (
	"bytes"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"log"
	"math/big"

	"golang.org/x/crypto/ripemd160"
)

const version = byte(0x00)
const addressChecksumLen = 4

// Wallet stores private and public keys
type Wallet struct {
	PrivateKey ecdsa.PrivateKey
	PublicKey  []byte
}

// WalletGob is a gob-safe serialization struct — stores raw key bytes only,
// avoiding the elliptic.Curve interface which broke in Go 1.20+.
type WalletGob struct {
	PrivKeyD  []byte
	PrivKeyX  []byte
	PrivKeyY  []byte
	PublicKey []byte
}

// ToGob converts a Wallet to its serializable form.
func (w *Wallet) ToGob() WalletGob {
	return WalletGob{
		PrivKeyD:  w.PrivateKey.D.Bytes(),
		PrivKeyX:  w.PrivateKey.PublicKey.X.Bytes(),
		PrivKeyY:  w.PrivateKey.PublicKey.Y.Bytes(),
		PublicKey: w.PublicKey,
	}
}

// WalletFromGob reconstructs a Wallet from its serializable form.
func WalletFromGob(wg WalletGob) *Wallet {
	curve := elliptic.P256()
	priv := ecdsa.PrivateKey{}
	priv.PublicKey.Curve = curve
	priv.PublicKey.X = new(big.Int).SetBytes(wg.PrivKeyX)
	priv.PublicKey.Y = new(big.Int).SetBytes(wg.PrivKeyY)
	priv.D = new(big.Int).SetBytes(wg.PrivKeyD)
	return &Wallet{PrivateKey: priv, PublicKey: wg.PublicKey}
}

// NewWallet creates and returns a Wallet
func NewWallet() *Wallet {
	private, public := newKeyPair()
	return &Wallet{private, public}
}

// GetAddress returns wallet address
func (w Wallet) GetAddress() []byte {
	pubKeyHash := HashPubKey(w.PublicKey)
	versionedPayload := append([]byte{version}, pubKeyHash...)
	checksum := checksum(versionedPayload)
	fullPayload := append(versionedPayload, checksum...)
	return Base58Encode(fullPayload)
}

// HashPubKey hashes public key
func HashPubKey(pubKey []byte) []byte {
	publicSHA256 := sha256.Sum256(pubKey)
	RIPEMD160Hasher := ripemd160.New()
	_, err := RIPEMD160Hasher.Write(publicSHA256[:])
	if err != nil {
		log.Panic(err)
	}
	return RIPEMD160Hasher.Sum(nil)
}

// ValidateAddress check if address if valid
func ValidateAddress(address string) bool {
	pubKeyHash := Base58Decode([]byte(address))
	actualChecksum := pubKeyHash[len(pubKeyHash)-addressChecksumLen:]
	version := pubKeyHash[0]
	pubKeyHash = pubKeyHash[1 : len(pubKeyHash)-addressChecksumLen]
	targetChecksum := checksum(append([]byte{version}, pubKeyHash...))
	return bytes.Compare(actualChecksum, targetChecksum) == 0
}

func checksum(payload []byte) []byte {
	firstSHA := sha256.Sum256(payload)
	secondSHA := sha256.Sum256(firstSHA[:])
	return secondSHA[:addressChecksumLen]
}

func newKeyPair() (ecdsa.PrivateKey, []byte) {
	curve := elliptic.P256()
	private, err := ecdsa.GenerateKey(curve, rand.Reader)
	if err != nil {
		log.Panic(err)
	}
	pubKey := append(private.PublicKey.X.Bytes(), private.PublicKey.Y.Bytes()...)
	return *private, pubKey
}
