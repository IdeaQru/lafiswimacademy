// backend/src/models/Schedule.js

const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  // ==================== STUDENT ====================
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student ID is required'],
    index: true
  },

  studentName: {
    type: String,
    required: true
  },

  studentPhone: {
    type: String,
    required: true
  },

  // ==================== COACH ====================
  coachId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coach',
    required: [true, 'Coach ID is required'],
    index: true
  },

  coachName: {
    type: String,
    required: true
  },

  coachPhone: {
    type: String
  },

  // ==================== PROGRAM ====================
  program: {
    type: String,
    required: [true, 'Program is required'],
    index: true
  },

  programCategory: {
    type: String,
    default: null
  },

  // ==================== SCHEDULE ====================
  date: {
    type: Date,
    required: [true, 'Date is required'],
    index: true,
    set: function(value) {
      // ✅ Normalize date to local midnight (00:00:00)
      if (!value) return null;
      const d = new Date(value);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
    }
  },

  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)']
  },

  endTime: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)']
  },

  duration: {
    type: Number,
    required: true,
    default: 60
  },

  location: {
    type: String,
    required: [true, 'Location is required'],
    default: 'Kolam Utama'
  },

  // ==================== STATUS ====================
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled', 'rescheduled', 'archived'],
    default: 'scheduled',
    index: true
  },

  notes: {
    type: String,
    default: null
  },

  // ==================== REMINDER ====================
  reminderEnabled: {
    type: Boolean,
    default: true
  },

  reminderSent: {
    type: Boolean,
    default: false
  },

  reminderSentAt: {
    type: Date,
    default: null
  },

  reminderBeforeHours: {
    type: Number,
    default: 24
  },

  // ==================== ARCHIVE TRACKING ====================
  archivedAt: {
    type: Date,
    default: null,
    // ✅ TTL Index: Auto-delete 3 days (259200 seconds) after archived
    index: {
      expireAfterSeconds: 259200,
      sparse: true,  // Hanya berlaku untuk documents yang punya archivedAt
      name: 'archivedAt_ttl'
    }
  },

  archivedReason: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// ==================== INDEXES ====================
scheduleSchema.index({ studentId: 1, date: -1 });
scheduleSchema.index({ coachId: 1, date: -1 });
scheduleSchema.index({ date: 1 });
scheduleSchema.index({ status: 1 });

// ✅ Compound index untuk query archived
scheduleSchema.index({ status: 1, archivedAt: 1 }, { name: 'status_archived_index' });

// ==================== STATICS ====================

/**
 * ✅ Get archived schedules older than specified days
 */
scheduleSchema.statics.getOldArchivedSchedules = async function(days = 3) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return await this.find({
    status: 'archived',
    archivedAt: { $exists: true, $lt: cutoffDate }
  }).lean();
};

/**
 * ✅ Manually delete old archived schedules
 */
scheduleSchema.statics.deleteOldArchivedSchedules = async function(days = 3) {
  console.log(`🗑️ Deleting archived schedules older than ${days} days...`);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const result = await this.deleteMany({
    status: 'archived',
    archivedAt: { $exists: true, $lt: cutoffDate }
  });

  console.log(`✅ Deleted ${result.deletedCount} old archived schedules`);
  return result;
};

/**
 * ✅ Get archive statistics
 */
scheduleSchema.statics.getArchiveStats = async function() {
  const total = await this.countDocuments({ status: 'archived' });
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 3);
  
  const willDelete = await this.countDocuments({
    status: 'archived',
    archivedAt: { $exists: true, $lt: cutoffDate }
  });

  return {
    totalArchived: total,
    willDeleteIn3Days: willDelete,
    percentage: total > 0 ? Math.round((willDelete / total) * 100) : 0
  };
};

module.exports = mongoose.model('Schedule', scheduleSchema);
