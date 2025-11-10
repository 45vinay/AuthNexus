const express = require('express');
const {
  registerUser,
  verifyRegisterOtp,
  loginUser,
  forgotUsername,
  resetUserName,
  forgotPassword,
  resetPassword
} = require('../controllers/auth-controllers');

const router = express.Router();

router.post('/register', registerUser);
router.post('/verify-register', verifyRegisterOtp);
router.post('/login', loginUser);
router.post('/forgot-username', forgotUsername);
router.post('/reset-username', resetUserName);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;
