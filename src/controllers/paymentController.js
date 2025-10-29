const Payment = require('../models/Payment');
const Student = require('../models/Student');

// @desc    Create new payment
// @route   POST /api/payments
// @access  Public
exports.createPayment = async (req, res) => {
  try {
    console.log('💳 Creating payment:', req.body);
    
    const { studentId, month, amount, paymentDate, method, notes } = req.body;

    if (!studentId || !month || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Student ID, month, and amount are required'
      });
    }

    const student = await Student.findById(studentId);
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if payment for this month already exists
    const existingPayment = await Payment.findOne({
      studentId,
      month
    });

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: `Pembayaran untuk bulan ${month} sudah ada`
      });
    }

    // Calculate due date
    const [year, monthNum] = month.split('-').map(Number);
    const dueDate = new Date(year, monthNum - 1, student.paymentDueDate || 10);

    // Create payment record
    const payment = await Payment.create({
      studentId,
      studentName: student.fullName,
      month,
      amount,
      paymentDate: paymentDate || new Date(),
      dueDate,
      method: method || 'Cash',
      notes
    });

    // Update student payment status
    const payDate = new Date(payment.paymentDate);
    const currentMonth = `${payDate.getFullYear()}-${String(payDate.getMonth() + 1).padStart(2, '0')}`;
    
    // If paying for current month
    if (month === currentMonth) {
      student.markCurrentMonthPaid(amount, payDate);
    } else {
      // Paying for past month - just update lastPaymentDate and reduce unpaid count
      student.lastPaymentDate = payDate;
      if (student.monthsUnpaid > 0) {
        student.monthsUnpaid--;
        student.totalUnpaid = student.monthlyFee * student.monthsUnpaid;
      }
    }
    
    await student.save();

    console.log('✅ Payment created:', payment._id);
    console.log('✅ Student updated:', student.fullName);

    res.status(201).json({
      success: true,
      message: 'Pembayaran berhasil dicatat',
      data: payment
    });
  } catch (error) {
    console.error('❌ Error creating payment:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Pembayaran untuk bulan ini sudah ada'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating payment',
      error: error.message
    });
  }
};

// @desc    Get all payments
// @route   GET /api/payments
// @access  Public
exports.getAllPayments = async (req, res) => {
  try {
    const { month, status } = req.query;
    
    let query = {};
    
    if (month) query.month = month;
    if (status) query.status = status;

    const payments = await Payment.find(query)
      .populate('studentId', 'studentId fullName phone')
      .sort({ paymentDate: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
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

// @desc    Get payments by student
// @route   GET /api/payments/student/:studentId
// @access  Public
exports.getPaymentsByStudent = async (req, res) => {
  try {
    console.log('📋 Getting payments for student:', req.params.studentId);
    
    const payments = await Payment.find({ 
      studentId: req.params.studentId 
    }).sort({ month: -1 });

    console.log(`✅ Found ${payments.length} payments`);

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    console.error('❌ Error getting student payments:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving student payments',
      error: error.message
    });
  }
};

// @desc    Delete payment
// @route   DELETE /api/payments/:id
// @access  Public
exports.deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    await Payment.findByIdAndDelete(req.params.id);

    // Update student payment status
    const student = await Student.findById(payment.studentId);
    if (student) {
      student.updatePaymentStatus();
      await student.save();
    }

    console.log('✅ Payment deleted:', payment._id);

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

// @desc    Get payment statistics
// @route   GET /api/payments/stats
// @access  Public
exports.getPaymentStats = async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [totalPaidResult, overdueCount, upcomingCount, monthlyRevenueResult, totalUnpaidResult] = await Promise.all([
      Payment.aggregate([
        { $match: { status: { $in: ['Paid', 'Late'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Student.countDocuments({ 
        paymentStatus: 'Overdue',
        'currentMonthPayment.status': 'Overdue'
      }),
      Student.countDocuments({
        status: 'Aktif',
        paymentStatus: 'Pending',
        'currentMonthPayment.status': 'Pending',
        nextPaymentDue: {
          $gte: now,
          $lte: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
        }
      }),
      Payment.aggregate([
        { $match: { month: currentMonth } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Student.aggregate([
        { $match: { paymentStatus: 'Overdue' } },
        { $group: { _id: null, total: { $sum: '$totalUnpaid' } } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalPaid: totalPaidResult[0]?.total || 0,
        totalUnpaid: totalUnpaidResult[0]?.total || 0,
        overdueCount,
        upcomingCount,
        thisMonthRevenue: monthlyRevenueResult[0]?.total || 0,
        currentMonth
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
