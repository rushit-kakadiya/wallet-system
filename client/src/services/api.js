import axios from "axios";

// Create an axios instance with default configuration
const api = axios.create({
  baseURL: "https://wallet-system-rzl9.onrender.com/api",
  headers: { "Content-Type": "application/json" },
});

/**
 * Handle errors from Axios responses
 * @param {Error} error - Axios error object
 * @returns {string} - Error message
 */
const handleError = (error) => {
  if (axios.isAxiosError(error)) {
    // Check if error is related to a network or response
    if (error.response) {
      // The server responded with a status code that falls out of the range of 2xx
      return `API Error: ${error.response.status} - ${
        error.response.statusText
      }. ${error.response.data?.message || error.message}`;
    } else if (error.request) {
      // The request was made but no response was received
      return `Network Error: No response received. ${error.message}`;
    } else {
      // Something happened in setting up the request
      return `Request Setup Error: ${error.message}`;
    }
  } else {
    // Non-Axios error (e.g., general JavaScript error)
    return `General Error: ${error.message}`;
  }
};

/**
 * Setup a new wallet
 * @param {Object} walletData - Wallet data (name, balance)
 * @returns {Promise} - Promise resolving to the created wallet
 */
export const setupWallet = async (walletData) => {
  try {
    const response = await api.post("/setup", walletData);
    return response.data;
  } catch (error) {
    const errorMessage = handleError(error);
    console.error("API Error - setupWallet:", errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Process a transaction on a wallet
 * @param {string} walletId - Wallet ID
 * @param {Object} transactionData - Transaction data (amount, description)
 * @returns {Promise} - Promise resolving to the transaction result
 */
export const transact = async (walletId, transactionData) => {
  try {
    const response = await api.post(`/transact/${walletId}`, transactionData);
    return response.data;
  } catch (error) {
    const errorMessage = handleError(error);
    console.error("API Error - transact:", errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Get transactions for a wallet with pagination, sorting
 * @param {string} walletId - Wallet ID
 * @param {number} skip - Number of transactions to skip
 * @param {number} limit - Maximum number of transactions to fetch
 * @param {string} sortField - Field to sort by
 * @param {string} sortDirection - Sort direction (asc or desc)
 * @param {AbortSignal} signal - AbortController signal for cancellation
 * @returns {Promise} - Promise resolving to transactions array
 */
export const getTransactions = async (
  walletId,
  skip = 0,
  limit = 10,
  sortField = "date",
  sortDirection = "desc",
  signal
) => {
  try {
    const response = await api.get(`/transactions`, {
      params: { walletId, skip, limit },
      signal, // Pass the AbortController signal for request cancellation
    });

    let data = response.data;

    if (sortField !== "date" || sortDirection !== "desc") {
      data = [...data].sort((a, b) => {
        let comparison = 0;

        if (sortField === "date") {
          comparison = new Date(a.date) - new Date(b.date);
        } else if (sortField === "amount") {
          comparison = a.amount - b.amount;
        } else if (sortField === "type") {
          comparison = a.type.localeCompare(b.type);
        }

        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return data;
  } catch (error) {
    const errorMessage = handleError(error);
    console.error("API Error - getTransactions:", errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Get all transactions for a wallet (for CSV export)
 * @param {string} walletId - Wallet ID
 * @returns {Promise} - Promise resolving to all transactions
 */
export const getAllTransactions = async (walletId) => {
  try {
    const response = await api.get(`/transactions/all/${walletId}`);
    return response.data;
  } catch (error) {
    const errorMessage = handleError(error);
    console.error("API Error - getAllTransactions:", errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Get wallet details by ID
 * @param {string} walletId - Wallet ID
 * @returns {Promise} - Promise resolving to wallet details
 */
export const getWalletDetails = async (walletId) => {
  try {
    const response = await api.get(`/wallet/${walletId}`);
    return response.data;
  } catch (error) {
    const errorMessage = handleError(error);
    console.error("API Error - getWalletDetails:", errorMessage);
    throw new Error(errorMessage);
  }
};
