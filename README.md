# High-Level Wallet System - https://highlevel-wallet-system-rzl9.onrender.com

This is a full-stack application designed for managing digital wallets, where users can create wallets, process transactions (credit and debit), and view transaction history. The application is built using Node.js, Express, and MongoDB, and it supports operations like wallet setup, transaction processing, and transaction retrieval with pagination.

## Features

- **Create Wallet**: Set up a new wallet with an initial balance.
- **Process Transactions**: Credit or debit transactions on a wallet.
- **View Wallet Details**: Retrieve wallet information such as name, balance, and creation date.
- **View Transactions**: View a paginated list of transactions for a wallet, with options to sort by date, amount, and type.
- **Get All Transactions**: Retrieve all transactions for a wallet, useful for generating reports or CSV exports.

## Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: MongoDB (using Mongoose ORM)
- **Testing**: Jest, Supertest
- **Client**: React.js

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/rushit-kakadiya/highlevel-wallet-system.git
cd highlevel-wallet-system
```

### 2. Install Dependencies

Run the following commands to install both backend and client dependencies:

```bash
npm install        # Install backend dependencies
cd client && npm install   # Install client-side dependencies
```

### 3. Environment Variables

Create a `.env` file in the root of the project and define the following environment variables:

```env
PORT=3001
CLIENT_URL=http://localhost:3000  # or your frontend's URL
MONGODB_URI=mongodb://localhost:27017/wallet-system
```

### 4. Running the Application

You can run both the server and the client in development mode with:

```bash
npm run dev-full   # Runs both the backend server and client simultaneously
```

Or you can run them individually:

```bash
npm run dev        # Runs the backend server in watch mode
npm run client     # Runs the frontend client in development mode
```

### 5. Running Tests

To run tests for the backend (Jest):

```bash
npm test
```

To run tests with auto-reload:

```bash
npm run test:watch
```

## API Endpoints

### Wallet Setup

- **POST** `/api/setup`
  - Creates a new wallet.
  - Request Body: `{ "name": "Wallet Name", "balance": 100.50 }`
  - Response: `{ "id": "walletId", "balance": 100.50, "transactionId": "transactionId" }`

### Process Transaction

- **POST** `/api/transact/:walletId`
  - Processes a transaction on a wallet (credit or debit).
  - Request Body: `{ "amount": 50.25, "description": "Transaction Description" }`
  - Response: `{ "balance": 150.75, "transactionId": "transactionId" }`

### View Transactions

- **GET** `/api/transactions`
  - Fetches a paginated list of transactions for a wallet.
  - Query Parameters: `walletId`, `skip`, `limit`
  - Response: A list of transactions.

### Wallet Details

- **GET** `/api/wallet/:id`
  - Retrieves details of a wallet by its ID.
  - Response: `{ "id": "walletId", "balance": 100.50, "name": "Wallet Name" }`

### Get All Transactions

- **GET** `/api/transactions/all/:walletId`
  - Retrieves all transactions for a specific wallet.
  - Response: A list of all transactions.

## Testing

The backend tests are written using Jest and Supertest. The tests focus on:

- Creating wallets and ensuring proper validation.
- Processing credit and debit transactions with proper balance checks.
- Pagination of transaction listings.
- Error handling for invalid wallet IDs, missing fields, and invalid transactions.

## License

This project is licensed under the ISC License.

## Acknowledgements

- **Mongoose**: ORM used for interacting with MongoDB.
- **Express**: Framework used for building the API.
- **Jest & Supertest**: Tools used for testing the backend.
