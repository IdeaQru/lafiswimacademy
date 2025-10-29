// backend/src/models/TrainingEvaluation.js

const mongoose = require('mongoose');

const trainingEvaluationSchema = new mongoose.Schema({
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Schedule',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  coachId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coach',
    required: true
  },
  trainingDate: {
    type: Date,
    required: true
  },
  
  // Attendance
  attendance: {
    type: String,
    enum: ['Hadir', 'Tidak Hadir', 'Izin', 'Sakit'],
    default: 'Hadir',
    required: true
  },
  
  // Simple notes/evaluation
  notes: {
    type: String,
    default: ''
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index
trainingEvaluationSchema.index({ scheduleId: 1, studentId: 1 }, { unique: true });
trainingEvaluationSchema.index({ studentId: 1, trainingDate: -1 });
trainingEvaluationSchema.index({ coachId: 1, trainingDate: -1 });

module.exports = mongoose.model('TrainingEvaluation', trainingEvaluationSchema);
