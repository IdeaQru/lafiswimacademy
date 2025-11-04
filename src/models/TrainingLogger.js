// backend/src/models/TrainingLogger.js

const mongoose = require('mongoose');

const trainingLoggerSchema = new mongoose.Schema({
  // ==================== REFERENCES ====================
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student ID is required'],
    index: true
  },

  // ==================== LOG DATA ====================
  logType: {
    type: String,
    enum: ['deleted', 'reset', 'archived'],
    default: 'deleted',
    required: true
  },

  year: {
    type: Number,
    required: [true, 'Year is required'],
    index: true
  },

  month: {
    type: Number,
    required: [true, 'Month is required'],
    index: true
  },

  deletedCount: {
    type: Number,
    default: 0
  },

  // ==================== ARCHIVE DATA ====================
  archivedEvaluations: [{
    scheduleId: mongoose.Schema.Types.ObjectId,
    attendance: String,
    trainingDate: Date,
    notes: String,
    coachId: mongoose.Schema.Types.ObjectId
  }],

  // ==================== TIMESTAMPS ====================
  loggedAt: {
    type: Date,
    default: Date.now,
    index: true
  }

}, {
  timestamps: true
});

// ==================== TTL INDEX - Auto delete after 30 days ====================
trainingLoggerSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 * 24 * 60 * 60

// ==================== COMPOUND INDEX ====================
trainingLoggerSchema.index({ studentId: 1, year: 1, month: 1 });

// ==================== STATIC METHODS ====================

/**
 * ✅ Log reset action
 */
trainingLoggerSchema.statics.logReset = async function(studentId, year, month, evaluations) {
  try {
    const log = await this.create({
      studentId,
      logType: 'reset',
      year,
      month,
      deletedCount: evaluations.length,
      archivedEvaluations: evaluations.map(e => ({
        scheduleId: e.scheduleId,
        attendance: e.attendance,
        trainingDate: e.trainingDate,
        notes: e.notes,
        coachId: e.coachId
      }))
    });

    console.log(`✅ Reset logged for student ${studentId}: ${evaluations.length} evaluations`);
    return log;
  } catch (error) {
    console.error('❌ Error logging reset:', error);
    throw error;
  }
};

/**
 * ✅ Get total dari bulan tertentu (dari logger + live evaluations)
 */
trainingLoggerSchema.statics.getTotalForMonth = async function(studentId, year, month) {
  try {
    const TrainingEvaluation = mongoose.model('TrainingEvaluation');
    
    // Count live evaluations
    const liveCount = await TrainingEvaluation.getMonthCount(studentId, year, month);
    
    // Count dari logger (data yang sudah direset)
    const loggerDocs = await this.find({
      studentId,
      year,
      month,
      logType: 'reset'
    });
    
    const loggedCount = loggerDocs.reduce((sum, doc) => sum + (doc.deletedCount || 0), 0);
    
    const total = liveCount + loggedCount;
    
    console.log(`✅ Total for ${studentId} (${year}-${month}): ${liveCount} live + ${loggedCount} logged = ${total}`);
    return total;
  } catch (error) {
    console.error('❌ Error getting total for month:', error);
    return 0;
  }
};

const TrainingLogger = mongoose.model('TrainingLogger', trainingLoggerSchema);

module.exports = TrainingLogger;
