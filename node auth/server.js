require("dotenv").config();
const express = require("express");
const { connectToDatabases  } = require("./database/db");
const authRoutes = require("./router/router"); // Make sure the filename is correct (router/router.js)

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware — to parse incoming JSON data
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}] ${req.method} ${req.originalUrl}`);
  next(); // move to next handler
});

(async () => {
  try {
    await connectToDatabases();
    console.log("✅ Both databases connected successfully");

    // Register routes only after DBs are ready
    app.use("/api/user", authRoutes);

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to connect databases:", err.message);
    process.exit(1);
  }
})();
// Routes
app.use("/api/user", authRoutes);



