// models/User.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    lowercase: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true, // ← Allow null but unique if present
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // ← Hide by default
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  phone: {
    type: String,
    trim: true,
    sparse: true // ← Allow null but unique if present
  },
  role: {
    type: String,
    enum: ['admin', 'superadmin', 'coach', 'staff', 'user'],
    default: 'admin'
  },
  coachId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coach',
    default: null
  },
  photo: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// ==================== INDEXES ====================
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true, sparse: true });

// ==================== PRE-SAVE HOOK ====================
userSchema.pre('save', async function(next) {
  // Only hash if password is modified
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    console.log('🔐 Password hashed for user:', this.username);
    next();
  } catch (error) {
    console.error('❌ Password hash error:', error);
    next(error);
  }
});

// ==================== METHODS ====================
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    console.log('🔍 Comparing passwords for user:', this.username);
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    console.log('🔑 Password match:', isMatch);
    return isMatch;
  } catch (error) {
    console.error('❌ Password comparison error:', error);
    throw new Error('Password comparison failed');
  }
};

// ==================== STATIC METHODS ====================
userSchema.statics.findByUsername = function(username) {
  return this.findOne({ username: username.toLowerCase() });
};

module.exports = mongoose.model('User', userSchema);
