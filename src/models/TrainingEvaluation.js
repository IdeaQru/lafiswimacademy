// backend/src/models/TrainingEvaluation.js

const mongoose = require('mongoose');

const trainingEvaluationSchema = new mongoose.Schema({
  // ==================== REFERENCES ====================
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Schedule',
    required: [true, 'Schedule ID is required'],
    index: true
  },
  
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student ID is required'],
    index: true
  },
  
  coachId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coach',
    required: [true, 'Coach ID is required'],
    index: true
  },

  // ==================== TRAINING INFO ====================
  trainingDate: {
    type: Date,
    required: [true, 'Training date is required'],
    index: true
  },

  // ==================== ATTENDANCE - ONLY COUNT HADIR ====================
  attendance: {
    type: String,
    enum: ['Hadir', 'Tidak Hadir', 'Izin', 'Sakit'],
    default: 'Hadir',
    required: [true, 'Attendance status is required'],
    index: true
  },

  // ==================== NOTES & EVALUATION ====================
  notes: {
    type: String,
    default: ''
  },

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
trainingEvaluationSchema.index({ scheduleId: 1 }, { unique: true });
trainingEvaluationSchema.index({ studentId: 1, trainingDate: -1 });
trainingEvaluationSchema.index({ studentId: 1, attendance: 1 });
trainingEvaluationSchema.index({ coachId: 1, trainingDate: -1 });
trainingEvaluationSchema.index({ attendance: 1 });
trainingEvaluationSchema.index({ studentId: 1, attendance: 1, trainingDate: -1 });
trainingEvaluationSchema.index({ coachId: 1, attendance: 1, trainingDate: -1 });

// ==================== INSTANCE METHODS ====================

/**
 * ✅ Mark attendance
 */
trainingEvaluationSchema.methods.markAttendance = function(attendance) {
  const validAttendances = ['Hadir', 'Tidak Hadir', 'Izin', 'Sakit'];
  
  if (!validAttendances.includes(attendance)) {
    throw new Error(`Invalid attendance: ${attendance}`);
  }
  
  this.attendance = attendance;
  console.log(`✅ Attendance marked: ${attendance}`);
  return this;
};

/**
 * ✅ Check if counting (only Hadir)
 */
trainingEvaluationSchema.methods.isCounting = function() {
  return this.attendance === 'Hadir';
};

/**
 * ✅ Get label dengan emoji
 */
trainingEvaluationSchema.methods.getAttendanceLabel = function() {
  const labels = {
    'Hadir': '✅ Hadir',
    'Tidak Hadir': '❌ Tidak Hadir',
    'Izin': '📝 Izin',
    'Sakit': '🏥 Sakit'
  };
  
  return labels[this.attendance] || this.attendance;
};

// ==================== STATIC METHODS ====================

/**
 * ✅ Get count untuk bulan tertentu (ONLY HADIR)
 */
trainingEvaluationSchema.statics.getMonthCount = async function(studentId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  try {
    const count = await this.countDocuments({
      studentId: mongoose.Types.ObjectId.isValid(studentId) 
        ? new mongoose.Types.ObjectId(studentId)
        : studentId,
      attendance: 'Hadir',
      trainingDate: {
        $gte: startDate,
        $lte: endDate
      }
    });
    
    console.log(`✅ Month count for ${studentId} (${year}-${month}): ${count} Hadir`);
    return count;
  } catch (error) {
    console.error('❌ Error getting month count:', error);
    return 0;
  }
};

/**
 * ✅ Get total count (ONLY HADIR)
 */
trainingEvaluationSchema.statics.getTotalCount = async function(studentId) {
  try {
    const count = await this.countDocuments({
      studentId: mongoose.Types.ObjectId.isValid(studentId) 
        ? new mongoose.Types.ObjectId(studentId)
        : studentId,
      attendance: 'Hadir'
    });
    
    console.log(`✅ Total count for ${studentId}: ${count} Hadir`);
    return count;
  } catch (error) {
    console.error('❌ Error getting total count:', error);
    return 0;
  }
};

/**
 * ✅ Get progress untuk student
 */
trainingEvaluationSchema.statics.getProgress = async function(studentId) {
  try {
    const now = new Date();
    
    const monthCount = await this.getMonthCount(
      studentId, 
      now.getFullYear(), 
      now.getMonth() + 1
    );
    
    const totalCount = await this.getTotalCount(studentId);
    const carryOver = totalCount - monthCount;
    
    const progress = {
      monthCount,
      totalCount,
      carryOver,
      message: `${monthCount} bulan ini, ${carryOver} dari bulan lalu = ${totalCount} total`
    };
    
    console.log(`✅ Progress for ${studentId}:`, progress);
    return progress;
  } catch (error) {
    console.error('❌ Error getting progress:', error);
    return {
      monthCount: 0,
      totalCount: 0,
      carryOver: 0,
      message: 'Error calculating progress'
    };
  }
};

/**
 * ✅ Get evaluations for student
 */
trainingEvaluationSchema.statics.getEvaluationsByStudent = async function(studentId, filters = {}) {
  try {
    let query = { 
      studentId: mongoose.Types.ObjectId.isValid(studentId) 
        ? new mongoose.Types.ObjectId(studentId)
        : studentId
    };
    
    if (filters.year && filters.month) {
      const startDate = new Date(filters.year, filters.month - 1, 1);
      const endDate = new Date(filters.year, filters.month, 0, 23, 59, 59);
      
      query.trainingDate = {
        $gte: startDate,
        $lte: endDate
      };
    }
    
    if (filters.attendance) {
      query.attendance = filters.attendance;
    }
    
    const evaluations = await this.find(query)
      .populate('coachId', 'fullName phone')
      .populate('scheduleId', 'date startTime endTime')
      .sort({ trainingDate: -1 });
    
    console.log(`✅ Found ${evaluations.length} evaluations for student`);
    return evaluations;
  } catch (error) {
    console.error('❌ Error getting evaluations:', error);
    return [];
  }
};

/**
 * ✅ Get evaluations for coach
 */
trainingEvaluationSchema.statics.getEvaluationsByCoach = async function(coachId, filters = {}) {
  try {
    let query = { 
      coachId: mongoose.Types.ObjectId.isValid(coachId) 
        ? new mongoose.Types.ObjectId(coachId)
        : coachId
    };
    
    if (filters.year && filters.month) {
      const startDate = new Date(filters.year, filters.month - 1, 1);
      const endDate = new Date(filters.year, filters.month, 0, 23, 59, 59);
      
      query.trainingDate = {
        $gte: startDate,
        $lte: endDate
      };
    }
    
    const evaluations = await this.find(query)
      .populate('studentId', 'fullName studentId')
      .populate('scheduleId', 'date startTime endTime')
      .sort({ trainingDate: -1 });
    
    console.log(`✅ Found ${evaluations.length} evaluations for coach`);
    return evaluations;
  } catch (error) {
    console.error('❌ Error getting coach evaluations:', error);
    return [];
  }
};

/**
 * ✅ Get attendance summary
 */
trainingEvaluationSchema.statics.getAttendanceSummary = async function(studentId, year, month) {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    const summary = await this.aggregate([
      {
        $match: {
          studentId: mongoose.Types.ObjectId.isValid(studentId) 
            ? new mongoose.Types.ObjectId(studentId)
            : studentId,
          trainingDate: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: '$attendance',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    console.log(`✅ Attendance summary:`, summary);
    return summary;
  } catch (error) {
    console.error('❌ Error getting attendance summary:', error);
    return [];
  }
};

/**
 * ✅ Get students by attendance percentage
 */
trainingEvaluationSchema.statics.getAttendanceStats = async function(minPercentage = 80) {
  try {
    const stats = await this.aggregate([
      {
        $group: {
          _id: '$studentId',
          totalSessions: { $sum: 1 },
          presentSessions: {
            $sum: {
              $cond: [{ $eq: ['$attendance', 'Hadir'] }, 1, 0]
            }
          }
        }
      },
      {
        $addFields: {
          attendancePercentage: {
            $multiply: [
              { $divide: ['$presentSessions', '$totalSessions'] },
              100
            ]
          }
        }
      },
      {
        $match: {
          attendancePercentage: { $gte: minPercentage }
        }
      },
      {
        $sort: { attendancePercentage: -1 }
      },
      {
        $lookup: {
          from: 'students',
          localField: '_id',
          foreignField: '_id',
          as: 'studentInfo'
        }
      }
    ]);
    
    console.log(`✅ Found ${stats.length} students with ${minPercentage}% attendance`);
    return stats;
  } catch (error) {
    console.error('❌ Error getting attendance stats:', error);
    return [];
  }
};

/**
 * ✅ Delete month evaluations (untuk reset)
 */
trainingEvaluationSchema.statics.deleteMonthEvaluations = async function(studentId, year, month) {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    const result = await this.deleteMany({
      studentId: mongoose.Types.ObjectId.isValid(studentId) 
        ? new mongoose.Types.ObjectId(studentId)
        : studentId,
      trainingDate: {
        $gte: startDate,
        $lte: endDate
      }
    });
    
    console.log(`✅ Deleted ${result.deletedCount} evaluations for ${studentId} in ${year}-${month}`);
    return result.deletedCount;
  } catch (error) {
    console.error('❌ Error deleting evaluations:', error);
    throw error;
  }
};

const TrainingEvaluation = mongoose.model('TrainingEvaluation', trainingEvaluationSchema);

module.exports = TrainingEvaluation;
