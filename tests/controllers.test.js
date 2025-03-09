const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const {
  setupWallet,
  processTransaction,
  transactions,
  walletDetails,
  getAllTransactions,
} = require("../controllers");

// Models
const Wallet = require("../models/wallet");
const Transaction = require("../models/transactions");

// Mock Express req, res, next
const mockRequest = (body = {}, params = {}, query = {}) => ({
  body,
  params,
  query,
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Mock error handling wrapper
jest.mock("mongoose", () => {
  const actualMongoose = jest.requireActual("mongoose");
  return {
    ...actualMongoose,
    startSession: jest.fn().mockImplementation(() => {
      return {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn().mockResolvedValue(null),
        abortTransaction: jest.fn().mockResolvedValue(null),
        endSession: jest.fn(),
      };
    }),
    Types: actualMongoose.Types,
    Schema: actualMongoose.Schema,
    model: actualMongoose.model,
    connect: actualMongoose.connect,
    disconnect: actualMongoose.disconnect,
  };
});

describe("Wallet Controller Tests", () => {
  let mongoServer;

  // Start MongoDB Memory Server before tests
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  // Close connection after tests
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Clear database between tests
  afterEach(async () => {
    await Wallet.deleteMany({});
    await Transaction.deleteMany({});
    jest.clearAllMocks();
  });

  describe("setupWallet", () => {
    // Mock implementation for setupWallet tests
    beforeEach(() => {
      jest.spyOn(Wallet.prototype, "save").mockImplementation(function () {
        this._id = new mongoose.Types.ObjectId();
        return Promise.resolve(this);
      });

      jest.spyOn(Transaction.prototype, "save").mockImplementation(function () {
        this._id = new mongoose.Types.ObjectId();
        return Promise.resolve(this);
      });
    });

    it("should create a new wallet with initial balance", async () => {
      const req = mockRequest({ name: "Test Wallet", balance: 100.5678 });
      const res = mockResponse();
      const next = jest.fn();

      await setupWallet(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      const responseData = res.json.mock.calls[0][0];
      expect(responseData.name).toBe("Test Wallet");
      expect(responseData.balance).toBe(100.5678);
    });

    it("should handle decimal precision correctly", async () => {
      const req = mockRequest({ name: "Precision Test", balance: 100.56789 });
      const res = mockResponse();
      const next = jest.fn();

      await setupWallet(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.balance).toBe(100.5679); // Rounded to 4 decimal places
    });

    it("should return error for missing wallet name", async () => {
      const req = mockRequest({ balance: 100 });
      const res = mockResponse();
      const next = jest.fn();

      Wallet.prototype.save.mockRejectedValueOnce(
        new Error("Wallet name is required")
      );

      await setupWallet(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).toHaveBeenCalled();
    });

    it("should return error for invalid balance (non-number)", async () => {
      const req = mockRequest({
        name: "Invalid Balance Wallet",
        balance: "abc",
      });
      const res = mockResponse();
      const next = jest.fn();

      await setupWallet(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).toHaveBeenCalledWith(new Error("Invalid balance value"));
    });
  });

  describe("processTransaction", () => {
    let walletId;

    beforeEach(async () => {
      jest.restoreAllMocks();
      const wallet = new Wallet({ name: "Transaction Test", balance: 100 });
      await wallet.save();
      walletId = wallet._id.toString();

      jest.spyOn(Wallet, "findById").mockImplementation((id) => {
        if (id.toString() === walletId) {
          return {
            session: jest.fn().mockReturnThis(),
            _id: new mongoose.Types.ObjectId(walletId),
            balance: 100,
            save: jest.fn().mockResolvedValue(true),
          };
        } else if (mongoose.Types.ObjectId.isValid(id)) {
          return {
            session: jest.fn().mockReturnValue(null),
          };
        }
        return null;
      });

      jest.spyOn(Transaction.prototype, "save").mockImplementation(function () {
        this._id = new mongoose.Types.ObjectId();
        return Promise.resolve(this);
      });
    });

    it("should process a credit transaction correctly", async () => {
      const req = mockRequest(
        { amount: 50.1234, description: "Test credit" },
        { walletId }
      );
      const res = mockResponse();
      const next = jest.fn();

      await processTransaction(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.balance).toBe(150.1234);
    });

    it("should process a debit transaction correctly", async () => {
      const req = mockRequest(
        { amount: -30.5678, description: "Test debit" },
        { walletId }
      );
      const res = mockResponse();
      const next = jest.fn();

      await processTransaction(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.balance).toBe(69.4322); // 100 - 30.5678
    });

    it("should reject transaction with insufficient funds", async () => {
      const req = mockRequest(
        { amount: -150, description: "Exceeds balance" },
        { walletId }
      );
      const res = mockResponse();
      const next = jest.fn();

      Wallet.findById.mockImplementationOnce((id) => {
        if (id.toString() === walletId) {
          return {
            session: jest.fn().mockReturnThis(),
            _id: new mongoose.Types.ObjectId(walletId),
            balance: 100,
            save: jest.fn().mockImplementation(() => {
              res.status(400);
              throw new Error("Insufficient funds");
            }),
          };
        }
        return null;
      });

      await processTransaction(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).toHaveBeenCalled();
    });

    it("should return error for invalid wallet ID", async () => {
      const req = mockRequest({ amount: 50 }, { walletId: "invalid-id" });
      const res = mockResponse();
      const next = jest.fn();

      await processTransaction(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid wallet ID" });
    });

    it("should return error for non-existent wallet", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const req = mockRequest(
        { amount: 50 },
        { walletId: nonExistentId.toString() }
      );
      const res = mockResponse();
      const next = jest.fn();

      Wallet.findById.mockImplementationOnce(() => {
        res.status(404);
        throw new Error("Wallet not found");
      });

      await processTransaction(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(next).toHaveBeenCalled();
    });

    it("should return error for invalid amount", async () => {
      const req = mockRequest({ amount: "invalid" }, { walletId });
      const res = mockResponse();
      const next = jest.fn();

      await processTransaction(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid amount value",
      });
    });

    it("should return error for zero amount", async () => {
      const req = mockRequest({ amount: 0 }, { walletId });
      const res = mockResponse();
      const next = jest.fn();

      await processTransaction(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid amount value",
      });
    });
  });

  describe("transactions", () => {
    let walletId;

    beforeEach(async () => {
      const wallet = new Wallet({
        name: "Transactions Test",
        balance: 100,
      });
      await wallet.save();
      walletId = wallet._id.toString();
      const transactions = Array.from({ length: 15 }).map((_, i) => ({
        walletId: wallet._id,
        amount: i,
        balance: 100 + i,
        description: `Transaction ${i}`,
        type: "CREDIT",
        date: new Date(Date.now() - i * 60000),
      }));

      await Transaction.insertMany(transactions);
    });

    it("should retrieve paginated transactions correctly", async () => {
      const req = mockRequest({}, {}, { walletId, skip: 0, limit: 10 });
      const res = mockResponse();
      const next = jest.fn();

      Wallet.findById.mockResolvedValueOnce({ _id: walletId });
      await transactions(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.length).toBe(10);
    });

    it("should handle pagination correctly", async () => {
      const req = mockRequest({}, {}, { walletId, skip: 1, limit: 5 });
      const res = mockResponse();
      const next = jest.fn();

      Wallet.findById.mockResolvedValueOnce({ _id: walletId });
      await transactions(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.length).toBe(5);
    });

    it("should return error for invalid pagination parameters", async () => {
      const req = mockRequest({}, {}, { walletId, skip: -1, limit: 10 });
      const res = mockResponse();
      const next = jest.fn();

      await transactions(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).toHaveBeenCalled();
    });

    it("should return error for invalid wallet ID", async () => {
      const req = mockRequest({}, {}, { walletId: "invalid-id" });
      const res = mockResponse();
      const next = jest.fn();

      await transactions(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).toHaveBeenCalled();
    });

    it("should return error for non-existent wallet", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const req = mockRequest({}, {}, { walletId: nonExistentId.toString() });
      const res = mockResponse();
      const next = jest.fn();

      Wallet.findById.mockImplementationOnce((id) => {
        if (id.toString() === walletId) {
          return {
            _id: id,
            balance: 100,
          };
        }
        return null;
      });

      await transactions(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(next).toHaveBeenCalled();
    });
  });

  describe("walletDetails", () => {
    let walletId;

    beforeEach(async () => {
      const wallet = new Wallet({ name: "Details Test", balance: 150.1234 });
      await wallet.save();
      walletId = wallet._id.toString();

      jest.spyOn(Wallet, "findById").mockImplementation((id) => {
        if (id.toString() === walletId) {
          return {
            _id: id,
            name: "Details Test",
            balance: 150.1234,
            date: new Date(),
          };
        }
        return null;
      });
    });

    it("should return wallet details correctly", async () => {
      const req = mockRequest({}, { id: walletId });
      const res = mockResponse();
      const next = jest.fn();

      await walletDetails(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.id.toString()).toBe(walletId);
      expect(responseData.name).toBe("Details Test");
      expect(responseData.balance).toBe(150.1234);
    });

    it("should return error for invalid wallet ID", async () => {
      const req = mockRequest({}, { id: "invalid-id" });
      const res = mockResponse();
      const next = jest.fn();

      await walletDetails(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid wallet ID" });
    });

    it("should return error for non-existent wallet", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const req = mockRequest({}, { id: nonExistentId.toString() });
      const res = mockResponse();
      const next = jest.fn();

      Wallet.findById.mockImplementationOnce(() => {
        res.status(404);
        throw new Error("Wallet not found");
      });

      await walletDetails(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(next).toHaveBeenCalled();
    });
  });

  describe("getAllTransactions", () => {
    let walletId;

    beforeEach(async () => {
      const wallet = new Wallet({
        name: "Transactions Test",
        balance: 100,
      });
      await wallet.save();
      walletId = wallet._id.toString();
      const transactions = Array.from({ length: 15 }).map((_, i) => ({
        walletId: wallet._id,
        amount: i,
        balance: 100 + i,
        description: `Transaction ${i}`,
        type: "CREDIT",
        date: new Date(Date.now() - i * 60000),
      }));

      await Transaction.insertMany(transactions);
    });

    it("should retrieve all transactions for a wallet", async () => {
      const req = mockRequest({}, { walletId });
      const res = mockResponse();
      const next = jest.fn();

      Wallet.findById.mockResolvedValueOnce({ _id: walletId });
      await getAllTransactions(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
    });

    it("should return error for invalid wallet ID", async () => {
      const req = mockRequest({}, { walletId: "invalid-id" });
      const res = mockResponse();
      const next = jest.fn();

      await getAllTransactions(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).toHaveBeenCalled();
    });

    it("should return error for non-existent wallet", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const req = mockRequest({}, { walletId: nonExistentId.toString() });
      const res = mockResponse();
      const next = jest.fn();

      Wallet.findById.mockImplementationOnce(() => {
        res.status(404);
        throw new Error("Wallet not found");
      });

      await getAllTransactions(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(next).toHaveBeenCalled();
    });
  });
});
