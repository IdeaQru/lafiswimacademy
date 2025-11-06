// backend/src/middleware/auth.js - FIXED

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * ✅ Protect routes - Verify JWT token
 * FIXED: Get coachId from User.coachId jika ada
 */
exports.protect = async (req, res, next) => {
  try {
    let token;

    // ✅ Extract token
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    console.log('🔐 [PROTECT MIDDLEWARE] Token check:', token ? '✅' : '❌');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token provided',
      });
    }

    try {
      // ✅ Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      console.log('   ✅ Token verified:', {
        id: decoded.id,
        role: decoded.role
      });

      // ✅ Get user from database
      const user = await User.findById(decoded.id).select('-password').lean();

      if (!user) {
        console.warn('   ❌ User not found');
        return res.status(401).json({
          success: false,
          message: 'User not found',
        });
      }

      if (!user.isActive) {
        console.warn('   ❌ User inactive');
        return res.status(401).json({
          success: false,
          message: 'User account is deactivated',
        });
      }

      // ✅ Attach user to request
      req.user = {
        _id: user._id.toString(),
        id: user._id.toString(),
        userId: user._id.toString(),
        role: user.role,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        isActive: user.isActive
      };

      console.log('   ✅ User attached:', {
        userId: req.user._id,
        role: req.user.role
      });

      // ✅ FIXED: Get coachId dari user.coachId jika user adalah coach
      if (user.role === 'coach' && user.coachId) {
        req.user.coachId = user.coachId.toString();
        console.log('   ✅ Coach ID attached:', req.user.coachId);
      } else if (user.role === 'coach') {
        console.warn('   ⚠️ User is coach but coachId field is empty');
      }

      console.log('🔐 [PROTECT MIDDLEWARE] ✅ Auth successful');
      next();

    } catch (error) {
      console.error('❌ Token verification failed:', error.message);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Not authorized, invalid token',
        });
      }

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Not authorized, token expired',
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed',
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
    });
  }
};

/**
 * ✅ Authorize - Restrict to specific roles
 */
exports.authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.warn(`❌ [AUTHORIZE] ${req.user.role} not authorized`);
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this route`,
      });
    }

    next();
  };
};

module.exports = exports;
