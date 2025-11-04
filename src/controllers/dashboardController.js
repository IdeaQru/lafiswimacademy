// backend/src/controllers/dashboardController.js

const Student = require('../models/Student');
const Coach = require('../models/Coach');
const Payment = require('../models/Payment');
const Schedule = require('../models/Schedule');

/**
 * ✅ Get dashboard statistics dengan debugging
 * @route   GET /api/dashboard/stats
 * @access  Public
 */
exports.getDashboardStats = async (req, res) => {
  try {
    console.log('═══════════════════════════════════════════');
    console.log('📊 DASHBOARD STATS REQUEST');
    console.log('═══════════════════════════════════════════');

    const { startDate, endDate } = req.query;
    
    console.log('📅 Query params:', { startDate, endDate });

    // Date range for current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    console.log('📅 Current month:', {
      start: monthStart.toISOString(),
      end: monthEnd.toISOString()
    });

    // Date range for previous month
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    console.log('📅 Previous month:', {
      start: prevMonthStart.toISOString(),
      end: prevMonthEnd.toISOString()
    });

    // ==================== STUDENTS ====================
    console.log('\n👤 STUDENTS STATS');
    const totalStudents = await Student.countDocuments();
    const activeStudents = await Student.countDocuments({ status: 'Aktif' });

    console.log(`   Total: ${totalStudents}`);
    console.log(`   Active: ${activeStudents}`);

    const prevMonthStudents = await Student.countDocuments({
      registrationDate: { $lte: prevMonthEnd }
    });

    const studentGrowth = prevMonthStudents > 0 
      ? Math.round(((totalStudents - prevMonthStudents) / prevMonthStudents) * 100)
      : 0;

    console.log(`   Growth: ${studentGrowth}%`);

    // ==================== COACHES ====================
    console.log('\n👨‍🏫 COACHES STATS');
    const totalCoaches = await Coach.countDocuments({ status: 'Aktif' });
    console.log(`   Active Coaches: ${totalCoaches}`);

    // ==================== CLASSES ====================
    console.log('\n📅 CLASSES STATS');
    const totalClasses = await Schedule.countDocuments({
      date: { $gte: monthStart, $lte: monthEnd },
      status: 'completed'
    });
    console.log(`   Completed Classes: ${totalClasses}`);

    // ==================== PAYMENTS - DEBUG ====================
    console.log('\n💳 PAYMENTS STATS (DEBUG)');

    // ✅ First, check ALL payments to see what's in DB
    console.log('\n   📋 All payments count:');
    const allPaymentsCount = await Payment.countDocuments();
    console.log(`      Total: ${allPaymentsCount}`);

    // Check sample payment to see structure
    const samplePayment = await Payment.findOne().lean();
    if (samplePayment) {
      console.log(`      Sample payment:`, JSON.stringify(samplePayment, null, 2));
    } else {
      console.log('      ⚠️ No payments found in DB');
    }

    // ✅ Current month revenue
    console.log('\n   📊 Current month payments:');
    const monthlyPaymentsQuery = {
      paymentDate: { $gte: monthStart, $lte: monthEnd }
    };
    
    console.log(`      Query:`, JSON.stringify(monthlyPaymentsQuery, null, 2));

    const monthlyPaymentsDocs = await Payment.find(monthlyPaymentsQuery).lean();
    console.log(`      Found: ${monthlyPaymentsDocs.length} payments`);

    if (monthlyPaymentsDocs.length > 0) {
      monthlyPaymentsDocs.forEach((p, i) => {
        console.log(`         [${i}] Amount: ${p.amount}, Status: ${p.status}, Date: ${p.paymentDate}`);
      });
    }

    const monthlyRevenue = monthlyPaymentsDocs.reduce((sum, p) => sum + (p.amount || 0), 0);
    console.log(`      💰 Total Revenue This Month: Rp ${monthlyRevenue.toLocaleString('id-ID')}`);

    // ✅ Previous month revenue
    console.log('\n   📊 Previous month payments:');
    const prevMonthPaymentsDocs = await Payment.find({
      paymentDate: { $gte: prevMonthStart, $lte: prevMonthEnd }
    }).lean();

    console.log(`      Found: ${prevMonthPaymentsDocs.length} payments`);
    
    const prevMonthRevenue = prevMonthPaymentsDocs.reduce((sum, p) => sum + (p.amount || 0), 0);
    console.log(`      💰 Total Revenue Previous Month: Rp ${prevMonthRevenue.toLocaleString('id-ID')}`);

    const revenueGrowth = prevMonthRevenue > 0
      ? Math.round(((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100)
      : 0;

    console.log(`      📈 Growth: ${revenueGrowth}%`);

    // ==================== RECENT ACTIVITIES ====================
    console.log('\n📋 RECENT ACTIVITIES');
    const recentActivities = await getRecentActivities();
    console.log(`      Found: ${recentActivities.length} activities`);

    console.log('\n═══════════════════════════════════════════');
    console.log('✅ DASHBOARD STATS COMPLETE');
    console.log('═══════════════════════════════════════════\n');

    const data = {
      totalStudents,
      activeStudents,
      totalCoaches,
      totalClasses,
      monthlyRevenue,
      revenueGrowth,
      studentGrowth,
      recentActivities,
      // ✅ Add debug info
      _debug: {
        currentMonth: {
          start: monthStart.toISOString(),
          end: monthEnd.toISOString()
        },
        totalPayments: allPaymentsCount,
        paymentsThisMonth: monthlyPaymentsDocs.length,
        paymentsPreviousMonth: prevMonthPaymentsDocs.length
      }
    };

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack
    });
  }
};

// Helper: Get recent activities
async function getRecentActivities() {
  const activities = [];

  try {
    // Get recent students (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const recentStudents = await Student.find({
      registrationDate: { $gte: sevenDaysAgo }
    })
      .sort({ registrationDate: -1 })
      .limit(3)
      .lean();

    recentStudents.forEach(student => {
      activities.push({
        icon: '👤',
        title: 'Siswa Baru Terdaftar',
        description: `${student.fullName}`,
        time: getRelativeTime(student.registrationDate),
        type: 'student'
      });
    });

    // Get recent payments (last 7 days)
    const recentPayments = await Payment.find({
      paymentDate: { $gte: sevenDaysAgo }
    })
      .populate('studentId', 'fullName')
      .sort({ paymentDate: -1 })
      .limit(3)
      .lean();

    recentPayments.forEach(payment => {
      const studentName = payment.studentId?.fullName || 'N/A';
      activities.push({
        icon: '💳',
        title: 'Pembayaran Diterima',
        description: `Rp ${(payment.amount || 0).toLocaleString('id-ID')} - ${studentName}`,
        time: getRelativeTime(payment.paymentDate),
        type: 'payment'
      });
    });

    // Get recent schedules (last 7 days)
    const recentSchedules = await Schedule.find({
      createdAt: { $gte: sevenDaysAgo }
    })
      .sort({ createdAt: -1 })
      .limit(2)
      .lean();

    recentSchedules.forEach(schedule => {
      activities.push({
        icon: '📅',
        title: 'Jadwal Baru',
        description: `${schedule.classLevel || 'N/A'} - ${schedule.location || 'N/A'}`,
        time: getRelativeTime(schedule.createdAt),
        type: 'schedule'
      });
    });

    // Sort by most recent
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
