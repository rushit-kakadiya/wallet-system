const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema({
  name: { type: String, required: true },
  balance: {
    type: Number,
    required: true,
    default: 0,
    get: (v) => parseFloat(v.toFixed(4)),
    set: (v) => parseFloat(parseFloat(v).toFixed(4)),
  },
  date: { type: Date, default: Date.now },
});

// Ensure balance is always stored with 4 decimal places
walletSchema.pre("save", function (next) {
  if (this.isModified("balance")) {
    this.balance = parseFloat(parseFloat(this.balance).toFixed(4));
  }
  next();
});

const Wallet = mongoose.model("Wallet", walletSchema);
module.exports = Wallet;
