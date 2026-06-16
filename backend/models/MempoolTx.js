const mongoose = require("mongoose");

const MempoolTxSchema = new mongoose.Schema(
  {
    from:        { type: String, required: true },
    to:          { type: String, required: true },
    amount:      { type: Number, required: true },
    status:      { type: String, enum: ["pending", "confirmed", "rejected"], default: "pending" },
    txid:        { type: String },
    confirmedAt: { type: Date },
    note:        { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MempoolTx", MempoolTxSchema);
