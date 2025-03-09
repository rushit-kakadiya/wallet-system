require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");
const routes = require("./routes");
const { notFound, errorHandler } = require("./middleware");

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "https://rushit-wallet-system.netlify.app",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// API Routes
app.use("/api", routes);

// Serve React Static Files
app.use(express.static(path.join(__dirname, "./client/dist")));

// Client-Side Routing
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "./client/dist/", "index.html"));
});

// Error Handler
app.use(notFound);
app.use(errorHandler);

// Database Connection
connectDB();

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
