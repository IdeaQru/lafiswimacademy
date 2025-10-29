// controllers/userController.js

const User = require('../models/User');
const Coach = require('../models/Coach');
const bcrypt = require('bcryptjs');

/**
 * @desc    Get all users
 * @route   GET /api/users
 * @access  Private/Admin
 */
exports.listUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .populate('coachId', 'fullName email phone') // ← Populate coach data
      .select('-password')
      .sort({ createdAt: -1 });

    console.log(`✅ Retrieved ${users.length} users`);

    res.json({ 
      success: true, 
      count: users.length,
      data: users 
    });
  } catch (error) {
    console.error('❌ List users error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * @desc    Create new user
 * @route   POST /api/users
 * @access  Private/Admin
 */
exports.createUser = async (req, res) => {
  try {
    const { username, password, fullName, email, phone, role, coachId } = req.body;

    console.log('📝 Creating user:', { username, role, coachId: coachId || 'none' });

    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // If role is coach, coachId is required
    if (role === 'coach' && !coachId) {
      return res.status(400).json({
        success: false,
        message: 'Coach ID is required for coach role'
      });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // Check if phone already exists (if provided)
    if (phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already exists'
        });
      }
    }

    // Verify coach exists if coachId provided
    if (coachId) {
      const coach = await Coach.findById(coachId);
      if (!coach) {
        return res.status(404).json({
          success: false,
          message: 'Coach not found'
        });
      }
      console.log('✅ Coach verified:', coach.fullName);
    }

    // Create new user
    const user = new User({
      username: username.toLowerCase(),
      password,
      fullName: fullName || '',
      email: email ? email.toLowerCase() : undefined,
      phone: phone || undefined,
      role: role || 'admin',
      coachId: coachId || null
    });

    await user.save();

    console.log(`✅ User created: ${username} (${role})${coachId ? ` → Coach ID: ${coachId}` : ''}`);

    // Return user with populated coach data
    const userResponse = await User.findById(user._id)
      .populate('coachId', 'fullName email phone')
      .select('-password');

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse
    });
  } catch (error) {
    console.error('❌ Create User Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
};

/**
 * @desc    Get user by ID
 * @route   GET /api/users/:id
 * @access  Private/Admin
 */
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('coachId', 'fullName email phone')
      .select('-password');

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User tidak ditemukan' 
      });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * @desc    Update user data
 * @route   PUT /api/users/:id
 * @access  Private/Admin
 */
exports.updateUser = async (req, res) => {
  try {
    const { username, email, phone, fullName, role, coachId } = req.body;

    console.log('📝 Updating user:', { id: req.params.id, username, role, coachId: coachId || 'none' });

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User tidak ditemukan' 
      });
    }

    // If role is coach, coachId is required
    if (role === 'coach' && !coachId) {
      return res.status(400).json({
        success: false,
        message: 'Coach ID is required for coach role'
      });
    }

    // Check duplicates (exclude current user)
    if (username && username !== user.username) {
      const existingUsername = await User.findOne({ 
        username: username.toLowerCase(),
        _id: { $ne: req.params.id }
      });
      if (existingUsername) {
        return res.status(400).json({ 
          success: false, 
          message: 'Username sudah digunakan' 
        });
      }
    }

    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: req.params.id }
      });
      if (existingEmail) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email sudah digunakan' 
        });
      }
    }

    if (phone && phone !== user.phone) {
      const existingPhone = await User.findOne({ 
        phone,
        _id: { $ne: req.params.id }
      });
      if (existingPhone) {
        return res.status(400).json({ 
          success: false, 
          message: 'Phone number sudah digunakan' 
        });
      }
    }

    // Verify coach exists if coachId provided
    if (coachId) {
      const coach = await Coach.findById(coachId);
      if (!coach) {
        return res.status(404).json({
          success: false,
          message: 'Coach not found'
        });
      }
      console.log('✅ Coach verified:', coach.fullName);
    }

    // Update fields
    user.username = username ? username.toLowerCase() : user.username;
    user.email = email ? email.toLowerCase() : user.email;
    user.phone = phone || user.phone;
    user.fullName = fullName || user.fullName;
    user.role = role || user.role;
    user.coachId = coachId || null; // ← Update coachId

    await user.save();

    console.log('✅ User updated successfully');

    // Return with populated coach data
    const userResponse = await User.findById(user._id)
      .populate('coachId', 'fullName email phone')
      .select('-password');

    res.json({ 
      success: true, 
      message: 'User berhasil diupdate', 
      data: userResponse 
    });
  } catch (error) {
    console.error('❌ Update user error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * @desc    Delete user
 * @route   DELETE /api/users/:id
 * @access  Private/Admin
 */
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User tidak ditemukan' 
      });
    }

    console.log(`✅ User deleted: ${user.username}`);

    res.json({ 
      success: true, 
      message: `User ${user.username} berhasil dihapus` 
    });
  } catch (error) {
    console.error('❌ Delete user error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * @desc    Reset user password
 * @route   PUT /api/users/:id/reset-password
 * @access  Private/Admin
 */
exports.resetUserPassword = async (req, res) => {
  try {
    const userId = req.params.id;
    const { password, newPassword } = req.body;

    // Accept both 'password' and 'newPassword' field names
    const passwordToSet = password || newPassword;

    if (!passwordToSet) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password baru wajib diisi' 
      });
    }

    if (passwordToSet.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password minimal 6 karakter' 
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User tidak ditemukan' 
      });
    }

    console.log(`🔑 Resetting password for user: ${user.username}`);

    // Update password (will be hashed by pre-save hook)
    user.password = passwordToSet;
    await user.save();

    console.log(`✅ Password reset successfully for: ${user.username}`);

    res.json({ 
      success: true, 
      message: `Password user ${user.username} berhasil di-reset` 
    });
  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * @desc    Link coach to user
 * @route   PUT /api/users/:id/link-coach
 * @access  Private/Admin
 */
exports.linkCoachToUser = async (req, res) => {
  try {
    const { coachId } = req.body;
    const userId = req.params.id;

    console.log(`🔗 Linking coach ${coachId} to user ${userId}`);

    // Verify coach exists
    if (coachId) {
      const coach = await Coach.findById(coachId);
      if (!coach) {
        return res.status(404).json({
          success: false,
          message: 'Coach not found'
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { coachId: coachId || null },
      { new: true, runValidators: true }
    )
    .populate('coachId', 'fullName email phone')
    .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('✅ Coach linked successfully');

    res.status(200).json({
      success: true,
      message: 'Coach linked successfully',
      data: user
    });
  } catch (error) {
    console.error('❌ Link Coach Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to link coach',
      error: error.message
    });
  }
};
