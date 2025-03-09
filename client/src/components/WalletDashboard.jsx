import React, { useState, useContext, useEffect } from "react";
import { WalletContext } from "../context/WalletContext";
import { setupWallet, transact } from "../services/api";
import "../assets/css/walletDashboard.css";

const WalletDashboard = () => {
  const { wallet, loading, error, updateWallet } = useContext(WalletContext);

  // Setup Wallet States
  const [name, setName] = useState("");
  const [initialBalance, setInitialBalance] = useState(0);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState(null);

  // Transaction States
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transactionType, setTransactionType] = useState("CREDIT");
  const [transactLoading, setTransactLoading] = useState(false);
  const [transactError, setTransactError] = useState(null);
  const [transactionSuccess, setTransactionSuccess] = useState(false);

  // Reset transaction success message after 3 seconds
  useEffect(() => {
    if (transactionSuccess) {
      const timer = setTimeout(() => {
        setTransactionSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [transactionSuccess]);

  const handleSetupWallet = async (e) => {
    e.preventDefault();

    try {
      setSetupLoading(true);
      setSetupError(null);

      const balance = parseFloat(initialBalance);

      if (isNaN(balance)) {
        setSetupError("Please enter a valid balance");
        setSetupLoading(false);
        return;
      }

      const result = await setupWallet({ name, balance });
      updateWallet(result.id);
      setSetupLoading(false);
    } catch (err) {
      console.error("Error setting up wallet:", err);
      setSetupError(err.response?.data?.error || "Failed to setup wallet");
      setSetupLoading(false);
    }
  };

  const handleTransaction = async (e) => {
    e.preventDefault();

    try {
      setTransactLoading(true);
      setTransactError(null);

      const parsedAmount = parseFloat(amount);

      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        setTransactError("Please enter a valid positive amount");
        setTransactLoading(false);
        return;
      }

      // Apply negative sign for DEBIT transactions
      const finalAmount =
        transactionType === "DEBIT" ? -parsedAmount : parsedAmount;

      await transact(wallet.id, {
        amount: finalAmount,
        description:
          description || (transactionType === "CREDIT" ? "Credit" : "Debit"),
      });

      // Refresh wallet data
      await updateWallet(wallet.id);

      // Reset form
      setAmount("");
      setDescription("");
      setTransactLoading(false);
      setTransactionSuccess(true);
    } catch (err) {
      console.error("Error processing transaction:", err);
      setTransactError(
        err.response?.data?.error || "Failed to process transaction"
      );
      setTransactLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading wallet...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="wallet-dashboard">
      {!wallet ? (
        <div className="setup-wallet-container">
          <h2>Setup New Wallet</h2>
          {setupError && <div className="error-message">{setupError}</div>}
          <form onSubmit={handleSetupWallet}>
            <div className="form-group">
              <label htmlFor="name">Wallet Name:</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter wallet name"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="balance">Initial Balance (optional):</label>
              <input
                type="number"
                id="balance"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                placeholder="0.0000"
                step="0.0001"
              />
            </div>
            <button type="submit" disabled={setupLoading}>
              {setupLoading ? "Setting up..." : "Setup Wallet"}
            </button>
          </form>
        </div>
      ) : (
        <div className="wallet-container">
          <div className="wallet-details">
            <h2>{wallet.name}</h2>
            <div className="balance">
              <span className="balance-label">Balance:</span>
              <span className="balance-amount">
                ₹{wallet.balance.toFixed(4)}
              </span>
            </div>
            <div className="wallet-info">
              <p>Wallet ID: {wallet.id}</p>
              <p>Created: {new Date(wallet.date).toLocaleString()}</p>
            </div>
          </div>

          <div className="transaction-form-container">
            <h3>Make a Transaction</h3>
            {transactError && (
              <div className="error-message">{transactError}</div>
            )}
            {transactionSuccess && (
              <div className="success-message">Transaction successful!</div>
            )}
            <form onSubmit={handleTransaction}>
              <div className="form-group">
                <label htmlFor="amount">Amount:</label>
                <input
                  type="number"
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0000"
                  step="0.0001"
                  min="0.0001"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="description">Description (optional):</label>
                <input
                  type="text"
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Transaction description"
                />
              </div>
              <div className="form-group">
                <label>Transaction Type:</label>
                <div className="transaction-type-toggle">
                  <button
                    type="button"
                    className={`toggle-btn ${
                      transactionType === "CREDIT" ? "active" : ""
                    }`}
                    onClick={() => setTransactionType("CREDIT")}
                  >
                    CREDIT
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn ${
                      transactionType === "DEBIT" ? "active" : ""
                    }`}
                    onClick={() => setTransactionType("DEBIT")}
                  >
                    DEBIT
                  </button>
                </div>
              </div>
              <button type="submit" disabled={transactLoading}>
                {transactLoading ? "Processing..." : "Submit Transaction"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletDashboard;
