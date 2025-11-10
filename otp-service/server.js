require("dotenv").config();
const express = require("express");
const connectToDb  = require("./database/db");
const otpRoutes = require("./routes/otpRoutes");

const app = express();
const PORT = process.env.PORT || 6000;

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}] ${req.method} ${req.originalUrl}`);
  next(); // move to next handler
});

// Database connection
connectToDb();

// Routes
app.use("/api/otp", otpRoutes);

// Start server
app.listen(PORT, () => console.log(`🚀 OTP Service running on port ${PORT}`));
