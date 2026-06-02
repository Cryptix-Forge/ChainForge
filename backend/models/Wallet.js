const mongoose = require("mongoose");

const WalletSchema = new mongoose.Schema({
  address: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  label: { type: String, default: "" },
});

module.exports = mongoose.model("Wallet", WalletSchema);
