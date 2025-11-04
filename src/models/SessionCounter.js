// backend/src/models/SessionCounter.js

const mongoose = require('mongoose');

const sessionCounterSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student ID is required'],
    index: true
  },

  lastResetDate: {
    type: Date,
    default: null
  },

  lastResetMonth: {
    type: Number,
    default: null
  },

  lastResetYear: {
    type: Number,
    default: null
  },

  resetCount: {
    type: Number,
    default: 0
  },

  manualResetOnly: {
    type: Boolean,
    default: true
  },

  allowResetWithActiveSessions: {
    type: Boolean,
    default: true
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }

}, {
  timestamps: true
});

// Indexes
sessionCounterSchema.index({ studentId: 1 }, { unique: true });
sessionCounterSchema.index({ lastResetDate: -1 });

// ==================== INSTANCE METHODS ====================

/**
 * ✅ Get current status
 */
sessionCounterSchema.methods.getStatus = async function() {
  const TrainingEvaluation = mongoose.model('TrainingEvaluation');
  
  try {
    const now = new Date();
    const monthCount = await TrainingEvaluation.getMonthCount(
      this.studentId,
      now.getFullYear(),
      now.getMonth() + 1
    );
    
    const totalCount = await TrainingEvaluation.getTotalCount(this.studentId);
    
    return {
      studentId: this.studentId,
      currentMonth: monthCount,
      totalCount,
      lastReset: this.lastResetDate,
      resetCount: this.resetCount,
      message: `${monthCount} bulan ini, ${totalCount - monthCount} sebelumnya = ${totalCount} total`
    };
  } catch (error) {
    console.error('❌ Error getting status:', error);
    throw error;
  }
};

/**
 * ✅ Check if can reset
 */
sessionCounterSchema.methods.canReset = async function() {
  try {
    return {
      canReset: true,
      reason: 'Reset allowed'
    };
  } catch (error) {
    console.error('❌ Error checking reset:', error);
    throw error;
  }
};

/**
 * ✅ Record reset
 */
sessionCounterSchema.methods.recordReset = function() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  this.lastResetDate = now;
  this.lastResetMonth = currentMonth;
  this.lastResetYear = currentYear;
  this.resetCount += 1;
  
  return {
    success: true,
    message: `Reset recorded. Total resets: ${this.resetCount}`,
    resetDate: this.lastResetDate,
    resetNumber: this.resetCount
  };
};

// ==================== STATIC METHODS ====================

/**
 * ✅ Get atau create counter
 */
sessionCounterSchema.statics.getOrCreateCounter = async function(studentId) {
  try {
    // Convert string to ObjectId if needed
    let objectId = studentId;
    if (typeof studentId === 'string') {
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        throw new Error(`Invalid ObjectId: ${studentId}`);
      }
      objectId = new mongoose.Types.ObjectId(studentId);
    }

    let counter = await this.findOne({ studentId: objectId });

    if (!counter) {
      counter = await this.create({
        studentId: objectId,
        manualResetOnly: true,
        allowResetWithActiveSessions: true
      });
      console.log(`✅ Counter created for ${objectId}`);
    }

    return counter;
  } catch (error) {
    console.error('❌ Error in getOrCreateCounter:', error.message);
    throw error;
  }
};

const SessionCounter = mongoose.model('SessionCounter', sessionCounterSchema);

module.exports = SessionCounter;
