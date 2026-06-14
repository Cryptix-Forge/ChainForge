const mongoose = require("mongoose");

const TxInputSchema = new mongoose.Schema({
  txid: String,
  vout: Number,
  signature: String,
  pubKey: String,
}, { _id: false });

const TxOutputSchema = new mongoose.Schema({
  value: Number,
  script: String,
}, { _id: false });

const TransactionSchema = new mongoose.Schema({
  txid: { type: String, required: true },
  inputs: [TxInputSchema],
  outputs: [TxOutputSchema],
  isCoinbase: { type: Boolean, default: false },
}, { _id: false });

const BlockSchema = new mongoose.Schema({
  hash:         { type: String, required: true, unique: true },
  height:       { type: Number, required: true },
  prevHash:     { type: String, default: "" },
  powValid:     { type: Boolean, default: true },
  nonce:        { type: Number, default: 0 },
  transactions: [TransactionSchema],
  txCount:      { type: Number, default: 0 },
  timestamp:    { type: Date, default: Date.now },
});

BlockSchema.index({ height: 1 });

module.exports = mongoose.model("Block", BlockSchema);
