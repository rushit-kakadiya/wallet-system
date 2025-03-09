const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  walletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Wallet",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    get: (v) => parseFloat(v.toFixed(4)),
    set: (v) => parseFloat(parseFloat(v).toFixed(4)),
  },
  balance: {
    type: Number,
    required: true,
    get: (v) => parseFloat(v.toFixed(4)),
    set: (v) => parseFloat(parseFloat(v).toFixed(4)),
  },
  description: {
    type: String,
    required: true,
    default: "",
    trim: true,
  },
  date: { type: Date, default: Date.now },
  type: {
    type: String,
    enum: ["CREDIT", "DEBIT"],
    required: true,
  },
});

// Ensure amount and balance are always stored with 4 decimal places
transactionSchema.pre("save", function (next) {
  if (this.isModified("amount")) {
    this.amount = parseFloat(parseFloat(this.amount).toFixed(4));
  }
  if (this.isModified("balance")) {
    this.balance = parseFloat(parseFloat(this.balance).toFixed(4));
  }
  next();
});

const Transaction = mongoose.model("Transaction", transactionSchema);
module.exports = Transaction;
