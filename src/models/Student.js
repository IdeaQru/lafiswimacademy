const mongoose = require('mongoose');
// models/Student.js


const studentSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: [true, 'Student ID is required'],
    unique: true,
    index: true
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
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
    match: [/^[0-9]{10,15}$/, 'Phone number must be 10-15 digits']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    default: null
  },
  address: {
    type: String,
    required: [true, 'Address is required']
  },
  emergencyContact: {
    type: String,
    required: [true, 'Emergency contact is required'],
    trim: true
  },
  emergencyPhone: {
    type: String,
    required: [true, 'Emergency phone is required'],
    match: [/^[0-9]{10,15}$/, 'Emergency phone must be 10-15 digits']
  },
  classLevel: {
    type: String,
    enum: ['Baby Swimming', 'Kids Class', 'Teen & Adult', 'Private Training', 'Competition Team'],
    required: [true, 'Class level is required']
  },
  swimmingAbility: {
    type: String,
    enum: ['Belum Bisa', 'Dasar', 'Menengah', 'Mahir'],
    required: [true, 'Swimming ability is required']
  },
  healthCondition: {
    type: String,
    default: null
  },
  allergies: {
    type: String,
    default: null
  },
  photo: {
    type: String,
    default: null
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Aktif', 'Non-Aktif', 'Cuti'],
    default: 'Aktif'
  },
  // Payment tracking
  monthlyFee: {
    type: Number,
    default: 0
  },
  paymentDueDate: {
    type: Number,
    default: 1
  },
  lastPaymentDate: {
    type: Date
  },
  nextPaymentDue: {
    type: Date
  },
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Pending', 'Overdue'],
    default: 'Pending'
  },
  monthsUnpaid: {
    type: Number,
    default: 0
  },
  totalUnpaid: {
    type: Number,
    default: 0
  },
  enableReminder: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Auto-calculate age




// ==================== PRE-SAVE HOOKS ====================

// Calculate age before saving
studentSchema.pre('save', function(next) {
  if (this.dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    this.age = age;
  }
  next();
});

// Auto-update payment status and handle month changes
studentSchema.pre('save', function(next) {
  if (this.status === 'Aktif' && this.monthlyFee > 0) {
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    
    // Initialize currentMonthPayment if not exists
    if (!this.currentMonthPayment || !this.currentMonthPayment.month) {
      this.currentMonthPayment = {
        month: currentMonth,
        status: 'Pending',
        paidDate: null,
        amount: 0
      };
    }
    
    // Check if month has changed
    if (this.currentMonthPayment.month !== currentMonth) {
      console.log(`📅 Month changed for ${this.fullName}: ${this.currentMonthPayment.month} → ${currentMonth}`);
      
      // Check if last month was paid
      if (this.currentMonthPayment.status !== 'Paid') {
        // Last month was not paid - add to unpaid count
        this.monthsUnpaid = (this.monthsUnpaid || 0) + 1;
        this.totalUnpaid = this.monthlyFee * this.monthsUnpaid;
        console.log(`⚠️ ${this.fullName} - Added unpaid month. Total: ${this.monthsUnpaid} months`);
      }
      
      // Reset for new month
      this.currentMonthPayment = {
        month: currentMonth,
        status: 'Pending',
        paidDate: null,
        amount: 0
      };
    }
    
    // Update status based on due date (only if not paid)
    if (this.paymentDueDate && this.currentMonthPayment.status !== 'Paid') {
      const dueDate = new Date(today.getFullYear(), today.getMonth(), this.paymentDueDate);
      dueDate.setHours(23, 59, 59, 999);
      
      if (today > dueDate) {
        this.currentMonthPayment.status = 'Overdue';
        this.paymentStatus = 'Overdue';
        
        // Ensure at least 1 month unpaid if overdue
        if (this.monthsUnpaid === 0) {
          this.monthsUnpaid = 1;
          this.totalUnpaid = this.monthlyFee;
        }
      } else {
        this.currentMonthPayment.status = 'Pending';
        this.paymentStatus = 'Pending';
      }
    }
    
    // Calculate next payment due if not set
    if (!this.nextPaymentDue && this.paymentDueDate) {
      const nextDue = new Date(today.getFullYear(), today.getMonth(), this.paymentDueDate);
      if (nextDue < today) {
        nextDue.setMonth(nextDue.getMonth() + 1);
      }
      this.nextPaymentDue = nextDue;
    }
  }
  
  next();
});

// ==================== INDEXES ====================
// Add these indexes at the end of Student schema
studentSchema.index({ registrationDate: 1 });
studentSchema.index({ status: 1 });
studentSchema.index({ classLevel: 1 });
studentSchema.index({ swimmingAbility: 1 });
studentSchema.index({ gender: 1 });
studentSchema.index({ paymentStatus: 1 });
studentSchema.index({ age: 1 });

// Compound index for reports
studentSchema.index({ registrationDate: 1, status: 1 });
studentSchema.index({ status: 1, paymentStatus: 1 });

// Existing indexes
studentSchema.index({ studentId: 1 });
studentSchema.index({ fullName: 1 });
studentSchema.index({ status: 1 });
studentSchema.index({ classLevel: 1 });

// Payment-related indexes
studentSchema.index({ paymentStatus: 1 });
studentSchema.index({ nextPaymentDue: 1 });
studentSchema.index({ 
  status: 1, 
  paymentStatus: 1, 
  nextPaymentDue: 1 
});

// Current month payment indexes
studentSchema.index({ 'currentMonthPayment.month': 1 });
studentSchema.index({ 'currentMonthPayment.status': 1 });
studentSchema.index({ 
  status: 1, 
  'currentMonthPayment.month': 1, 
  'currentMonthPayment.status': 1 
});

// ==================== INSTANCE METHODS ====================

// Mark current month as paid
studentSchema.methods.markCurrentMonthPaid = function(amount, paymentDate = new Date()) {
  const today = paymentDate;
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  
  this.currentMonthPayment = {
    month: currentMonth,
    status: 'Paid',
    paidDate: paymentDate,
    amount: amount
  };
  
  this.lastPaymentDate = paymentDate;
  this.paymentStatus = 'Paid';
  
  // Calculate next payment due
  const nextDue = new Date(paymentDate);
  nextDue.setMonth(nextDue.getMonth() + 1);
  nextDue.setDate(this.paymentDueDate || 10);
  this.nextPaymentDue = nextDue;
  
  // Reduce unpaid count if paying current month
  if (this.monthsUnpaid > 0) {
    this.monthsUnpaid--;
    this.totalUnpaid = this.monthlyFee * this.monthsUnpaid;
  }
  
  console.log(`✅ ${this.fullName} - Payment marked for ${currentMonth}`);
};

// Update payment status (called by cron or manually)
studentSchema.methods.updatePaymentStatus = function() {
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  
  // Check if month changed
  if (!this.currentMonthPayment || this.currentMonthPayment.month !== currentMonth) {
    // Month changed - check last month status
    if (this.currentMonthPayment && this.currentMonthPayment.status !== 'Paid') {
      this.monthsUnpaid = (this.monthsUnpaid || 0) + 1;
      this.totalUnpaid = this.monthlyFee * this.monthsUnpaid;
    }
    
    // Reset for new month
    this.currentMonthPayment = {
      month: currentMonth,
      status: 'Pending',
      paidDate: null,
      amount: 0
    };
  }
  
  // Check if overdue this month
  if (this.currentMonthPayment.status !== 'Paid' && this.paymentDueDate) {
    const dueDate = new Date(today.getFullYear(), today.getMonth(), this.paymentDueDate);
    dueDate.setHours(23, 59, 59, 999);
    
    if (today > dueDate) {
      this.currentMonthPayment.status = 'Overdue';
      this.paymentStatus = 'Overdue';
      
      if (this.monthsUnpaid === 0) {
        this.monthsUnpaid = 1;
        this.totalUnpaid = this.monthlyFee;
      }
    }
  }
};

// Legacy method - kept for backward compatibility
studentSchema.methods.markAsPaid = function(paymentDate = new Date()) {
  this.markCurrentMonthPaid(this.monthlyFee, paymentDate);
};

// ==================== STATIC METHODS ====================

// Get students with overdue payments for current month
studentSchema.statics.getOverduePayments = async function() {
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  
  return this.find({
    status: 'Aktif',
    monthlyFee: { $gt: 0 },
    $or: [
      {
        'currentMonthPayment.month': currentMonth,
        'currentMonthPayment.status': 'Overdue'
      },
      {
        'currentMonthPayment.month': { $ne: currentMonth }
      },
      {
        paymentStatus: 'Overdue'
      }
    ]
  }).sort({ 'currentMonthPayment.status': 1, nextPaymentDue: 1 });
};

// Get students with upcoming payments (next 3 days)
studentSchema.statics.getUpcomingPayments = async function(days = 3) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + days);
  futureDate.setHours(23, 59, 59, 999);

  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  return this.find({
    status: 'Aktif',
    monthlyFee: { $gt: 0 },
    'currentMonthPayment.month': currentMonth,
    'currentMonthPayment.status': { $in: ['Pending', null] },
    nextPaymentDue: {
      $gte: today,
      $lte: futureDate
    }
  }).sort({ nextPaymentDue: 1 });
};

// Reset payment status for new month (called by cron job)
studentSchema.statics.resetForNewMonth = async function() {
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  
  console.log(`🔄 Resetting payment status for month: ${currentMonth}`);
  
  const students = await this.find({
    status: 'Aktif',
    monthlyFee: { $gt: 0 },
    $or: [
      { 'currentMonthPayment.month': { $ne: currentMonth } },
      { 'currentMonthPayment': { $exists: false } }
    ]
  });
  
  let updatedCount = 0;
  
  for (const student of students) {
    const oldMonth = student.currentMonthPayment?.month || 'none';
    
    // Check if last month was paid
    if (student.currentMonthPayment && student.currentMonthPayment.status !== 'Paid') {
      student.monthsUnpaid = (student.monthsUnpaid || 0) + 1;
      student.totalUnpaid = student.monthlyFee * student.monthsUnpaid;
      console.log(`⚠️ ${student.fullName} - Unpaid ${oldMonth}, total unpaid: ${student.monthsUnpaid}`);
    }
    
    // Reset for new month
    student.currentMonthPayment = {
      month: currentMonth,
      status: 'Pending',
      paidDate: null,
      amount: 0
    };
    
    student.paymentStatus = 'Pending';
    
    // Update next payment due
    const nextDue = new Date(today.getFullYear(), today.getMonth(), student.paymentDueDate || 10);
    if (nextDue < today) {
      nextDue.setMonth(nextDue.getMonth() + 1);
    }
    student.nextPaymentDue = nextDue;
    
    await student.save();
    updatedCount++;
  }
  
  console.log(`✅ Updated ${updatedCount} students for month ${currentMonth}`);
  return updatedCount;
};

// Update all students payment status (called daily)
studentSchema.statics.updateAllPaymentStatuses = async function() {
  const students = await this.find({
    status: 'Aktif',
    monthlyFee: { $gt: 0 }
  });

  let updatedCount = 0;

  for (const student of students) {
    student.updatePaymentStatus();
    await student.save();
    updatedCount++;
  }

  console.log(`✅ Updated payment status for ${updatedCount} students`);
  return updatedCount;
};

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
