const mongoose = require("mongoose");

const connectToDb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to OTP Database");
  } catch (err) {
    console.error("❌ OTP DB Connection Error:", err.message);
    process.exit(1);
  }
};

module.exports = connectToDb;
