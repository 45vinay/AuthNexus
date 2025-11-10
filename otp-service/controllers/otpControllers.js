// controllers/otp-controller.js
const Otp = require('../models/otpModel'); // Assuming this is correct
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require("bcryptjs");

// ✅ Configure Gmail SMTP (Should be in a separate config/utility file for best practice)
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify transporter
transporter.verify((error, success) => {
  if (error) console.error("❌ Email transporter error:", error);
  else console.log("✅ Email transporter ready");
});


// 📩 Send OTP
exports.sendOtp = async (req, res) => {
  try {
    const { email, purpose } = req.body;
    if (!email || !purpose) {
      return res.status(400).json({ success: false, message: "Email and purpose are required" });
    }

    // 1️⃣ Generate and hash OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // 2️⃣ Use findOneAndUpdate to replace any existing OTP for this email/purpose
    // This handles the case where a user requests a new OTP before the old one expires.
const otpDoc = await Otp.findOneAndUpdate(
  { email, purpose },
  { 
    $set: { 
      otpHash, 
      expiresAt 
    } 
  },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);

console.log("📦 OTP stored/updated in DB:", otpDoc);

    // 3️⃣ Send OTP email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Your OTP for ${purpose}`,
      text: `Your OTP is ${otp}. It will expire in 5 minutes.`,
    });

    console.log(`✅ OTP sent for ${purpose} to ${email}`);

    // 4️⃣ Simplified response (removed misleading verificationLink)
    return res.status(200).json({
      success: true,
      message: "OTP sent successfully to your email. Check your inbox."
    });

  } catch (err) {
    console.error("❌ Error sending OTP:", err);
    return res.status(500).json({
      success: false,
      message: "Error sending OTP",
      error: err.message,
    });
  }
};

// 🔍 Verify OTP
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp, purpose } = req.body; // 🔴 CRITICAL FIX: Added 'purpose'
    if (!email || !otp || !purpose) // 🔴 CRITICAL FIX: Required 'purpose'
      return res.status(400).json({ success: false, message: 'Email, OTP, and purpose required' });

    // 1️⃣ Find the OTP record for the specific email AND purpose
    // 🔴 CRITICAL FIX: Query by purpose
    const otpRecord = await Otp.findOne({ email, purpose });
    
    if (!otpRecord)
      return res.status(400).json({ success: false, message: 'Invalid, expired, or incorrect purpose for OTP' });

    // 2️⃣ Check expiration
    if (otpRecord.expiresAt < new Date()) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ success: false, message: 'OTP expired' });
    }

    // 3️⃣ Compare plain OTP with hashed OTP
    const isMatch = await bcrypt.compare(otp, otpRecord.otpHash);
    if (!isMatch)
      return res.status(400).json({ success: false, message: 'Incorrect OTP' });

    // 4️⃣ Delete OTP after successful verification
    await Otp.deleteOne({ _id: otpRecord._id });

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully'
    });

  } catch (err) {
    console.error('❌ Error verifying OTP:', err);
    return res.status(500).json({
      success: false,
      message: 'Verification failed',
      error: err.message
    });
  }
};