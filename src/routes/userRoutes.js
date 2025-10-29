// routes/users.js

const express = require('express');
const router = express.Router();
const {
  createUser,
  listUsers,
  resetUserPassword,
  getUserById,
  updateUser,
  deleteUser,
  linkCoachToUser // ← ADD: Import new controller
} = require('../controllers/userController');

const { protect, authorize } = require('../middleware/authMiddleware');

// ======================================
// PROTECTED ROUTES (Admin Only)
// ======================================

// Protect all routes below
router.use(protect);
router.use(authorize('admin', 'superadmin')); // ← Allow superadmin too

/**
 * @route   GET /api/users
 * @desc    Get all users
 * @access  Private/Admin
 */
router.get('/', listUsers);

/**
 * @route   POST /api/users
 * @desc    Create new user (with optional coachId)
 * @access  Private/Admin
 */
router.post('/', createUser);

/**
 * @route   GET /api/users/:id
 * @desc    Get specific user by ID
 * @access  Private/Admin
 */
router.get('/:id', getUserById);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user data (including coachId)
 * @access  Private/Admin
 */
router.put('/:id', updateUser);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Private/Admin
 */
router.delete('/:id', deleteUser);

/**
 * @route   PUT /api/users/:id/reset-password
 * @desc    Reset user password
 * @access  Private/Admin
 */
router.put('/:id/reset-password', resetUserPassword);

/**
 * @route   PUT /api/users/:id/link-coach
 * @desc    Link coach to user (standalone endpoint)
 * @access  Private/Admin
 */
router.put('/:id/link-coach', linkCoachToUser);

module.exports = router;
