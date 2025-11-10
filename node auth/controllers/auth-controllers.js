// controllers/auth-controllers.js
const axios = require("axios");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getUserDb } = require("../database/db");
const createUserModel = require("../model/user");
const GetUserLogger = require("../logger"); 
const { logToDB } = require("../model/log"); 
const nodemailer = require('nodemailer');

const OTP_SERVICE_URL = process.env.OTP_SERVICE_URL || "http://localhost:6000/api/otp";

// ---------------- INITIATE const { getUserDb } = require('../database/db');
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

// REGISTER USER (Step 1: Send OTP)
const registerUser = async (req, res) => {
  const { username, email, password } = req.body;
  const logger = GetUserLogger(username || 'unknown');

  try {
    const conn = getUserDb();
    const User = createUserModel(conn);

    if (!username || !email || !password) {
      logger.warn('Registration failed: Missing fields');
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      logger.warn(`Registration failed: username/email already exists`);
      return res.status(400).json({ success: false, message: 'Username or Email already exists' });
    }

    // 🔹 Call OTP microservice
    const otpResponse = await axios.post(`${OTP_SERVICE_URL}/send`, { email ,purpose: "registration"});
    await logToDB({ username, action: 'OTP_SENT', message: `OTP sent for registration`, req });

    return res.status(200).json({
      success: true,
      message: 'OTP sent to your email. Please verify to complete registration.',
      verifyUrl: `http://localhost:5000/api/user/verify-register`
    });
  } catch (err) {
    logger.error('Error in registerUser: ' + err.message);
    return res.status(500).json({ success: false, message: 'Error sending OTP', error: err.message });
  }
};

// VERIFY REGISTER OTP (Step 2)
const verifyRegisterOtp = async (req, res) => {
  const { username, email, password, otp } = req.body;
  const logger = GetUserLogger(username || 'unknown');
  const conn = getUserDb();
  const User = createUserModel(conn);

  try {
    // 🔹 Verify OTP with microservice
    const verifyResponse = await axios.post(`${OTP_SERVICE_URL}/verify`, { email, otp,  purpose: "registration"});
    if (!verifyResponse.data.success) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    await logToDB({ username, action: 'REGISTER_SUCCESS', message: 'User registered successfully', req });
    logger.info('User registered successfully');

    // 3️⃣ Send register successful message
   await transporter.sendMail({
     from: process.env.EMAIL_USER,
      to: email,
      subject: `Registration Successful`,
      text: `Registration Successful!\n Your username is: ${username}. \n You can now log in using your chosen password.`,
   });

    return res.status(201).json({ success: true, message: 'User registered successfully' });
  } catch (err) {
    logger.error('Error verifying OTP: ' + err.message);
    return res.status(500).json({ success: false, message: 'OTP verification failed', error: err.message });
  }
};

// LOGIN
const loginUser = async (req, res) => {
  const { username, password } = req.body;
  const logger = GetUserLogger(username || 'unknown');
  const conn = getUserDb();
  const User = createUserModel(conn);

  try {
    const user = await User.findOne({ username });
    if (!user) {
      await logToDB({ username, action: 'LOGIN_FAILED', message: 'User not found', req });
      logger.info("login failed \nuser not found ,please register ")
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await logToDB({ username, action: 'LOGIN_FAILED', message: 'Invalid password', req });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id, username }, process.env.JWT_SECRET, { expiresIn: '1h' });
    await logToDB({ username, action: 'LOGIN_SUCCESS', message: 'User logged in successfully', req });
    logger.info('Login successful');

    return res.status(200).json({ success: true, message: 'Login successful', token });
  } catch (err) {
    logger.error('Login error: ' + err.message);
    return res.status(500).json({ success: false, message: 'Login failed', error: err.message });
  }
};

// FORGOT USERNAME
const forgotUsername = async (req, res) => {
  const { email } = req.body;


  try {
      const conn = getUserDb();
      const User = createUserModel(conn);
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'No account with this email' });

    await axios.post(`${OTP_SERVICE_URL}/send`, { email ,purpose : "forgotusername"});
    await logToDB({ username: 'unknown', action: 'OTP_SENT', message: 'OTP sent for forgot username', req });

    return res.status(200).json({ success: true, message: 'OTP sent to your email to verify identity' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error sending OTP', error: err.message });
  }
};


// RESET usename
  const resetUserName = async (req, res) => {
  const { email, newUserName, otp } = req.body;
  const conn = getUserDb();
  const User = createUserModel(conn); 
  try {
      // Basic validation
      if (!email || !newUserName || !otp) {
        return res.status(400).json({ success: false, message: 'Email, new username, and OTP are required' });
      }


      
      // 1. Verify OTP using the "forgotUsername" purpose
    const verifyResponse = await axios.post(`${OTP_SERVICE_URL}/verify`, { email, otp ,purpose :"forgotusername" });
    if (!verifyResponse.data.success)
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });

      // 2. Update username
    await User.updateOne({ email }, { username: newUserName });
      
      // 3. Logging
    await logToDB({ username: newUserName, action: 'USERNAME_RESET', message: `Username reset to ${newUserName} successfully`, req });
      
      // 4. Send Confirmation Email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Username Successfully Updated`,
      text: `Your username has been successfully updated to: ${newUserName}. \n You can now log in with your new username.`,
    });

      // 5. Response
      return res.status(200).json({ success: true, message: 'Username reset successful' });
  } catch (err) {
      return res.status(500).json({ success: false, message: 'Error resetting username', error: err.message });
    }
  };

// FORGOT PASSWORD
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  

  try {
    const conn = getUserDb();
    const User = createUserModel(conn);
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'No account with this email' });

    await axios.post(`${OTP_SERVICE_URL}/send`, { email ,purpose:"forgotpassword" });
    await logToDB({ username: user.username, action: 'OTP_SENT', message: 'OTP sent for password reset', req });

    return res.status(200).json({ success: true, message: 'OTP sent to your email to reset password',verify_url : "http://localhost:5000/api/user/reset-password"});
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error sending OTP', error: err.message });


  }
};

// RESET PASSWORD
const resetPassword = async (req, res) => {
  const { email, newPassword ,otp} = req.body;
  const conn = getUserDb();
  const User = createUserModel(conn);  

  try {
    
    const verifyResponse = await axios.post(`${OTP_SERVICE_URL}/verify`, { email, otp ,purpose :"forgotpassword" });
    if (!verifyResponse.data.success)
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.updateOne({ email }, { password: hashedPassword });
    await logToDB({ username: email, action: 'PASSWORD_RESET', message: 'Password reset successfully', req });
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: `password reset successful`,
        text: `Password Reset Successful!\n You can now log in using your chosen password.`,
        });

    return res.status(200).json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error resetting password', error: err.message });
  }
};

module.exports = {
  registerUser,
  verifyRegisterOtp,
  loginUser,
  forgotUsername,
  resetUserName,
  forgotPassword,
  resetPassword
};

