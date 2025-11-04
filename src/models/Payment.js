// backend/src/models/Payment.js

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  // ==================== STUDENT REFERENCE ====================
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student ID is required'],
    index: true
  },

  // ==================== PAYMENT DETAILS ====================
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },

  paymentDate: {
    type: Date,
    required: [true, 'Payment date is required'],
    index: true
  },

  method: {
    type: String,
    enum: ['Transfer', 'Tunai', 'Cash', 'E-Wallet'],
    default: 'Transfer'
  },

  notes: {
    type: String,
    default: ''
  },

  // ==================== AUDIT ====================
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }

}, {
  timestamps: true
});

// ==================== INDEXES ====================
paymentSchema.index({ studentId: 1 });
paymentSchema.index({ paymentDate: 1 });
paymentSchema.index({ studentId: 1, paymentDate: 1 });
paymentSchema.index({ createdAt: -1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
