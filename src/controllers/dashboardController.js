// controllers/dashboardController.js

const Student = require('../models/Student');
const Coach = require('../models/Coach');
const Payment = require('../models/Payment');
const Schedule = require('../models/Schedule');

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Public
exports.getDashboardStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    console.log('📊 Dashboard stats request:', { startDate, endDate });

    // Date range for current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Date range for previous month (for growth calculation)
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get total students
    const totalStudents = await Student.countDocuments();
    const activeStudents = await Student.countDocuments({ status: 'Aktif' });

    // Get students from previous month for growth calculation
    const prevMonthStudents = await Student.countDocuments({
      registrationDate: { $lte: prevMonthEnd }
    });

    const studentGrowth = prevMonthStudents > 0 
      ? Math.round(((totalStudents - prevMonthStudents) / prevMonthStudents) * 100)
      : 0;

    // Get total coaches
    const totalCoaches = await Coach.countDocuments({ status: 'Aktif' });

    // Get total classes (completed schedules in current month)
    const totalClasses = await Schedule.countDocuments({
      date: { $gte: monthStart, $lte: monthEnd },
      status: 'completed'
    });

    // Get monthly revenue
    const monthlyPayments = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: monthStart, $lte: monthEnd },
          status: 'Paid'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const monthlyRevenue = monthlyPayments.length > 0 ? monthlyPayments[0].total : 0;

    // Get previous month revenue for growth calculation
    const prevMonthPayments = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: prevMonthStart, $lte: prevMonthEnd },
          status: 'Paid'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const prevMonthRevenue = prevMonthPayments.length > 0 ? prevMonthPayments[0].total : 0;

    const revenueGrowth = prevMonthRevenue > 0
      ? Math.round(((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100)
      : 0;

    // Get recent activities
    const recentActivities = await getRecentActivities();

    const data = {
      totalStudents,
      activeStudents,
      totalCoaches,
      totalClasses,
      monthlyRevenue,
      revenueGrowth,
      studentGrowth,
      recentActivities
    };

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Helper: Get recent activities
async function getRecentActivities() {
  const activities = [];

  try {
    // Get recent students (last 7 days)
    const recentStudents = await Student.find({
      registrationDate: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    })
      .sort({ registrationDate: -1 })
      .limit(3)
      .lean();

    recentStudents.forEach(student => {
      activities.push({
        icon: '👤',
        title: 'Siswa Baru Terdaftar',
        description: `${student.fullName} - ${student.classLevel}`,
        time: getRelativeTime(student.registrationDate),
        type: 'student'
      });
    });

    // Get recent payments (last 7 days)
    const recentPayments = await Payment.find({
      paymentDate: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    })
      .populate('studentId', 'fullName')
      .sort({ paymentDate: -1 })
      .limit(3)
      .lean();

    recentPayments.forEach(payment => {
      activities.push({
        icon: '💳',
        title: 'Pembayaran Diterima',
        description: `Rp ${payment.amount.toLocaleString('id-ID')} - ${payment.studentName || payment.studentId?.fullName}`,
        time: getRelativeTime(payment.paymentDate),
        type: 'payment'
      });
    });

    // Get recent schedules (last 7 days)
    const recentSchedules = await Schedule.find({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    })
      .sort({ createdAt: -1 })
      .limit(2)
      .lean();

    recentSchedules.forEach(schedule => {
      activities.push({
        icon: '📅',
        title: 'Jadwal Baru',
        description: `${schedule.program} - ${schedule.location}`,
        time: getRelativeTime(schedule.createdAt),
        type: 'schedule'
      });
    });

    // Sort by most recent and limit to 5
    activities.sort((a, b) => {
      const timeA = parseRelativeTime(a.time);
      const timeB = parseRelativeTime(b.time);
      return timeA - timeB;
    });

    return activities.slice(0, 5);
  } catch (error) {
    console.error('Error getting recent activities:', error);
    return [];
  }
}

// Helper: Get relative time
function getRelativeTime(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) {
    return `${minutes} menit yang lalu`;
  } else if (hours < 24) {
    return `${hours} jam yang lalu`;
  } else if (days === 1) {
    return 'Kemarin';
  } else {
    return `${days} hari yang lalu`;
  }
}

// Helper: Parse relative time for sorting
function parseRelativeTime(timeStr) {
  if (timeStr.includes('menit')) {
    return parseInt(timeStr);
  } else if (timeStr.includes('jam')) {
    return parseInt(timeStr) * 60;
  } else if (timeStr === 'Kemarin') {
    return 24 * 60;
  } else if (timeStr.includes('hari')) {
    return parseInt(timeStr) * 24 * 60;
  }
  return 0;
}
