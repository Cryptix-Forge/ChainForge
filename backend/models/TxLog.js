const mongoose = require("mongoose");

const TxLogSchema = new mongoose.Schema({
  txid:      { type: String, required: true },
  from:      { type: String, required: true },
  to:        { type: String, required: true },
  amount:    { type: Number, required: true },
  mined:     { type: Boolean, default: false },
  status:    { type: String, enum: ["pending", "success", "failed"], default: "pending" },
  raw:       { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

TxLogSchema.index({ from: 1 });
TxLogSchema.index({ to: 1 });

module.exports = mongoose.model("TxLog", TxLogSchema);
