const mongoose = require("mongoose");

const ForkBlockSchema = new mongoose.Schema({
  hash:    { type: String, required: true },
  height:  { type: Number, required: true },
  txCount: { type: Number, default: 0 },
  isReal:  { type: Boolean, default: false },
  transactions: [{
    txid:      String,
    isCoinbase: Boolean,
    from:      String,
    to:        String,
    amount:    Number,
  }],
}, { _id: false });

const ForkSchema = new mongoose.Schema({
  forkPointHash:   { type: String, required: true },
  forkPointHeight: { type: Number, required: true },
  branchA:         [ForkBlockSchema],
  branchB:         [ForkBlockSchema],
  status:          { type: String, enum: ["pending", "resolved"], default: "pending" },
  winner:          { type: String, enum: ["A", "B", null], default: null },
  orphanedTxs: [{
    txid:   String,
    from:   String,
    to:     String,
    amount: Number,
  }],
  resolvedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model("Fork", ForkSchema);
