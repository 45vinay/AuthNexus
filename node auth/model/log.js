const mongoose = require('mongoose');
const { getLogDb } = require('../database/db');

const logSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  username: { type: String, required: true },
  action: { type: String, required: true },
  message: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

let LogModel;

async function logToDB({ userId, username, action, message }) {
  try {
    const conn = getLogDb();
    if (!conn) {
      console.error("⚠️ Log DB connection not ready");
      return;
    }

    // Initialize model once per connection
    if (!LogModel) {
      LogModel = conn.model('Log', logSchema);
      console.log("✅ Log model initialized");
    }

    const log = new LogModel({ userId, username, action, message });
    await log.save();
    console.log(`🪵 Logged to DB: ${username} - ${action}`);
  } catch (err) {
    console.error("❌ Failed to log to DB:", err.message);
  }
}

module.exports = { logToDB };
