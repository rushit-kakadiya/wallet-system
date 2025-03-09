import React, { useState, useEffect, useContext, useCallback } from "react";
import { WalletContext } from "../context/WalletContext";
import { getTransactions, getAllTransactions } from "../services/api";
import "../assets/css/transactionhistory.css";

const TransactionHistory = () => {
  const { wallet, loading: walletLoading } = useContext(WalletContext);

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [sortField, setSortField] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");
  const [exporting, setExporting] = useState(false);

  // Create abort controller ref for cancelling requests
  const controllerRef = React.useRef(null);

  const loadTransactions = useCallback(async () => {
    if (!wallet || !wallet.id) return;

    try {
      // Cancel previous request if any
      if (controllerRef.current) {
        controllerRef.current.abort();
      }

      // Create new abort controller
      controllerRef.current = new AbortController();

      setLoading(true);
      setError(null);

      const data = await getTransactions(
        wallet.id,
        page * limit,
        limit,
        sortField,
        sortDirection,
        controllerRef.current.signal
      );

      setTransactions(data);
      setLoading(false);
    } catch (err) {
      if (err.name === "AbortError") {
        console.log("Request was aborted");
      } else {
        setError("Failed to load transactions");
        setLoading(false);
      }
    }
  }, [wallet, page, limit, sortField, sortDirection]);

  useEffect(() => {
    loadTransactions();

    // Cleanup function to abort any pending requests when component unmounts
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, [loadTransactions]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleExportCSV = async () => {
    if (!wallet || !wallet.id) return;

    try {
      setExporting(true);

      // Get all transactions for CSV export
      const allTransactions = await getAllTransactions(wallet.id);

      // Convert to CSV
      const headers = [
        "ID",
        "Type",
        "Amount",
        "Balance",
        "Description",
        "Date",
      ];
      const csvContent = [
        headers.join(","),
        ...allTransactions.map((t) =>
          [
            t.id,
            t.type,
            t.amount.toFixed(4),
            t.balance.toFixed(4),
            `"${t.description.replace(/"/g, '""')}"`,
            new Date(t.date).toLocaleString(),
          ].join(",")
        ),
      ].join("\n");

      // Create and download CSV file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${wallet.name}-transactions.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExporting(false);
    } catch (err) {
      console.error("Error exporting transactions:", err);
      setError("Failed to export transactions");
      setExporting(false);
    }
  };

  if (walletLoading) {
    return <div className="loading">Loading wallet...</div>;
  }

  if (!wallet) {
    return (
      <div className="no-wallet-message">
        <p>No wallet available. Please set up a wallet first.</p>
        <a href="/" className="nav-link">
          Go to Wallet Dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="transaction-history">
      <div className="page-header">
        <h2>Transaction History</h2>
        <div className="wallet-info">
          <span>{wallet.name}</span>
          <span className="wallet-balance">
            Balance: ₹{wallet.balance.toFixed(4)}
          </span>
        </div>
      </div>

      <div className="controls">
        <div className="pagination-controls">
          <label>
            Rows per page:
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(0);
              }}
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </label>

          <div className="page-navigation">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0 || loading}
            >
              Previous
            </button>
            <span>Page {page + 1}</span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={transactions.length < limit || loading}
            >
              Next
            </button>
          </div>
        </div>

        <button
          className="export-button"
          onClick={handleExportCSV}
          disabled={exporting}
        >
          {exporting ? "Exporting..." : "Export CSV"}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Loading transactions...</div>
      ) : transactions.length === 0 ? (
        <div className="no-transactions-message">No transactions found</div>
      ) : (
        <div className="transactions-table-container">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>ID</th>
                <th
                  className={`sortable ${sortField === "type" ? "sorted" : ""}`}
                  onClick={() => handleSort("type")}
                >
                  Type
                  {sortField === "type" && (
                    <span className="sort-indicator">
                      {sortDirection === "asc" ? " ↑" : " ↓"}
                    </span>
                  )}
                </th>
                <th
                  className={`sortable ${
                    sortField === "amount" ? "sorted" : ""
                  }`}
                  onClick={() => handleSort("amount")}
                >
                  Amount
                  {sortField === "amount" && (
                    <span className="sort-indicator">
                      {sortDirection === "asc" ? " ↑" : " ↓"}
                    </span>
                  )}
                </th>
                <th>Balance</th>
                <th>Description</th>
                <th
                  className={`sortable ${sortField === "date" ? "sorted" : ""}`}
                  onClick={() => handleSort("date")}
                >
                  Date
                  {sortField === "date" && (
                    <span className="sort-indicator">
                      {sortDirection === "asc" ? " ↑" : " ↓"}
                    </span>
                  )}
                </th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className={transaction.type === "CREDIT" ? "credit" : "debit"}
                >
                  <td>{transaction.id}</td>
                  <td>{transaction.type}</td>
                  <td
                    className={
                      transaction.type === "CREDIT"
                        ? "credit-amount"
                        : "debit-amount"
                    }
                  >
                    {transaction.type === "CREDIT" ? "+" : "-"}₹
                    {Math.abs(transaction.amount).toFixed(4)}
                  </td>
                  <td>₹{transaction.balance.toFixed(4)}</td>
                  <td>{transaction.description}</td>
                  <td>{new Date(transaction.date).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
