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
    enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
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
  }
}, {
  timestamps: true
});

// ==================== INDEXES ====================
scheduleSchema.index({ studentId: 1, date: -1 });
scheduleSchema.index({ coachId: 1, date: -1 });
scheduleSchema.index({ date: 1 });
scheduleSchema.index({ status: 1 });

module.exports = mongoose.model('Schedule', scheduleSchema);
