// backend/src/models/Student.js

const mongoose = require('mongoose');

// ==================== MAIN STUDENT SCHEMA ====================
const studentSchema = new mongoose.Schema({
  // ==================== BASIC INFO ====================
  studentId: {
    type: String,
    required: [true, 'Student ID is required'],
    unique: true,
    trim: true,
    index: true
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    index: true
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  age: {
    type: Number
  },
  gender: {
    type: String,
    enum: ['Laki-laki', 'Perempuan'],
    required: [true, 'Gender is required']
  },
  parentName: {
    type: String,
    required: [true, 'Parent name is required'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[0-9]{10,15}$/, 'Phone number must be 10-15 digits'],
    index: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$|^$/, 'Invalid email format'],
    default: null
  },
  address: {
    type: String,
    required: [true, 'Address is required']
  },

  // ==================== PROGRAM INFO ====================
  programType: {
    type: String,
    enum: ['private', 'semiPrivate', 'group'],
    required: [true, 'Program type is required'],
    index: true
  },
  programCategory: {
    type: String,
    enum: ['Aquatike', 'Beginner', 'Teen & Adult', 'Therapy', 'Preschool'],
    required: [true, 'Program category is required'],
    index: true
  },
  poolLocation: {
    type: String,
    required: [true, 'Pool location is required']
  },
  trainingDay: {
    type: String,
    enum: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu', 'Fleksibel'],
    required: [true, 'Training day is required'],
    index: true
  },

  // ==================== HEALTH & ADDITIONAL INFO ====================
  healthCondition: {
    type: String,
    default: ''
  },
  allergies: {
    type: String,
    default: ''
  },
  knownFrom: {
    type: String,
    enum: ['Instagram', 'TikTok', 'Facebook', 'WhatsApp', 'Teman/Keluarga', 'Google', 'Iklan', 'Lainnya'],
    required: [true, 'Known from source is required']
  },
  photo: {
    type: String,
    default: null
  },

  // ==================== STATUS & REGISTRATION ====================
  registrationDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  status: {
    type: String,
    enum: ['Aktif', 'Non-Aktif', 'Cuti'],
    default: 'Aktif',
    index: true
  },

  // ==================== PAYMENT STATUS ====================
  paymentStatus: {
    type: String,
    enum: ['Lunas', 'Belum Bayar', 'Cicilan'],
    default: 'Belum Bayar',
    index: true
  },
  // ✅ HAPUS: paymentHistory array
  // ✅ USE: Payment collection instead


  // ==================== TRAINING EVALUATION REFERENCE ====================
  // ✅ HAPUS: trainingHistory array
  // ✅ USE: TrainingEvaluation collection instead
  

  // ✅ CUMULATIVE TRACKING (tidak pernah reset)
  totalTrainingSessions: {
    type: Number,
    default: 0,
    index: true
  },

  // ✅ LAST PAYMENT REMINDER DATE
  lastPaymentReminderDate: {
    type: Date,
    default: null
  }

}, {
  timestamps: true
});

// ==================== INDEXES ====================
studentSchema.index({ studentId: 1 });
studentSchema.index({ fullName: 1 });
studentSchema.index({ phone: 1 });
studentSchema.index({ registrationDate: 1 });
studentSchema.index({ status: 1 });
studentSchema.index({ paymentStatus: 1 });
studentSchema.index({ programType: 1 });
studentSchema.index({ programCategory: 1 });
studentSchema.index({ trainingDay: 1 });
studentSchema.index({ gender: 1 });
studentSchema.index({ age: 1 });
studentSchema.index({ totalTrainingSessions: 1 });

// Compound indexes
studentSchema.index({ status: 1, paymentStatus: 1 });
studentSchema.index({ status: 1, programType: 1 });
studentSchema.index({ status: 1, trainingDay: 1 });
studentSchema.index({ status: 1, totalTrainingSessions: 1 });

// ==================== PRE-SAVE HOOKS ====================

/**
 * ✅ Calculate age before saving
 */
studentSchema.pre('save', function(next) {
  if (this.dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    this.age = Math.max(0, age);
  }
  next();
});

// ==================== INSTANCE METHODS ====================

/**
 * ✅ Get total training count dari TrainingEvaluation collection
 */
studentSchema.methods.getTotalTrainingCount = async function() {
  const TrainingEvaluation = require('./TrainingEvaluation');
  
  const count = await TrainingEvaluation.countDocuments({
    studentId: this._id,
    attendance: 'Hadir'
  });
  
  console.log(`✅ Total training count for ${this.fullName}: ${count}`);
  return count;
};

/**
 * ✅ Get training count untuk specific month dari TrainingEvaluation
 */
studentSchema.methods.getMonthTrainingCount = async function(year, month) {
  const TrainingEvaluation = require('./TrainingEvaluation');
  
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  const count = await TrainingEvaluation.countDocuments({
    studentId: this._id,
    attendance: 'Hadir',
    trainingDate: {
      $gte: startDate,
      $lte: endDate
    }
  });
  
  console.log(`✅ Training count for ${this.fullName} ${year}-${month}: ${count}`);
  return count;
};

/**
 * ✅ Get training progress (bulan ini vs total vs carryover)
 */
studentSchema.methods.getTrainingProgress = async function() {
  const TrainingEvaluation = require('./TrainingEvaluation');
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  // Count bulan ini
  const startDate = new Date(currentYear, currentMonth, 1);
  const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
  
  const monthCount = await TrainingEvaluation.countDocuments({
    studentId: this._id,
    attendance: 'Hadir',
    trainingDate: {
      $gte: startDate,
      $lte: endDate
    }
  });
  
  // Total semua
  const totalCount = await TrainingEvaluation.countDocuments({
    studentId: this._id,
    attendance: 'Hadir'
  });
  
  // Carry over
  const carryOver = totalCount - monthCount;
  
  const progress = {
    monthCount,
    totalCount,
    carryOver,
    message: `${monthCount} bulan ini, ${carryOver} dari bulan lalu = ${totalCount} total`
  };
  
  console.log(`✅ Progress for ${this.fullName}:`, progress);
  return progress;
};

/**
 * ✅ Get total payment dari Payment collection
 */
studentSchema.methods.getTotalPayment = async function() {
  const Payment = require('./Payment');
  
  const result = await Payment.aggregate([
    {
      $match: { studentId: this._id }
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);
  
  const total = result.length > 0 ? result[0].totalAmount : 0;
  console.log(`✅ Total payment for ${this.fullName}: Rp ${total}`);
  return total;
};

/**
 * ✅ Get payment count dari Payment collection
 */
studentSchema.methods.getPaymentCount = async function() {
  const Payment = require('./Payment');
  
  const count = await Payment.countDocuments({
    studentId: this._id
  });
  
  console.log(`✅ Payment count for ${this.fullName}: ${count}`);
  return count;
};

/**
 * ✅ Get program info
 */
studentSchema.methods.getProgramInfo = function() {
  const programs = {
    private: {
      type: 'Private Training - 1 Siswa (1-on-1)',
      label: '🧑 Private',
      participants: '1 Siswa',
      priceRange: 'Mulai dari 500 ribu'
    },
    semiPrivate: {
      type: 'Semi Private Training - 2-3 Siswa',
      label: '👥 Semi Private',
      participants: '2-3 Siswa',
      priceRange: 'Mulai dari 750 ribu'
    },
    group: {
      type: 'Group Class - 4-5 Siswa',
      label: '👨‍👩‍👧‍👦 Group',
      participants: '4-5 Siswa',
      priceRange: 'Mulai dari 1.2 juta'
    }
  };

  return programs[this.programType] || {};
};

/**
 * ✅ Get program category label
 */
studentSchema.methods.getCategoryLabel = function() {
  const categories = {
    'Aquatike': '🐠 Aquatike',
    'Beginner': '🏊 Beginner',
    'Teen & Adult': '👨 Teen & Adult',
    'Therapy': '🏥 Therapy',
    'Preschool': '🧒 Preschool'
  };
  
  return categories[this.programCategory] || this.programCategory;
};

/**
 * ✅ Get status label
 */
studentSchema.methods.getStatusLabel = function() {
  const statuses = {
    'Aktif': '✅ Aktif',
    'Non-Aktif': '❌ Non-Aktif',
    'Cuti': '⏸️ Cuti'
  };
  
  return statuses[this.status] || this.status;
};

// ==================== STATIC METHODS ====================

/**
 * ✅ Get students by payment status
 */
studentSchema.statics.getByPaymentStatus = async function(status) {
  return this.find({
    status: 'Aktif',
    paymentStatus: status
  }).sort({ registrationDate: -1 });
};

/**
 * ✅ Get students by program type
 */
studentSchema.statics.getByProgramType = async function(programType) {
  return this.find({
    status: 'Aktif',
    programType: programType
  }).sort({ registrationDate: -1 });
};

/**
 * ✅ Get students by training day
 */
studentSchema.statics.getByTrainingDay = async function(trainingDay) {
  return this.find({
    status: 'Aktif',
    trainingDay: trainingDay
  }).sort({ fullName: 1 });
};

/**
 * ✅ Get students by training day and program
 */
studentSchema.statics.getByDayAndProgram = async function(trainingDay, programType) {
  return this.find({
    status: 'Aktif',
    trainingDay,
    programType
  }).sort({ fullName: 1 });
};

/**
 * ✅ Get statistics
 */
studentSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $match: { status: 'Aktif' }
    },
    {
      $group: {
        _id: null,
        totalActive: { $sum: 1 },
        byPaymentStatus: {
          $push: {
            status: '$paymentStatus',
            count: 1
          }
        },
        byProgram: {
          $push: {
            program: '$programType',
            count: 1
          }
        },
        byCategory: {
          $push: {
            category: '$programCategory',
            count: 1
          }
        },
        byDay: {
          $push: {
            day: '$trainingDay',
            count: 1
          }
        }
      }
    },
    {
      $facet: {
        summary: [
          {
            $project: {
              totalActive: 1,
              totalByPaymentStatus: { $size: '$byPaymentStatus' },
              totalByProgram: { $size: '$byProgram' }
            }
          }
        ],
        details: [
          {
            $project: {
              byPaymentStatus: '$byPaymentStatus',
              byProgram: '$byProgram',
              byCategory: '$byCategory',
              byDay: '$byDay'
            }
          }
        ]
      }
    }
  ]);

  return stats[0] || { summary: [], details: [] };
};

/**
 * ✅ Search students
 */
studentSchema.statics.searchStudents = async function(query) {
  return this.find({
    $or: [
      { fullName: { $regex: query, $options: 'i' } },
      { studentId: { $regex: query, $options: 'i' } },
      { phone: { $regex: query, $options: 'i' } },
      { parentName: { $regex: query, $options: 'i' } }
    ]
  }).sort({ fullName: 1 });
};

/**
 * ✅ Get students with overdue payment
 */
studentSchema.statics.getOverduePayments = async function(daysOverdue = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOverdue);

  return this.find({
    status: 'Aktif',
    paymentStatus: { $in: ['Belum Bayar', 'Cicilan'] },
    registrationDate: { $lt: cutoffDate }
  }).sort({ registrationDate: 1 });
};

/**
 * ✅ Get students by status
 */
studentSchema.statics.getByStatus = async function(status) {
  return this.find({ status }).sort({ fullName: 1 });
};

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
