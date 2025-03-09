const mongoose = require("mongoose");
const Wallet = require("../models/wallet");
const Transaction = require("../models/transactions");

const setupWallet = async (req, res, next) => {
  const { balance, name } = req.body;
  // Validate input
  if (!name || name.trim() === "") {
    res.status(400);
    return next(new Error("Wallet name is required"));
  }

  // Parse balance and check if it's a valid number
  const parsedBalance = parseFloat(parseFloat(balance || 0).toFixed(4));
  if (isNaN(parsedBalance)) {
    res.status(400);
    return next(new Error("Invalid balance value"));
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const wallet = new Wallet({
      balance: parsedBalance,
      name: name,
    });
    await wallet.save({ session });

    const transaction = new Transaction({
      walletId: wallet._id,
      amount: parsedBalance,
      balance: parsedBalance,
      description: "Setup",
      type: "CREDIT",
    });
    await transaction.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      id: wallet._id,
      balance: wallet.balance,
      transactionId: transaction._id,
      name: wallet.name,
      date: wallet.date,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

const processTransaction = async (req, res, next) => {
  const { walletId } = req.params;
  const { amount, description } = req.body;

  // Validate wallet ID
  if (!mongoose.Types.ObjectId.isValid(walletId))
    return res.status(400).json({ message: "Invalid wallet ID" });

  // Parse amount and check if it's a valid number
  const parsedAmount = parseFloat(parseFloat(amount).toFixed(4));
  if (isNaN(parsedAmount) || parsedAmount === 0)
    return res.status(400).json({ message: "Invalid amount value" });

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const wallet = await Wallet.findById(walletId).session(session);
    if (!wallet) {
      res.status(404);
      throw new Error("Wallet not found");
    }

    // Calculate new balance
    const newBalance = parseFloat((wallet.balance + parsedAmount).toFixed(4));

    // Check if debit operation would result in negative balance
    if (newBalance < 0) {
      res.status(400);
      throw new Error("Insufficient funds");
    }

    // Update wallet balance
    wallet.balance = newBalance;
    await wallet.save({ session });

    // Create transaction entry
    const transaction = new Transaction({
      walletId: wallet._id,
      amount: parsedAmount,
      balance: newBalance,
      description: description || (parsedAmount > 0 ? "Credit" : "Debit"),
      date: new Date(),
      type: parsedAmount > 0 ? "CREDIT" : "DEBIT",
    });

    await transaction.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      balance: newBalance,
      transactionId: transaction._id,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

const transactions = async (req, res, next) => {
  try {
    const { walletId, skip = 0, limit = 10 } = req.query;

    // Validate wallet ID
    if (!mongoose.Types.ObjectId.isValid(walletId)) {
      res.status(400);
      throw new Error("Invalid wallet ID");
    }

    // Validate skip and limit
    const parsedSkip = parseInt(skip);
    const parsedLimit = parseInt(limit);

    if (
      isNaN(parsedSkip) ||
      isNaN(parsedLimit) ||
      parsedSkip < 0 ||
      parsedLimit <= 0
    ) {
      res.status(400);
      throw new Error("Invalid pagination parameters");
    }

    // Find wallet
    const wallet = await Wallet.findById(walletId);
    if (!wallet) {
      res.status(404);
      throw new Error("Wallet not found");
    }

    // Query transactions
    const transactions = await Transaction.find({
      walletId: new mongoose.Types.ObjectId(walletId),
    })
      .sort({ date: -1 })
      .skip(parsedSkip)
      .limit(parsedLimit);

    // Format response
    const formattedTransactions = transactions.map((t) => ({
      id: t._id,
      walletId: t.walletId,
      amount: t.amount,
      balance: t.balance,
      description: t.description,
      date: t.date,
      type: t.type,
    }));

    return res.status(200).json(formattedTransactions);
  } catch (error) {
    next(error);
  }
};

const walletDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate wallet ID
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid wallet ID" });

    // Find wallet
    const wallet = await Wallet.findById(id);
    if (!wallet) {
      res.status(404);
      throw new Error("Wallet not found");
    }
    return res.status(200).json({
      id: wallet._id,
      balance: wallet.balance,
      name: wallet.name,
      date: wallet.date,
    });
  } catch (error) {
    next(error);
  }
};

const getAllTransactions = async (req, res, next) => {
  try {
    const { walletId } = req.params;

    // Validate wallet ID
    if (!mongoose.Types.ObjectId.isValid(walletId)) {
      res.status(400);
      throw new Error("Invalid wallet ID");
    }

    // Find wallet
    const wallet = await Wallet.findById(walletId);
    if (!wallet) {
      res.status(404);
      throw new Error("Wallet not found");
    }

    // Query all transactions
    const transactions = await Transaction.find({
      walletId: new mongoose.Types.ObjectId(walletId),
    }).sort({ date: -1 });

    // Format response
    const formattedTransactions = transactions.map((t) => ({
      id: t._id,
      walletId: t.walletId,
      amount: t.amount,
      balance: t.balance,
      description: t.description,
      date: t.date,
      type: t.type,
    }));

    return res.status(200).json(formattedTransactions);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  setupWallet,
  processTransaction,
  transactions,
  walletDetails,
  getAllTransactions,
};
