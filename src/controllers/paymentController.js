// backend/src/controllers/paymentController.js

const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Student = require('../models/Student');

// ==================== CREATE PAYMENT ====================

/**
 * ✅ Create new payment
 * @route   POST /api/payments
 * @access  Public
 */
// backend/src/controllers/paymentController.js

exports.createPayment = async (req, res) => {
  try {
    console.log('💳 Creating payment:', req.body);
    
    const { studentId, amount, paymentDate, method, notes } = req.body;

    console.log('📦 Parsed fields:', { 
      studentId, 
      amount: typeof amount, 
      paymentDate, 
      method,
      notes 
    });

    // ✅ Validation
    if (!studentId) {
      console.warn('⚠️ Missing studentId');
      return res.status(400).json({
        success: false,
        message: 'Student ID is required'
      });
    }

    if (!amount || amount <= 0) {
      console.warn('⚠️ Invalid amount:', amount);
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }

    if (!paymentDate) {
      console.warn('⚠️ Missing paymentDate');
      return res.status(400).json({
        success: false,
        message: 'Payment date is required'
      });
    }

    console.log('✅ Basic validation passed');

    // ✅ Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      console.warn('⚠️ Invalid studentId format:', studentId);
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID format'
      });
    }

    // ✅ Find student
    console.log('🔍 Finding student:', studentId);
    const student = await Student.findById(studentId);
    
    if (!student) {
      console.warn('⚠️ Student not found:', studentId);
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    console.log('✅ Student found:', student.fullName);

    // ✅ Parse paymentDate
    const parsedDate = new Date(paymentDate);
    if (isNaN(parsedDate.getTime())) {
      console.warn('⚠️ Invalid payment date:', paymentDate);
      return res.status(400).json({
        success: false,
        message: 'Invalid payment date format'
      });
    }

    console.log('✅ Payment date valid:', parsedDate);

    // ✅ Create payment
    console.log('💾 Creating payment record...');
    const payment = new Payment({
      studentId: new mongoose.Types.ObjectId(studentId),
      amount: parseFloat(amount),
      paymentDate: parsedDate,
      method: method || 'Transfer',
      notes: notes || '',
      createdBy: req.user?._id
    });

    await payment.save();
    await payment.populate('studentId', 'studentId fullName phone');

    console.log('✅ Payment created successfully:', payment._id);

    res.status(201).json({
      success: true,
      message: 'Pembayaran berhasil dicatat',
      data: payment
    });

  } catch (error) {
    console.error('❌ ERROR in createPayment:', error.message);
    console.error('❌ Full error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      console.error('❌ Validation errors:', messages);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }

    if (error.code === 11000) {
      console.error('❌ Duplicate key error');
      return res.status(400).json({
        success: false,
        message: 'Pembayaran duplikat terdeteksi'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating payment',
      error: error.message
    });
  }
};


// ==================== GET ALL PAYMENTS ====================

/**
 * ✅ Get all payments (dengan filter optional)
 * @route   GET /api/payments
 * @route   GET /api/payments?studentId=xxx&startDate=2025-01-01&endDate=2025-01-31
 * @access  Public
 */
exports.getAllPayments = async (req, res) => {
  try {
    console.log('📋 Fetching all payments...');
    console.log('📋 Query params:', req.query);
    
    const { studentId, startDate, endDate, page = 1, limit = 50 } = req.query;
    
    let query = {};
    
    // ✅ Filter by studentId jika ada
    if (studentId) {
      console.log('🔍 Filtering by studentId:', studentId);
      
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid student ID'
        });
      }
      
      query.studentId = new mongoose.Types.ObjectId(studentId);
    }
    
    // ✅ Filter by date range
    if (startDate && endDate) {
      console.log('🔍 Filtering by date range:', { startDate, endDate });
      query.paymentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (startDate) {
      query.paymentDate = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.paymentDate = { $lte: new Date(endDate) };
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // ✅ Query dengan populate dan sort
    const payments = await Payment.find(query)
      .populate('studentId', 'studentId fullName phone')
      .sort({ paymentDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Payment.countDocuments(query);

    console.log(`✅ Found ${payments.length} payments out of ${total} total`);

    res.status(200).json({
      success: true,
      count: payments.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: payments
    });
  } catch (error) {
    console.error('❌ Error getting payments:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving payments',
      error: error.message
    });
  }
};

// ==================== GET SINGLE PAYMENT ====================

/**
 * ✅ Get single payment by ID
 * @route   GET /api/payments/:id
 * @access  Public
 */
exports.getPaymentById = async (req, res) => {
  try {
    console.log('📋 Fetching payment:', req.params.id);

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment ID'
      });
    }

    const payment = await Payment.findById(req.params.id)
      .populate('studentId', 'studentId fullName phone');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    console.log('✅ Payment found:', payment._id);

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('❌ Error getting payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving payment',
      error: error.message
    });
  }
};

// ==================== GET PAYMENT STATISTICS ====================

/**
 * ✅ Get payment statistics
 * @route   GET /api/payments/stats
 * @access  Public
 */
exports.getPaymentStats = async (req, res) => {
  try {
    console.log('📊 Fetching payment statistics...');

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // ✅ Get total paid
    const totalPaidResult = await Payment.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // ✅ Get current month revenue
    const monthlyRevenueResult = await Payment.aggregate([
      { 
        $match: { 
          paymentDate: {
            $gte: currentMonthStart,
            $lte: currentMonthEnd
          }
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // ✅ Get payments by method
    const paymentsByMethod = await Payment.aggregate([
      {
        $group: {
          _id: '$method',
          count: { $sum: 1 },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // ✅ Get payments by month (last 12 months)
    const paymentsByMonth = await Payment.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$paymentDate' },
            month: { $month: '$paymentDate' }
          },
          count: { $sum: 1 },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    // ✅ Get total students paid
    const totalStudentsPaid = await Payment.distinct('studentId');

    console.log('✅ Statistics calculated');

    res.status(200).json({
      success: true,
      data: {
        totalPaid: totalPaidResult[0]?.total || 0,
        thisMonthRevenue: monthlyRevenueResult[0]?.total || 0,
        currentMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        totalStudentsPaid: totalStudentsPaid.length,
        totalTransactions: await Payment.countDocuments(),
        paymentsByMethod,
        paymentsByMonth
      }
    });
  } catch (error) {
    console.error('❌ Error getting payment stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving payment statistics',
      error: error.message
    });
  }
};

// ==================== GET MONTHLY REVENUE ====================

/**
 * ✅ Get revenue for specific month
 * @route   GET /api/payments/revenue/:year/:month
 * @access  Public
 */
exports.getMonthlyRevenue = async (req, res) => {
  try {
    const { year, month } = req.params;

    console.log(`💰 Getting revenue for ${year}-${month}`);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const revenueResult = await Payment.aggregate([
      { 
        $match: { 
          paymentDate: {
            $gte: startDate,
            $lte: endDate
          }
        } 
      },
      { 
        $group: { 
          _id: null, 
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        } 
      }
    ]);

    const revenue = revenueResult[0] || { total: 0, count: 0 };

    console.log('✅ Revenue calculated:', revenue);

    res.status(200).json({
      success: true,
      year: parseInt(year),
      month: parseInt(month),
      data: {
        totalRevenue: revenue.total,
        paymentCount: revenue.count
      }
    });
  } catch (error) {
    console.error('❌ Error getting monthly revenue:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving revenue',
      error: error.message
    });
  }
};

// ==================== UPDATE PAYMENT ====================

/**
 * ✅ Update payment
 * @route   PUT /api/payments/:id
 * @access  Public
 */
exports.updatePayment = async (req, res) => {
  try {
    console.log('✏️ Updating payment:', req.params.id);
    console.log('📦 Update data:', req.body);

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment ID'
      });
    }

    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    const { amount, paymentDate, method, notes } = req.body;

    // ✅ Update fields
    if (amount) payment.amount = parseFloat(amount);
    if (paymentDate) payment.paymentDate = new Date(paymentDate);
    if (method) payment.method = method;
    if (notes !== undefined) payment.notes = notes;

    await payment.save();
    await payment.populate('studentId', 'studentId fullName phone');

    console.log('✅ Payment updated:', payment._id);

    res.status(200).json({
      success: true,
      message: 'Payment updated successfully',
      data: payment
    });
  } catch (error) {
    console.error('❌ Error updating payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating payment',
      error: error.message
    });
  }
};

// ==================== DELETE PAYMENT ====================

/**
 * ✅ Delete payment
 * @route   DELETE /api/payments/:id
 * @access  Public
 */
exports.deletePayment = async (req, res) => {
  try {
    console.log('🗑️ Deleting payment:', req.params.id);

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment ID'
      });
    }

    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      console.warn('⚠️ Payment not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    await Payment.findByIdAndDelete(req.params.id);

    console.log('✅ Payment deleted:', req.params.id);

    res.status(200).json({
      success: true,
      message: 'Payment deleted successfully',
      data: {}
    });
  } catch (error) {
    console.error('❌ Error deleting payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting payment',
      error: error.message
    });
  }
};
