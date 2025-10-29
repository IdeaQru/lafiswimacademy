const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  logout,
  changePassword,
  registerFirstAdmin
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', register);
router.post('/login', login);

router.post('/register-first-admin', registerFirstAdmin);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.put('/change-password', protect, changePassword);

module.exports = router;
