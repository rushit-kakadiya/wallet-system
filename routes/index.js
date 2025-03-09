const router = require("express").Router();
const {
  walletDetails,
  transactions,
  processTransaction,
  setupWallet,
  getAllTransactions,
} = require("../controllers");

router.post("/setup", setupWallet);
router.post("/transact/:walletId", processTransaction);
router.get("/transactions", transactions);
router.get("/wallet/:id", walletDetails);
router.get("/transactions/all/:walletId", getAllTransactions);

module.exports = router;
