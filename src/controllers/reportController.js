// controllers/reportController.js

const Student = require('../models/Student');
const Coach = require('../models/Coach');
const Payment = require('../models/Payment');
const Schedule = require('../models/Schedule');
const TrainingEvaluation = require('../models/TrainingEvaluation');

const { 
  getStudentExportData, 
  getCoachExportData, 
  getFinancialExportData,
  exportToPDFBeautiful,
  exportToExcelBeautiful 
} = require('../helpers/reportHelper');

// ==================== STUDENT REPORTS ====================

/**
 * @desc    Get students list with attendance stats
 * @route   GET /api/reports/students/list
 * @access  Public
 */
exports.getStudentsListWithStats = async (req, res) => {
  try {
    const startTime = Date.now();
    const { startDate, endDate } = req.query;

    console.log('📊 Students List Request:', { startDate, endDate });

    const students = await Student.find({ status: 'Aktif' })
      .lean()
      .select('_id studentId fullName classLevel status')
      .sort({ fullName: 1 })
      .exec();

    console.log(`Found ${students.length} active students`);

    const evalFilter = {};
    if (startDate && endDate) {
      evalFilter.trainingDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const evaluations = await TrainingEvaluation.find(evalFilter)
      .lean()
      .select('studentId attendance')
      .exec();

    console.log(`Found ${evaluations.length} evaluations`);

    const evalsByStudent = {};
    evaluations.forEach(ev => {
      const studentId = ev.studentId.toString();
      if (!evalsByStudent[studentId]) {
        evalsByStudent[studentId] = {
          total: 0,
          hadir: 0,
          tidakHadir: 0,
          izin: 0,
          sakit: 0
        };
      }
      
      evalsByStudent[studentId].total++;
      
      if (ev.attendance === 'Hadir') evalsByStudent[studentId].hadir++;
      else if (ev.attendance === 'Tidak Hadir') evalsByStudent[studentId].tidakHadir++;
      else if (ev.attendance === 'Izin') evalsByStudent[studentId].izin++;
      else if (ev.attendance === 'Sakit') evalsByStudent[studentId].sakit++;
    });

    const studentsWithStats = students.map(student => {
      const studentIdStr = student._id.toString();
      const stats = evalsByStudent[studentIdStr] || {
        total: 0,
        hadir: 0,
        tidakHadir: 0,
        izin: 0,
        sakit: 0
      };

      const attendanceRate = stats.total > 0 
        ? Math.round((stats.hadir / stats.total) * 100)
        : 0;

      return {
        _id: student._id.toString(),
        studentId: student.studentId,
        fullName: student.fullName,
        classLevel: student.classLevel,
        status: student.status,
        totalSessions: stats.total,
        hadir: stats.hadir,
        tidakHadir: stats.tidakHadir,
        izin: stats.izin,
        sakit: stats.sakit,
        attendanceRate
      };
    });

    const duration = Date.now() - startTime;
    console.log(`✅ Students list generated in ${duration}ms`);

    res.status(200).json({
      success: true,
      count: studentsWithStats.length,
      data: studentsWithStats,
      meta: { 
        duration: `${duration}ms`,
        dateRange: { startDate, endDate }
      }
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * @desc    Get individual student report
 * @route   GET /api/reports/student/:studentId
 * @access  Public
 */
exports.getStudentIndividualReport = async (req, res) => {
  try {
    const startTime = Date.now();
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;

    console.log('📊 Student Individual Report:', { studentId, startDate, endDate });

    const student = await Student.findOne({
      $or: [{ _id: studentId }, { studentId: studentId }]
    }).lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Siswa tidak ditemukan'
      });
    }

    const evalFilter = { studentId: student._id };
    if (startDate && endDate) {
      evalFilter.trainingDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const evaluations = await TrainingEvaluation.find(evalFilter)
      .populate('coachId', 'fullName specialization')
      .populate('scheduleId')
      .sort({ trainingDate: -1 })
      .lean();

    console.log(`Found ${evaluations.length} evaluations`);

    const stats = {
      totalSessions: evaluations.length,
      hadir: evaluations.filter(e => e.attendance === 'Hadir').length,
      tidakHadir: evaluations.filter(e => e.attendance === 'Tidak Hadir').length,
      izin: evaluations.filter(e => e.attendance === 'Izin').length,
      sakit: evaluations.filter(e => e.attendance === 'Sakit').length,
      attendanceRate: 0
    };

    if (evaluations.length > 0) {
      stats.attendanceRate = Math.round((stats.hadir / evaluations.length) * 100);
    }

    const history = evaluations.map(ev => {
      const schedule = ev.scheduleId;
      return {
        date: ev.trainingDate,
        time: schedule ? `${schedule.startTime} - ${schedule.endTime}` : '-',
        location: schedule?.location || '-',
        program: schedule?.program || '-',
        coachName: ev.coachId?.fullName || '-',
        coachSpecialization: ev.coachId?.specialization || '-',
        attendance: ev.attendance,
        notes: ev.notes || '-',
        createdAt: ev.createdAt
      };
    });

    const data = {
      student: {
        studentId: student.studentId,
        fullName: student.fullName,
        photo: student.photo,
        classLevel: student.classLevel,
        swimmingAbility: student.swimmingAbility,
        status: student.status,
        age: student.age,
        gender: student.gender,
        registrationDate: student.registrationDate
      },
      stats,
      history,
      period: {
        startDate: startDate || 'Awal',
        endDate: endDate || 'Sekarang'
      }
    };

    const duration = Date.now() - startTime;
    console.log(`✅ Report generated in ${duration}ms`);

    res.status(200).json({
      success: true,
      data,
      meta: { duration: `${duration}ms` }
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Search students for report
 * @route   GET /api/reports/students/search
 * @access  Public
 */
exports.searchStudentsForReport = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Query minimal 2 karakter'
      });
    }

    const students = await Student.find({
      $or: [
        { fullName: { $regex: query, $options: 'i' } },
        { studentId: { $regex: query, $options: 'i' } }
      ],
      status: 'Aktif'
    })
    .lean()
    .select('_id studentId fullName classLevel photo')
    .limit(20)
    .sort({ fullName: 1 })
    .exec();

    res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== COACH REPORT ====================

/**
 * @desc    Get coach report with auto-filter
 * @route   GET /api/reports/coaches
 * @access  Public
 * @query   startDate, endDate, coachId (optional)
 */
exports.getCoachReport = async (req, res) => {
  try {
    const startTime = Date.now();
    const { startDate, endDate, coachId } = req.query;

    console.log('📊 Coach Report Request:', { startDate, endDate, coachId });

    const scheduleFilter = {};
    
    if (startDate && endDate) {
      scheduleFilter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Coach filter
    if (coachId) {
      const coach = await Coach.findOne({ _id: coachId }).lean();
      if (coach) {
        scheduleFilter.coachId = coach._id;
        console.log(`🔍 Filtering for coach: ${coach.fullName}`);
      }
    }

    const schedules = await Schedule.find(scheduleFilter)
      .populate('coachId', 'coachId fullName specialization')
      .populate('studentId', '_id studentId fullName classLevel')
      .lean()
      .sort({ date: -1 })
      .exec();

    console.log(`Found ${schedules.length} schedules`);

    const scheduleIds = schedules.map(s => s._id);
    
    // ← FIX: Populate studentId with full student data
    const evaluations = await TrainingEvaluation
      .find({ scheduleId: { $in: scheduleIds } })
      .populate('studentId', 'studentId fullName classLevel')
      .lean()
      .exec();

    console.log(`Found ${evaluations.length} evaluations`);

    const evaluationMap = {};
    evaluations.forEach(ev => {
      const scheduleId = ev.scheduleId.toString();
      if (!evaluationMap[scheduleId]) {
        evaluationMap[scheduleId] = [];
      }
      
      // ← FIX: Format evaluation with populated student data
      evaluationMap[scheduleId].push({
        studentId: ev.studentId._id.toString(),
        studentName: ev.studentId.fullName,
        studentLevel: ev.studentId.classLevel,
        attendance: ev.attendance,
        notes: ev.notes || ''
      });
    });

    const coachMap = {};
    
    schedules.forEach(schedule => {
      if (!schedule.coachId) return;

      const coachObjectId = schedule.coachId._id.toString();
      
      if (!coachMap[coachObjectId]) {
        coachMap[coachObjectId] = {
          coachId: schedule.coachId.coachId,
          coachName: schedule.coachId.fullName,
          specialization: schedule.coachId.specialization,
          totalSessions: 0,
          completedSessions: 0,
          cancelledSessions: 0,
          upcomingSessions: 0,
          programStats: {},
          sessions: []
        };
      }

      coachMap[coachObjectId].totalSessions++;
      
      if (schedule.status === 'completed') {
        coachMap[coachObjectId].completedSessions++;
      } else if (schedule.status === 'cancelled') {
        coachMap[coachObjectId].cancelledSessions++;
      } else if (new Date(schedule.date) > new Date()) {
        coachMap[coachObjectId].upcomingSessions++;
      }

      const program = schedule.program || 'Unknown';
      if (!coachMap[coachObjectId].programStats[program]) {
        coachMap[coachObjectId].programStats[program] = {
          count: 0,
          completed: 0
        };
      }
      coachMap[coachObjectId].programStats[program].count++;
      if (schedule.status === 'completed') {
        coachMap[coachObjectId].programStats[program].completed++;
      }

      const scheduleEvaluations = evaluationMap[schedule._id.toString()] || [];
      
      const students = schedule.studentId ? [{
        _id: schedule.studentId._id.toString(),
        studentId: schedule.studentId.studentId,
        fullName: schedule.studentId.fullName,
        classLevel: schedule.studentId.classLevel
      }] : [];

      coachMap[coachObjectId].sessions.push({
        scheduleId: schedule._id.toString(),
        scheduleDate: schedule.date,
        scheduleTime: `${schedule.startTime} - ${schedule.endTime}`,
        location: schedule.location,
        classLevel: schedule.program,
        status: schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1),
        studentCount: students.length,
        students: students,
        notes: schedule.notes || '',
        evaluations: scheduleEvaluations
      });
    });

    const coachReports = Object.values(coachMap).map(coach => ({
      ...coach,
      programStats: Object.keys(coach.programStats).map(program => ({
        program,
        totalSessions: coach.programStats[program].count,
        completedSessions: coach.programStats[program].completed
      })).sort((a, b) => b.totalSessions - a.totalSessions)
    }));

    const data = {
      totalCoaches: coachReports.length,
      totalSessions: schedules.length,
      coachReports
    };

    const duration = Date.now() - startTime;
    console.log(`✅ Coach report generated in ${duration}ms`);

    res.status(200).json({
      success: true,
      data,
      meta: {
        duration: `${duration}ms`,
        dateRange: { startDate, endDate },
        filteredCoach: coachId || 'all'
      }
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== FINANCIAL REPORT ====================

/**
 * @desc    Get financial report
 * @route   GET /api/reports/financial
 * @access  Public
 */
exports.getFinancialReport = async (req, res) => {
  try {
    const startTime = Date.now();
    const { startDate, endDate } = req.query;

    console.log('📊 Financial Report Request:', { startDate, endDate });

    const paymentFilter = {};
    if (startDate && endDate) {
      paymentFilter.paymentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const payments = await Payment.find(paymentFilter)
      .populate('studentId', 'studentId fullName')
      .lean()
      .sort({ paymentDate: -1 })
      .limit(1000)
      .exec();

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const paymentCount = payments.length;
    
    const methodMap = {};
    const statusMap = {};
    const monthlyRevenue = {};

    payments.forEach(p => {
      const method = p.method || 'Cash';
      methodMap[method] = (methodMap[method] || 0) + p.amount;
      
      statusMap[p.status] = (statusMap[p.status] || 0) + 1;
      
      const month = p.month || 'Unknown';
      if (!monthlyRevenue[month]) {
        monthlyRevenue[month] = { revenue: 0, count: 0 };
      }
      monthlyRevenue[month].revenue += p.amount;
      monthlyRevenue[month].count++;
    });

    const overdueStudents = await Student.find({
      paymentStatus: 'Overdue',
      monthlyFee: { $gt: 0 }
    })
      .lean()
      .select('studentId fullName monthsUnpaid totalUnpaid monthlyFee')
      .exec();

    const totalUnpaid = overdueStudents.reduce((sum, s) => sum + (s.totalUnpaid || 0), 0);

    const data = {
      summary: {
        totalRevenue,
        totalPayments: paymentCount,
        totalUnpaid,
        overdueCount: overdueStudents.length,
        averagePayment: paymentCount ? Math.round(totalRevenue / paymentCount) : 0
      },
      byMethod: Object.keys(methodMap).map(k => ({
        method: k,
        total: methodMap[k],
        percentage: totalRevenue ? Number((methodMap[k] / totalRevenue * 100).toFixed(1)) : 0
      })),
      byStatus: Object.keys(statusMap).map(k => ({
        status: k,
        count: statusMap[k]
      })),
      monthlyRevenue: Object.keys(monthlyRevenue)
        .sort()
        .reverse()
        .slice(0, 12)
        .map(k => ({
          month: k,
          revenue: monthlyRevenue[k].revenue,
          count: monthlyRevenue[k].count
        })),
      paymentDetails: payments.slice(0, 100).map(p => ({
        paymentDate: p.paymentDate,
        studentName: p.studentName || p.studentId?.fullName || 'Unknown',
        studentId: p.studentId?.studentId || '-',
        month: p.month,
        amount: p.amount,
        method: p.method,
        status: p.status,
        notes: p.notes || '-'
      })),
      overdueList: overdueStudents.map(s => ({
        studentId: s.studentId,
        fullName: s.fullName,
        monthsUnpaid: s.monthsUnpaid,
        totalUnpaid: s.totalUnpaid,
        monthlyFee: s.monthlyFee
      }))
    };

    const duration = Date.now() - startTime;
    console.log(`✅ Financial report generated in ${duration}ms`);

    res.status(200).json({
      success: true,
      data,
      meta: { duration: `${duration}ms`, dateRange: { startDate, endDate } }
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== EXPORT ====================

/**
 * @desc    Export reports
 * @route   GET /api/reports/export
 * @access  Public
 */
exports.exportReport = async (req, res) => {
  try {
    const { format, reportType, startDate, endDate, studentId, coachId } = req.query;

    if (!format || !reportType) {
      return res.status(400).json({
        success: false,
        message: 'Format and report type required'
      });
    }

    console.log(`📄 Export ${reportType} as ${format}`, { coachId });

    let reportData;
    let reportTitle;

    if (reportType === 'student-individual' && studentId) {
      reportData = await getStudentIndividualExportData(studentId, startDate, endDate);
      reportTitle = `Laporan Siswa - ${reportData.student.fullName}`;
    } else if (reportType === 'coach') {
      reportData = await getCoachExportData(startDate, endDate, coachId);
      reportTitle = coachId ? 'Laporan Pelatih (Individual)' : 'Laporan Pelatih & Sesi Latihan';
    } else if (reportType === 'financial') {
      reportData = await getFinancialExportData(startDate, endDate);
      reportTitle = 'Laporan Keuangan';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid report type'
      });
    }

    if (format === 'pdf') {
      await exportToPDFBeautiful(res, reportTitle, reportData, reportType, startDate, endDate);
    } else if (format === 'excel') {
      await exportToExcelBeautiful(res, reportTitle, reportData, reportType);
    }

    console.log('✅ Export completed');
  } catch (error) {
    console.error('❌ Export error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== HELPERS ====================

async function getStudentIndividualExportData(studentId, startDate, endDate) {
  const student = await Student.findOne({
    $or: [{ _id: studentId }, { studentId: studentId }]
  }).lean();

  if (!student) {
    throw new Error('Student not found');
  }

  const evalFilter = { studentId: student._id };
  if (startDate && endDate) {
    evalFilter.trainingDate = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const evaluations = await TrainingEvaluation.find(evalFilter)
    .populate('coachId', 'fullName specialization')
    .populate('scheduleId')
    .sort({ trainingDate: -1 })
    .lean();

  const history = evaluations.map(ev => {
    const schedule = ev.scheduleId;
    return {
      date: ev.trainingDate,
      time: schedule ? `${schedule.startTime} - ${schedule.endTime}` : '-',
      location: schedule?.location || '-',
      program: schedule?.program || '-',
      coachName: ev.coachId?.fullName || '-',
      attendance: ev.attendance,
      notes: ev.notes || '-'
    };
  });

  return {
    student,
    history
  };
}

module.exports = exports;
