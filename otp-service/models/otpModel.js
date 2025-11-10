const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otpHash: { type: String, required: true },
  purpose: { type: String, required: true ,enum: ['register', 'forgotpassword','forgotusername'],},
  verificationToken: { type: String, required: false },
  expiresAt: { type: Date, required: true },
  verified: { type: Boolean, default: false }
}, { timestamps: true });

const Otp = mongoose.model("Otp", otpSchema);
module.exports = Otp;
