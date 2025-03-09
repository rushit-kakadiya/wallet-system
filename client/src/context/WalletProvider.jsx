import React, { useState, useEffect } from "react";
import { WalletContext } from "./WalletContext";
import { getWalletDetails } from "../services/api";

export const WalletProvider = ({ children }) => {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadWallet = async () => {
      try {
        const storedWalletId = localStorage.getItem("walletId");
        if (storedWalletId) {
          setLoading(true);
          const data = await getWalletDetails(storedWalletId);
          setWallet(data);
          setLoading(false);
        } else {
          setWallet(null);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load wallet:", err);
        setError("Failed to load wallet. Please try again.");
        setLoading(false);
      }
    };

    loadWallet();
  }, []);

  const updateWallet = async (walletId) => {
    try {
      setLoading(true);
      const data = await getWalletDetails(walletId);
      setWallet(data);
      localStorage.setItem("walletId", walletId);
      setLoading(false);
    } catch (err) {
      console.error("Failed to update wallet:", err);
      setError("Failed to update wallet. Please try again.");
      setLoading(false);
    }
  };

  const clearWallet = () => {
    setWallet(null);
    localStorage.removeItem("walletId");
  };

  return (
    <WalletContext.Provider
      value={{
        wallet,
        loading,
        error,
        updateWallet,
        clearWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
