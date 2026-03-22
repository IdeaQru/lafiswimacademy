// backend/src/models/TrainingEvaluation.js - ADD COACH NOTES HISTORY

const mongoose = require('mongoose');

const trainingEvaluationSchema = new mongoose.Schema({
  // ==================== REFERENCES ====================
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Schedule',
    required: [true, 'Schedule ID required'],
    index: true
  },
  
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student ID required'],
    index: true
  },
  
  coachIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coach',
    required: true
  }],

  // ==================== TRAINING INFO ====================
  trainingDate: {
    type: Date,
    required: [true, 'Training date required'],
    index: true
  },

  // ==================== ATTENDANCE ====================
  attendance: {
    type: String,
    enum: ['Hadir', 'Tidak Hadir', 'Izin', 'Sakit'],
    default: 'Hadir',
    required: true,
    index: true
  },

  // ==================== NOTES - COMBINED FROM ALL COACHES ====================
  notes: {
    type: String,
    default: ''
  },

  // ✅ NEW: Track notes per coach (for history/continuation)
  coachNotes: [{
    coachId: mongoose.Schema.Types.ObjectId,
    coachName: String,
    notes: String,
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // ==================== TRACKING ====================
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

// ==================== INDEXES ====================
trainingEvaluationSchema.index({ scheduleId: 1, studentId: 1 }, { unique: true });
trainingEvaluationSchema.index({ studentId: 1, trainingDate: -1 });
trainingEvaluationSchema.index({ coachIds: 1, trainingDate: -1 });
trainingEvaluationSchema.index({ scheduleId: 1 });

// ==================== INSTANCE METHODS ====================

trainingEvaluationSchema.methods.markAttendance = function(attendance) {
  const validAttendances = ['Hadir', 'Tidak Hadir', 'Izin', 'Sakit'];
  if (!validAttendances.includes(attendance)) {
    throw new Error(`Invalid attendance: ${attendance}`);
  }
  this.attendance = attendance;
  return this;
};

trainingEvaluationSchema.methods.isCounting = function() {
  return this.attendance === 'Hadir';
};

trainingEvaluationSchema.methods.getAttendanceLabel = function() {
  const labels = {
    'Hadir': '✅ Hadir',
    'Tidak Hadir': '❌ Tidak Hadir',
    'Izin': '📝 Izin',
    'Sakit': '🏥 Sakit'
  };
  return labels[this.attendance] || this.attendance;
};

trainingEvaluationSchema.methods.hasCoach = function(coachId) {
  return this.coachIds.some(cId => cId.toString() === coachId.toString());
};

trainingEvaluationSchema.methods.addCoach = function(coachId) {
  if (!this.hasCoach(coachId)) {
    this.coachIds.push(coachId);
  }
  return this;
};

// ✅ NEW: Add coach notes (keep history)
trainingEvaluationSchema.methods.addCoachNotes = function(coachId, coachName, newNotes) {
  // Remove old notes from this coach if exists
  this.coachNotes = this.coachNotes.filter(cn => cn.coachId.toString() !== coachId.toString());
  
  // Add new notes from this coach
  if (newNotes && newNotes.trim()) {
    this.coachNotes.push({
      coachId: new mongoose.Types.ObjectId(coachId),
      coachName,
      notes: newNotes,
      addedAt: new Date()
    });
  }

  // Rebuild combined notes (concatenate from all coaches)
  this.rebuildCombinedNotes();
  
  return this;
};

// ✅ NEW: Rebuild combined notes from all coaches
trainingEvaluationSchema.methods.rebuildCombinedNotes = function() {
  if (this.coachNotes && this.coachNotes.length > 0) {
    const combinedNotes = this.coachNotes
      .sort((a, b) => new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime())
      .map(cn => `[${cn.coachName}]: ${cn.notes}`)
      .join('\n');
    
    this.notes = combinedNotes;
  }
  return this;
};

// ==================== STATIC METHODS ====================

trainingEvaluationSchema.statics.getMonthCount = async function(studentId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const studentObjectId = mongoose.Types.ObjectId.isValid(studentId)
    ? new mongoose.Types.ObjectId(studentId)
    : studentId;

  // ✅ Count evaluations dengan attendance 'Hadir'
  const evaluationsCount = await this.countDocuments({
    studentId: studentObjectId,
    attendance: 'Hadir',
    trainingDate: { $gte: startDate, $lte: endDate }
  });

  // ✅ Count cancelled schedules sebagai penalty
  const Schedule = mongoose.model('Schedule');
  const cancelledCount = await Schedule.countDocuments({
    $or: [
      { studentId: studentObjectId },           // Private sessions
      { students: { $in: [studentObjectId] } }  // Semi-private & Group sessions
    ],
    status: 'cancelled',
    date: { $gte: startDate, $lte: endDate }
  });

  console.log(`📊 getMonthCount for student ${studentObjectId}:`);
  console.log(`   - Evaluations (Hadir): ${evaluationsCount}`);
  console.log(`   - Cancelled Schedules: ${cancelledCount}`);
  console.log(`   - Total: ${evaluationsCount + cancelledCount}`);

  return evaluationsCount + cancelledCount;
};

trainingEvaluationSchema.statics.getTotalCount = async function(studentId) {
  const studentObjectId = mongoose.Types.ObjectId.isValid(studentId)
    ? new mongoose.Types.ObjectId(studentId)
    : studentId;

  // ✅ Count evaluations dengan attendance 'Hadir'
  const evaluationsCount = await this.countDocuments({
    studentId: studentObjectId,
    attendance: 'Hadir'
  });

  // ✅ Count SEMUA cancelled schedules sebagai penalty
  const Schedule = mongoose.model('Schedule');
  const cancelledCount = await Schedule.countDocuments({
    $or: [
      { studentId: studentObjectId },           // Private sessions
      { students: { $in: [studentObjectId] } }  // Semi-private & Group sessions
    ],
    status: 'cancelled'
  });

  console.log(`📊 getTotalCount for student ${studentObjectId}:`);
  console.log(`   - Evaluations (Hadir): ${evaluationsCount}`);
  console.log(`   - Cancelled Schedules: ${cancelledCount}`);
  console.log(`   - Total: ${evaluationsCount + cancelledCount}`);

  return evaluationsCount + cancelledCount;
};

trainingEvaluationSchema.statics.getProgress = async function(studentId) {
  const now = new Date();
  
  const monthCount = await this.getMonthCount(
    studentId, 
    now.getFullYear(), 
    now.getMonth() + 1
  );
  
  const totalCount = await this.getTotalCount(studentId);
  const carryOver = totalCount - monthCount;
  
  return {
    monthCount,
    totalCount,
    carryOver,
    message: `${monthCount} bulan ini, ${carryOver} dari bulan lalu = ${totalCount} total`
  };
};

const TrainingEvaluation = mongoose.model('TrainingEvaluation', trainingEvaluationSchema);
module.exports = TrainingEvaluation;
