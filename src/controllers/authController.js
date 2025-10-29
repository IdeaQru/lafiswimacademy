const jwt = require('jsonwebtoken');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
// Generate JWT Token
// controllers/authController.js


// Generate JWT token
const generateToken = (userId, role, coachId) => {
  return jwt.sign(
    { 
      id: userId,
      role: role,
      coachId: coachId // ← Include coachId in JWT
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username and password',
      });
    }

    // Find user and include password field
    const user = await User.findOne({ username }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated',
      });
    }

    // Check password
    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // ← UPDATE: Generate token with coachId
    const token = generateToken(user._id, user.role, user.coachId);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          _id: user._id, // ← Add both for compatibility
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          coachId: user.coachId, // ← Include coachId
          photo: user.photo
        },
      },
    });
  } catch (error) {
    console.error('❌ Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message,
    });
  }
};

// ← ADD: Get current user profile
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          _id: user._id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          coachId: user.coachId,
          photo: user.photo
        }
      }
    });
  } catch (error) {
    console.error('❌ Get Me Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};


// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public


/**
 * @desc    Register first admin (one-time setup)
 * @route   POST /api/auth/register-first-admin
 * @access  Public (but only works if no admin exists)
 */
exports.registerFirstAdmin = async (req, res) => {
  try {
    const { username, email, phone, fullName, password } = req.body;

    console.log('📝 Register first admin attempt:', { username, email, phone });

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('⚠️ Admin already exists');
      return res.status(400).json({ 
        success: false, 
        message: 'Admin sudah terdaftar. Gunakan endpoint user management.' 
      });
    }

    // Validation
    if (!username || !email || !phone || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username, Email, Phone, dan Password wajib diisi' 
      });
    }

    // Create first admin (password will be auto-hashed by pre-save hook)
    const admin = await User.create({ 
      username: username.toLowerCase(), 
      email,
      phone, 
      fullName: fullName || 'Super Admin',
      role: 'admin', 
      password: password  // Plain password - will be hashed automatically
    });

    console.log('✅ Admin created:', admin.username);

    // Generate token
    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ 
      success: true, 
      message: 'Admin pertama berhasil dibuat',
      data: {
        token,
        user: {
          id: admin._id,
          username: admin.username,
          email: admin.email,
          phone: admin.phone,
          fullName: admin.fullName,
          role: admin.role
        }
      }
    });
  } catch (error) {
    console.error('❌ Register first admin error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};


exports.register = async (req, res) => {
  try {
    const { username, email, password, fullName, phone, role } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ $or: [{ email }, { username }] });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or username already exists',
      });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      fullName,
      phone,
      role: role || 'user',
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message,
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout',
      error: error.message,
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password',
      });
    }

    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change Password Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
