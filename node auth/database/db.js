const mongoose = require('mongoose');

let userConnection;
let logConnection;

const connectToDatabases = async () => {
  try {
    // 1️⃣ Connect to Users DB
    userConnection = await mongoose.createConnection(process.env.MONGO_URI_USERS, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to Users DB");

    // 2️⃣ Connect to Logs DB
    logConnection = await mongoose.createConnection(process.env.MONGO_URI_LOGS, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to Logs DB");

  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
};

// Export getters
const getUserDb = () => userConnection;
const getLogDb = () => logConnection;

module.exports = { connectToDatabases, getUserDb, getLogDb };
