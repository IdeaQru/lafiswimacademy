const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student ID is required']
  },
  studentName: {
    type: String,
    required: true,
    trim: true
  },
  month: {
    type: String,
    required: [true, 'Payment month is required'],
    match: [/^\d{4}-\d{2}$/, 'Month must be in format YYYY-MM (e.g., 2025-10)']
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  paymentDate: {
    type: Date,
    required: [true, 'Payment date is required'],
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  status: {
    type: String,
    enum: ['Paid', 'Late'],
    default: 'Paid'
  },
  method: {
    type: String,
    enum: ['Cash', 'Transfer'],
    default: 'Cash'
  },
  notes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: String,
    default: 'Admin'
  }
}, {
  timestamps: true
});

// ==================== INDEXES ====================

paymentSchema.index({ studentId: 1 });
paymentSchema.index({ month: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ paymentDate: -1 });
paymentSchema.index({ studentId: 1, month: 1 }, { unique: true }); // Prevent duplicate payments for same month

// ==================== PRE-SAVE HOOK ====================

// Auto-set status based on payment date vs due date
paymentSchema.pre('save', function(next) {
  if (this.paymentDate && this.dueDate) {
    const payDate = new Date(this.paymentDate);
    const due = new Date(this.dueDate);
    
    // Reset hours for comparison
    payDate.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    
    // If payment date is after due date, mark as Late
    this.status = payDate > due ? 'Late' : 'Paid';
  }
  next();
});

// ==================== STATIC METHODS ====================

// Get total revenue
paymentSchema.statics.getTotalRevenue = async function() {
  const result = await this.aggregate([
    { $match: { status: { $in: ['Paid', 'Late'] } } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  return result[0]?.total || 0;
};

// Get revenue by month
paymentSchema.statics.getRevenueByMonth = async function(year, month) {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const result = await this.aggregate([
    { $match: { month: monthStr } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  return result[0]?.total || 0;
};

// Get late payments count
paymentSchema.statics.getLatePaymentsCount = async function() {
  return this.countDocuments({ status: 'Late' });
};

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
