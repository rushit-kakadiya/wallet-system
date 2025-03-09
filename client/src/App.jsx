import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import WalletDashboard from "./components/WalletDashboard";
import TransactionHistory from "./components/TransactionHistory";
import { WalletProvider } from "./context/WalletProvider";
import "./App.css";

function App() {
  return (
    <WalletProvider>
      <Router>
        <div className="app-container">
          <nav className="navbar">
            <h1>Wallet System</h1>
            <div className="nav-links">
              <Link to="/">Wallet Dashboard</Link>
              <Link to="/transactions">Transaction History</Link>
            </div>
          </nav>

          <main className="main-content">
            <Routes>
              <Route path="/" element={<WalletDashboard />} />
              <Route path="/transactions" element={<TransactionHistory />} />
            </Routes>
          </main>

          <footer className="footer">
            <p>&copy; {new Date().getFullYear()} Wallet System</p>
          </footer>
        </div>
      </Router>
    </WalletProvider>
  );
}

export default App;
