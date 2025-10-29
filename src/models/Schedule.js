const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  studentPhone: {
    type: String,
    required: true
  },
  coachId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coach',
    required: true
  },
  coachName: {
    type: String,
    required: true
  },
  coachPhone: {
    type: String
  },
  program: {
    type: String,
    required: true,
    enum: ['Baby Swimming', 'Kids Class', 'Teen & Adult', 'Private Training', 'Competition Team']
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true,
    default: 60
  },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
    default: 'scheduled'
  },
  location: {
    type: String,
    default: 'Kolam Utama'
  },
  notes: {
    type: String
  },
  reminderEnabled: {
    type: Boolean,
    default: true
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  reminderSentAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
scheduleSchema.index({ date: 1, studentId: 1 });
scheduleSchema.index({ date: 1, coachId: 1 });
scheduleSchema.index({ status: 1 });

module.exports = mongoose.model('Schedule', scheduleSchema);
