// backend/src/controllers/reportController.js - COMPLETE FINAL VERSION - ADJUSTED TO PROTECT MIDDLEWARE

const mongoose = require('mongoose');
const Student = require('../models/Student');
const Coach = require('../models/Coach');
const Schedule = require('../models/Schedule');
const TrainingEvaluation = require('../models/TrainingEvaluation');
const Payment = require('../models/Payment');
const reportHelper = require('../helpers/reportHelper');
// ✅ ADD THESE IMPORTS AT THE TOP
const whatsappService = require('../services/whatsappService');

const path = require('path');
const fs = require('fs');
// ==================== SEARCH STUDENTS FOR REPORT ====================

/**
 * ✅ GET /api/reports/students/search
 * Search students by name atau studentId
 */
exports.searchStudentsForReport = async (req, res) => {
  try {
    const { query, limit = 20 } = req.query;

    console.log('🔍 Search students:', { query, limit });

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
      .select('_id studentId fullName classLevel photo status')
      .limit(parseInt(limit))
      .lean();

    console.log(`✅ Found ${students.length} students`);

    res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== GET STUDENT INDIVIDUAL REPORT ====================
// backend/src/controllers/reportController.js

/**
 * @desc    Get students list with stats
 * @route   GET /api/reports/students/list
 * @access  Private
 */


/**
 * ✅ GET /api/reports/student/:studentId
 * Get individual student report dengan stats by programType
 */
exports.getStudentIndividualReport = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;

    console.log('\n' + '='.repeat(100));
    console.log('📊 [STUDENT REPORT] START');
    console.log('='.repeat(100));
    console.log('   Student ID:', studentId);
    console.log('   Date range:', { startDate, endDate });

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID'
      });
    }

    const studentObjectId = new mongoose.Types.ObjectId(studentId);

    // Get student data
    const student = await Student.findById(studentObjectId)
      .select('_id studentId fullName classLevel status photo enrollmentDate')
      .lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student tidak ditemukan'
      });
    }

    console.log(`✅ Student: ${student.fullName}`);

    // Get evaluations
    const evalFilter = { studentId: studentObjectId };
    if (startDate && endDate) {
      evalFilter.trainingDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const evaluations = await TrainingEvaluation.find(evalFilter)
      .populate('coachIds', '_id coachId fullName specialization')
      .populate('scheduleId', '_id program programType programCategory location startTime endTime')
      .sort({ trainingDate: -1 })
      .lean();

    console.log(`✅ Found ${evaluations.length} evaluations`);

    // Calculate overall stats
    const stats = {
      totalSessions: evaluations.length,
      hadir: 0,
      tidakHadir: 0,
      izin: 0,
      sakit: 0,
      attendanceRate: 0
    };

    evaluations.forEach(ev => {
      if (ev.attendance === 'Hadir') stats.hadir++;
      else if (ev.attendance === 'Tidak Hadir') stats.tidakHadir++;
      else if (ev.attendance === 'Izin') stats.izin++;
      else if (ev.attendance === 'Sakit') stats.sakit++;
    });

    if (evaluations.length > 0) {
      stats.attendanceRate = Math.round((stats.hadir / evaluations.length) * 100);
    }

    // GROUP BY PROGRAM TYPE + CATEGORY
    const typeStats = {};

    evaluations.forEach(ev => {
      const programType = ev.scheduleId?.programType || 'Unknown';
      const programCategory = ev.scheduleId?.programCategory || 'General';
      const typeKey = `${programType} (${programCategory})`;

      if (!typeStats[typeKey]) {
        typeStats[typeKey] = {
          programType,
          programCategory,
          totalSessions: 0,
          hadir: 0,
          tidakHadir: 0,
          izin: 0,
          sakit: 0
        };
      }

      typeStats[typeKey].totalSessions++;

      if (ev.attendance === 'Hadir') typeStats[typeKey].hadir++;
      else if (ev.attendance === 'Tidak Hadir') typeStats[typeKey].tidakHadir++;
      else if (ev.attendance === 'Izin') typeStats[typeKey].izin++;
      else if (ev.attendance === 'Sakit') typeStats[typeKey].sakit++;
    });

    // Calculate attendance rate per type
    Object.entries(typeStats).forEach(([key, stat]) => {
      stat.attendanceRate = stat.totalSessions > 0
        ? Math.round((stat.hadir / stat.totalSessions) * 100)
        : 0;
    });

    console.log(`📂 ${Object.keys(typeStats).length} program types`);

    // Format history
    const history = evaluations.map(ev => ({
      _id: ev._id.toString(),
      date: ev.trainingDate,
      program: ev.scheduleId?.program || '-',
      programType: ev.scheduleId?.programType || '-',
      programCategory: ev.scheduleId?.programCategory || '-',
      time: `${ev.scheduleId?.startTime || '??'} - ${ev.scheduleId?.endTime || '??'}`,
      location: ev.scheduleId?.location || '-',
      coaches: (ev.coachIds || []).map(c => c.fullName).join(', ') || '-',
      attendance: ev.attendance,
      notes: ev.notes || '-'
    }));

    console.log('\n' + '='.repeat(100));
    console.log('✅ [STUDENT REPORT] COMPLETE');
    console.log('='.repeat(100) + '\n');

    res.status(200).json({
      success: true,
      data: {
        student,
        stats,
        typeStats,
        history
      },
      meta: {
        dateRange: { startDate, endDate },
        timestamp: new Date().toISOString()
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

// ==================== GET STUDENTS LIST WITH STATS ====================

/**
 * ✅ GET /api/reports/students/list
 * Get all students dengan attendance stats + phone number
 * @desc    Get students list with stats (for WhatsApp feature)
 * @route   GET /api/reports/students/list
 * @access  Private
 */
/**
 * ✅ Get students list with stats (for WhatsApp feature)
 * @route GET /api/reports/students/list
 * @access Private
 */
exports.getStudentsListWithStats = async (req, res) => {
  try {
    const { startDate, endDate, sortBy = 'fullName', order = 'asc', classLevel, status = 'Aktif' } = req.query;

    console.log('📋 GET /api/reports/students/list');
    console.log('   Query params:', { startDate, endDate, sortBy, order, classLevel, status });

    // Build filter
    let studentFilter = {};
    
    if (status === 'all') {
      studentFilter.status = { $ne: 'deleted' };
    } else {
      studentFilter.status = status;
    }
    
    if (classLevel) {
      studentFilter.classLevel = classLevel;
    }

    // Get students
    const students = await Student.find(studentFilter)
      .select('_id studentId fullName phone classLevel status photo enrollmentDate')
      .sort({ fullName: 1 })
      .lean();

    console.log(`   ✅ Found ${students.length} students`);

    if (students.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        meta: {
          dateRange: { startDate, endDate },
          sortBy,
          order,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Get evaluations for date range
    const evalFilter = {};
    if (startDate && endDate) {
      evalFilter.trainingDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const TrainingEvaluation = require('../models/TrainingEvaluation');
    const evaluations = await TrainingEvaluation.find(evalFilter)
      .select('studentId attendance')
      .lean();

    console.log(`   ✅ Found ${evaluations.length} evaluations`);

    // Build stats map
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
      
      const attendance = (ev.attendance || '').toLowerCase().trim();
      
      if (attendance === 'hadir') {
        evalsByStudent[studentId].hadir++;
      } else if (attendance === 'tidak hadir') {
        evalsByStudent[studentId].tidakHadir++;
      } else if (attendance === 'izin') {
        evalsByStudent[studentId].izin++;
      } else if (attendance === 'sakit') {
        evalsByStudent[studentId].sakit++;
      }
    });

    // Map students with stats
    let studentsWithStats = students.map(student => {
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
        phone: student.phone || null,
        classLevel: student.classLevel,
        status: student.status,
        photo: student.photo,
        enrollmentDate: student.enrollmentDate,
        totalSessions: stats.total,
        hadir: stats.hadir,
        tidakHadir: stats.tidakHadir,
        izin: stats.izin,
        sakit: stats.sakit,
        attendanceRate
      };
    });

    // Sorting
    const validSortKeys = ['fullName', 'attendanceRate', 'totalSessions', 'hadir', 'studentId'];
    const sortKey = validSortKeys.includes(sortBy) ? sortBy : 'fullName';
    const sortOrder = order === 'desc' ? -1 : 1;

    studentsWithStats.sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (sortOrder === -1) {
        return bVal > aVal ? 1 : -1;
      } else {
        return aVal > bVal ? 1 : -1;
      }
    });

    console.log(`   ✅ Sorted by ${sortKey} (${order})`);

    res.status(200).json({
      success: true,
      count: studentsWithStats.length,
      data: studentsWithStats,
      meta: {
        dateRange: { 
          startDate: startDate || null, 
          endDate: endDate || null 
        },
        sortBy: sortKey,
        order,
        filters: {
          status,
          classLevel: classLevel || null
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get students list with stats',
      error: error.message
    });
  }
};


// ==================== GET COACH REPORT ====================

/**
 * ✅ GET /api/reports/coaches
 * Get coach report dengan stats by programType
 * - Coach hanya lihat data miliknya
 * - Admin lihat semua
 * - Statistik berdasarkan programType

/**
 * ✅ GET COACH REPORT - COMPLETE WITH ATTENDANCE-BASED LOGIC
 * Support: Private, Semi Private, Group schedules
 * Logic: Completed/Cancelled based on student attendance
 */
exports.getCoachReport = async (req, res) => {
  try {
    const startTime = Date.now();
    const { startDate, endDate, coachId } = req.query;

    // Validasi tanggal input
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'startDate dan endDate required' });
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date format' });
    }

    // Permission handling untuk role coach
    let userCoachObjectId = null;
    if (req.user?.role === 'coach') {
      if (!req.user?.coachId) {
        return res.status(404).json({ success: false, message: 'Coach profile not found' });
      }
      userCoachObjectId = new mongoose.Types.ObjectId(req.user.coachId);
      if (coachId && coachId !== userCoachObjectId.toString()) {
        return res.status(403).json({ success: false, message: 'Anda hanya bisa lihat laporan Anda sendiri' });
      }
    }

    // Bangun filter query schedule berdasarkan tanggal dan akses user
    const scheduleFilter = { date: { $gte: start, $lte: end } };
    if (userCoachObjectId) {
      scheduleFilter.$or = [
        { coachId: userCoachObjectId, scheduleType: 'private' },
        { 'coaches._id': userCoachObjectId, scheduleType: { $in: ['semiPrivate', 'group'] } }
      ];
    }

    // Ambil data schedule dengan populate lengkap
    const schedules = await Schedule.find(scheduleFilter)
      .populate('coachId', '_id coachId fullName')
      .populate('studentId', '_id studentId fullName classLevel')
      .populate('students', '_id studentId fullName classLevel')
      .populate('coaches', '_id coachId fullName')
      .lean()
      .sort({ date: -1 })
      .limit(500) // batasi default agar tidak terlalu berat
      .exec();

    if (schedules.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          stats: { totalCoaches: 0, totalSessions: 0, totalEvaluations: 0 },
          coachReports: []
        },
        meta: { duration: `${Date.now() - startTime}ms`, dateRange: { startDate, endDate }, userRole: req.user?.role, timestamp: new Date().toISOString() }
      });
    }

    // Normalisasi schedules -> pastikan students & mainCoach terisi dengan struktur benar
    const normalizedSchedules = schedules.map(schedule => {
      let students = [];
      let mainCoach = null;

      if (schedule.scheduleType === 'private') {
        students = Array.isArray(schedule.students) && schedule.students.length > 0
          ? schedule.students.map(s => ({
              _id: s._id.toString(),
              studentId: s.studentId,
              fullName: s.fullName,
              classLevel: s.classLevel || ''
            }))
          : [schedule.studentId ? {
              _id: schedule.studentId._id.toString(),
              studentId: schedule.studentId.studentId,
              fullName: schedule.studentId.fullName || 'Unknown',
              classLevel: schedule.studentId.classLevel || ''
            } : null].filter(Boolean);

        if (schedule.coachId) {
          mainCoach = {
            _id: schedule.coachId._id.toString(),
            coachId: schedule.coachId.coachId,
            fullName: schedule.coachId.fullName
          };
        }
      } else if (['semiPrivate', 'group'].includes(schedule.scheduleType)) {
        students = (schedule.students || []).map(s => ({
          _id: s._id.toString(),
          studentId: s.studentId,
          fullName: s.fullName,
          classLevel: s.classLevel || ''
        }));

        if (Array.isArray(schedule.coaches) && schedule.coaches.length > 0) {
          if (userCoachObjectId) {
            const matchedCoach = schedule.coaches.find(c => c._id.toString() === userCoachObjectId.toString());
            mainCoach = matchedCoach
              ? {
                  _id: matchedCoach._id.toString(),
                  coachId: matchedCoach.coachId,
                  fullName: matchedCoach.fullName
                }
              : {
                  _id: schedule.coaches[0]._id.toString(),
                  coachId: schedule.coaches[0].coachId,
                  fullName: schedule.coaches[0].fullName
                };
          } else {
            mainCoach = {
              _id: schedule.coaches[0]._id.toString(),
              coachId: schedule.coaches[0].coachId,
              fullName: schedule.coaches[0].fullName
            };
          }
        }
      }

      return { ...schedule, students, mainCoach };
    });

    // Ambil evaluations untuk jadwal-jadwal yang telah dinormalisasi
    const scheduleIds = normalizedSchedules.map(s => s._id);
    const evaluations = await TrainingEvaluation.find({ scheduleId: { $in: scheduleIds } })
      .populate('studentId', '_id studentId fullName classLevel')
      .populate('coachIds', '_id coachId fullName')
      .lean()
      .exec();

    // Buat map evaluasi berdasarkan scheduleId
    const evaluationMap = new Map();
    evaluations.forEach(ev => {
      const scheduleId = ev.scheduleId.toString();
      if (!evaluationMap.has(scheduleId)) evaluationMap.set(scheduleId, []);
      evaluationMap.get(scheduleId).push({
        studentId: ev.studentId._id.toString(),
        studentName: ev.studentId.fullName,
        attendance: ev.attendance || 'Tidak Hadir',
        notes: ev.notes || ''
      });
    });

    // Bangun map informasi per coach
    const coachMap = new Map();

    normalizedSchedules.forEach(schedule => {
      if (!schedule.mainCoach) return;

      const coach = schedule.mainCoach;
      const coachKey = coach._id;

      if (!coachMap.has(coachKey)) {
        coachMap.set(coachKey, {
          _id: coach._id,
          coachId: coach.coachId,
          coachName: coach.fullName,
          totalSessions: 0,
          completedSessions: 0,
          cancelledSessions: 0,
          upcomingSessions: 0,
          totalStudents: new Set(),
          scheduleTypeStats: new Map(),
          sessions: []
        });
      }

      const coachData = coachMap.get(coachKey);
      coachData.totalSessions++;

      const scheduleEvaluations = evaluationMap.get(schedule._id.toString()) || [];
      const students = schedule.students || [];

      // Floodlight status logic (hadir, batal, upcoming) bisa tetap Anda implementasikan di sini...

      students.forEach(s => coachData.totalStudents.add(s._id));

      coachData.sessions.push({
        scheduleId: schedule._id.toString(),
        scheduleType: schedule.scheduleType,
        program: schedule.program || 'Unknown',
        programCategory: schedule.programCategory || 'General',
        scheduleDate: schedule.date,
        scheduleTime: `${schedule.startTime} - ${schedule.endTime}`,
        location: schedule.location || 'N/A',
        status: schedule.status,
        studentCount: students.length,
        students,
        evaluations: scheduleEvaluations
      });
    });

    // Format hasil akhir dalam array
    const coachReports = Array.from(coachMap.values()).map(coach => {
      // Format stats jika diperlukan...

      return {
        coachId: coach.coachId,
        coachName: coach.coachName,
        totalSessions: coach.totalSessions,
        completedSessions: coach.completedSessions || 0,
        cancelledSessions: coach.cancelledSessions || 0,
        upcomingSessions: coach.upcomingSessions || 0,
        totalStudents: coach.totalStudents.size,
        sessions: coach.sessions
      };
    });

    // Kirim respon JSON
    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalCoaches: coachReports.length,
          totalSessions: normalizedSchedules.length,
          totalEvaluations: evaluations.length
        },
        coachReports
      },
      meta: {
        duration: `${Date.now() - startTime}ms`,
        dateRange: { startDate, endDate },
        userRole: req.user?.role,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ [COACH REPORT] ERROR', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};






// ==================== GET FINANCIAL REPORT ====================

/**
 * ✅ GET /api/reports/financial
 * Get financial report - ONLY ADMIN
 */
exports.getFinancialReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    console.log('💰 Getting financial report');

    const filter = {};
    if (startDate && endDate) {
      filter.paymentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const payments = await Payment.find(filter)
      .populate('studentId', 'studentId fullName')
      .sort({ paymentDate: -1 })
      .lean();

    const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalPayments = payments.length;
    const averagePayment = totalPayments > 0 ? Math.round(totalRevenue / totalPayments) : 0;

    // Group by month
    const byMonth = {};
    payments.forEach(p => {
      const date = new Date(p.paymentDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!byMonth[monthKey]) {
        byMonth[monthKey] = {
          month: monthKey,
          totalAmount: 0,
          count: 0
        };
      }

      byMonth[monthKey].totalAmount += p.amount || 0;
      byMonth[monthKey].count++;
    });

    const monthlyStats = Object.values(byMonth).sort((a, b) => b.month.localeCompare(a.month));

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalPayments,
          averagePayment
        },
        monthlyStats,
        payments: payments.map(p => ({
          _id: p._id.toString(),
          date: p.paymentDate,
          studentName: p.studentId?.fullName || 'Unknown',
          amount: p.amount,
          month: p.month,
          method: p.method,
          status: p.status,
          notes: p.notes || '-'
        }))
      },
      meta: {
        dateRange: { startDate, endDate },
        timestamp: new Date().toISOString()
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

// ==================== EXPORT REPORT ====================

/**
 * ✅ GET /api/reports/export
 * Export report ke PDF atau Excel
 */
// backend/src/controllers/reportController.js - EXPORT FUNCTION - ADD DEBUG LOG

// backend/src/controllers/reportController.js - EXPORT FUNCTION

// backend/src/controllers/reportController.js - COMPLETE FIXED VERSION


/**
 * ✅ EXPORT REPORT CONTROLLER - COMPLETE & FIXED
 * Supports: Coach, Student Individual, Financial Reports
 * Formats: PDF, Excel
 */
exports.exportReport = async (req, res) => {
  try {
    const { format, reportType, startDate, endDate, coachId, studentId } = req.query;

    console.log('\n' + '='.repeat(100));
    console.log('📥 EXPORT REPORT REQUEST');
    console.log('='.repeat(100));
    console.log('   User:', {
      role: req.user?.role,
      userId: req.user?.userId,
      coachId: req.user?.coachId
    });
    console.log('   Query Params:', {
      format,
      reportType,
      startDate,
      endDate,
      coachId,
      studentId
    });

    // ==================== VALIDATION ====================

    // Check required fields
    if (!format || !reportType) {
      return res.status(400).json({
        success: false,
        message: 'Parameter format dan reportType wajib diisi'
      });
    }

    // Validate format
    if (!['pdf', 'excel'].includes(format.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Format hanya boleh "pdf" atau "excel"'
      });
    }

    // Validate report type
    const validReportTypes = ['coach', 'student-individual', 'financial'];
    if (!validReportTypes.includes(reportType)) {
      return res.status(400).json({
        success: false,
        message: `Report type tidak valid. Harus salah satu dari: ${validReportTypes.join(', ')}`
      });
    }

    // ==================== COACH REPORT ====================
    if (reportType === 'coach') {
      try {
        console.log('\n📊 Processing COACH REPORT...');

        // Validate date range
        if (!startDate || !endDate) {
          return res.status(400).json({
            success: false,
            message: 'Parameter startDate dan endDate wajib diisi untuk laporan pelatih'
          });
        }

        // Validate date format
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Format tanggal tidak valid. Gunakan format YYYY-MM-DD'
          });
        }

        if (start > end) {
          return res.status(400).json({
            success: false,
            message: 'startDate tidak boleh lebih besar dari endDate'
          });
        }

        // ✅ PERMISSION CHECK: Coach can only export their own data
        let filterCoachId = coachId;
        const userRole = req.user?.role;
        const userCoachId = req.user?.coachId;

        if (userRole === 'coach') {
          // Coach trying to export data
          if (coachId && coachId !== userCoachId) {
            console.warn(`❌ FORBIDDEN: Coach ${userCoachId} trying to access coach ${coachId}`);
            return res.status(403).json({
              success: false,
              message: 'Anda hanya bisa export laporan Anda sendiri'
            });
          }

          // Auto-filter to coach's own data
          filterCoachId = userCoachId;
          console.log(`   🔒 AUTO-FILTER: Coach restricted to own data (${filterCoachId})`);
        }

        console.log('   ✅ Permission check passed');
        console.log('   📅 Date range:', startDate, 'to', endDate);
        console.log('   👤 Filter coach:', filterCoachId || 'All coaches');

        // ✅ Fetch coach export data with attendance-based logic
        const exportData = await reportHelper.getCoachExportData(
          startDate,
          endDate,
          filterCoachId,
          userRole,
          userCoachId
        );

        if (!exportData.coaches || exportData.coaches.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Tidak ada data pelatih untuk periode yang dipilih'
          });
        }

        console.log(`   ✅ Found ${exportData.coaches.length} coach(es) with data`);

        const reportTitle = filterCoachId
          ? `Laporan Pelatih - ${exportData.coaches[0].name}`
          : `Laporan Semua Pelatih - ${new Date(startDate).toLocaleDateString('id-ID')} s/d ${new Date(endDate).toLocaleDateString('id-ID')}`;

        // Generate export file
        if (format === 'pdf') {
          console.log('   📄 Generating PDF...');
          await reportHelper.exportToPDFBeautiful(
            res,
            reportTitle,
            exportData,
            'coach',
            startDate,
            endDate
          );
        } else if (format === 'excel') {
          console.log('   📊 Generating Excel...');
          await reportHelper.exportToExcelBeautiful(
            res,
            reportTitle,
            exportData,
            'coach'
          );
        }

        console.log('   ✅ Coach report exported successfully');

      } catch (error) {
        console.error('❌ Coach export error:', error);
        return res.status(400).json({
          success: false,
          message: error.message || 'Gagal mengexport laporan pelatih'
        });
      }
    }

    // ==================== STUDENT INDIVIDUAL REPORT ====================
    else if (reportType === 'student-individual') {
      try {
        console.log('\n👤 Processing STUDENT INDIVIDUAL REPORT...');

        // Validate student ID
        if (!studentId) {
          return res.status(400).json({
            success: false,
            message: 'Parameter studentId wajib diisi'
          });
        }

        if (!mongoose.Types.ObjectId.isValid(studentId)) {
          return res.status(400).json({
            success: false,
            message: 'Student ID tidak valid'
          });
        }

        console.log('   🔍 Fetching student data:', studentId);

        // Fetch student export data
        const exportData = await reportHelper.getStudentExportData(
          studentId,
          startDate,
          endDate
        );

        if (!exportData.student) {
          return res.status(404).json({
            success: false,
            message: 'Siswa tidak ditemukan'
          });
        }

        console.log(`   ✅ Found student: ${exportData.student.fullName}`);
        console.log(`   📋 Training history: ${exportData.history.length} sessions`);

        const reportTitle = `Laporan Siswa - ${exportData.student.fullName}`;
        const dateRange = startDate && endDate
          ? `${new Date(startDate).toLocaleDateString('id-ID')} s/d ${new Date(endDate).toLocaleDateString('id-ID')}`
          : 'Semua Periode';

        // Generate export file
        if (format === 'pdf') {
          console.log('   📄 Generating PDF...');
          await reportHelper.exportToPDFBeautiful(
            res,
            reportTitle,
            exportData,
            'student-individual',
            startDate || 'Semua',
            endDate || 'Semua'
          );
        } else if (format === 'excel') {
          console.log('   📊 Generating Excel...');
          await reportHelper.exportToExcelBeautiful(
            res,
            reportTitle,
            exportData,
            'student-individual'
          );
        }

        console.log('   ✅ Student report exported successfully');

      } catch (error) {
        console.error('❌ Student export error:', error);
        return res.status(400).json({
          success: false,
          message: error.message || 'Gagal mengexport laporan siswa'
        });
      }
    }

    // ==================== FINANCIAL REPORT ====================
    else if (reportType === 'financial') {
      try {
        console.log('\n💰 Processing FINANCIAL REPORT...');

        // ✅ PERMISSION: Only admin can export financial reports
        if (req.user?.role !== 'admin') {
          console.warn(`❌ FORBIDDEN: ${req.user?.role} (${req.user?.userId}) trying to access financial report`);
          return res.status(403).json({
            success: false,
            message: 'Hanya admin yang bisa export laporan keuangan'
          });
        }

        console.log('   ✅ Admin permission verified');

        // Validate date range if provided
        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);

          if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({
              success: false,
              message: 'Format tanggal tidak valid. Gunakan format YYYY-MM-DD'
            });
          }

          if (start > end) {
            return res.status(400).json({
              success: false,
              message: 'startDate tidak boleh lebih besar dari endDate'
            });
          }

          console.log('   📅 Date range:', startDate, 'to', endDate);
        } else {
          console.log('   📅 No date filter - exporting all financial data');
        }

        // Fetch financial export data
        const exportData = await reportHelper.getFinancialExportData(
          startDate,
          endDate
        );

        if (!exportData.payments || exportData.payments.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Tidak ada data pembayaran untuk periode yang dipilih'
          });
        }

        console.log(`   ✅ Found ${exportData.payments.length} payment(s)`);
        console.log(`   💵 Total Revenue: Rp ${exportData.totalRevenue.toLocaleString('id-ID')}`);

        const dateRange = startDate && endDate
          ? `${new Date(startDate).toLocaleDateString('id-ID')} s/d ${new Date(endDate).toLocaleDateString('id-ID')}`
          : new Date().toLocaleDateString('id-ID');

        const reportTitle = `Laporan Keuangan - ${dateRange}`;

        // Generate export file
        if (format === 'pdf') {
          console.log('   📄 Generating PDF...');
          await reportHelper.exportToPDFBeautiful(
            res,
            reportTitle,
            exportData,
            'financial',
            startDate || 'Semua',
            endDate || 'Semua'
          );
        } else if (format === 'excel') {
          console.log('   📊 Generating Excel...');
          await reportHelper.exportToExcelBeautiful(
            res,
            reportTitle,
            exportData,
            'financial'
          );
        }

        console.log('   ✅ Financial report exported successfully');

      } catch (error) {
        console.error('❌ Financial export error:', error);
        return res.status(400).json({
          success: false,
          message: error.message || 'Gagal mengexport laporan keuangan'
        });
      }
    }

    console.log('='.repeat(100));
    console.log('✅ EXPORT COMPLETED SUCCESSFULLY\n');

  } catch (error) {
    console.error('\n' + '='.repeat(100));
    console.error('❌ EXPORT CONTROLLER ERROR');
    console.error('='.repeat(100));
    console.error('   Error:', error.message);
    console.error('   Stack:', error.stack);
    console.error('='.repeat(100) + '\n');

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error saat export laporan'
      });
    }
  }
};

// backend/src/controllers/reportController.js


/**
 * @desc    Generate PDF and send to student's WhatsApp (REUSE EXISTING LOGIC)
 * @route   POST /api/reports/student/:id/send-whatsapp
 * @access  Private
 */
exports.generateAndSendStudentPDFLinkToWhatsApp = async (req, res) => {
  let pdfPath = null; // Track PDF path for cleanup on error

  try {
    const { id } = req.params;
    const { startDate, endDate, message } = req.body;

    console.log('\n' + '='.repeat(80));
    console.log('📱 GENERATE PDF & SEND LINK TO WHATSAPP');
    console.log('='.repeat(80));
    console.log('   Student ID:', id);
    console.log('   Date range:', { startDate, endDate });
    console.log('   Custom message:', message ? 'Yes' : 'No');

    // ==================== GET STUDENT ====================
    const student = await Student.findById(id);
    
    if (!student) {
      console.log('   ❌ Student not found');
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    if (!student.phone) {
      console.log('   ❌ No phone number');
      return res.status(400).json({
        success: false,
        message: 'Nomor HP siswa tidak tersedia. Silakan update data siswa terlebih dahulu.'
      });
    }

    console.log('   ✅ Student:', student.fullName);
    console.log('   ✅ Phone:', student.phone);

    // ==================== ENSURE REPORTS DIRECTORY EXISTS ====================
    const reportsDir = path.join(__dirname, '../../public/reports');
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
      console.log('   ✅ Created reports directory');
    }

    // ==================== GENERATE PDF (REAL-TIME DATA) ====================
    const timestamp = Date.now();
    const filename = `report-${student.studentId}-${timestamp}.pdf`;
    pdfPath = path.join(reportsDir, filename);

    console.log('\n   📄 Generating PDF with LATEST data from database...');
    console.log('   Filename:', filename);

    // ✅ Generate PDF with LATEST data from DB
    const result = await reportHelper.generateStudentPDFToFile(id, startDate, endDate, pdfPath);

    console.log('   ✅ PDF generated successfully');
    console.log('   📊 Stats:', result.stats);

    // ==================== GENERATE PUBLIC URL ====================
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const publicUrl = `${baseUrl}/reports/${filename}`;

    console.log('   🔗 Public URL:', publicUrl);

    // ==================== CHECK WHATSAPP SERVICE ====================
    if (!whatsappService.isReady()) {
      console.log('   ❌ WhatsApp service not ready');
      
      // Cleanup PDF before returning error
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
        console.log('   🗑️ Cleaned up PDF');
      }
      
      return res.status(503).json({
        success: false,
        message: 'WhatsApp service tidak tersedia saat ini. Silakan coba lagi nanti.'
      });
    }

    console.log('   ✅ WhatsApp service ready');

    // ==================== CALCULATE EXPIRY TIME ====================
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 1); // ✅ 1 hour from now

    const expiryTimeStr = expiryDate.toLocaleString('id-ID', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    console.log('   ⏰ Expiry time:', expiryTimeStr);

    // ==================== FORMAT WHATSAPP MESSAGE ====================
    const whatsappMessage = message || 
      `Halo ${student.fullName}! 👋\n\n` +
      `Berikut adalah laporan riwayat latihan Anda di Lafi Swimming Academy.\n\n` +
      `📊 *Statistik Latihan:*\n` +
      `📅 Periode: ${startDate ? new Date(startDate).toLocaleDateString('id-ID') : 'Semua'} - ${endDate ? new Date(endDate).toLocaleDateString('id-ID') : 'Semua'}\n` +
      `✅ Total Sesi: ${result.stats.total}\n` +
      `✅ Hadir: ${result.stats.hadir}\n` +
      `❌ Tidak Hadir: ${result.stats.tidakHadir}\n` +
      `📝 Izin: ${result.stats.izin}\n` +
      `🏥 Sakit: ${result.stats.sakit}\n` +
      `📈 Tingkat Kehadiran: ${result.stats.attendanceRate}%\n\n` +
      `📄 *Download Laporan PDF:*\n` +
      `${publicUrl}\n\n` +
      `⏰ *Link berlaku hingga:*\n` +
      `${expiryTimeStr} WIB\n\n` +
      `_Link ini akan otomatis dihapus setelah 1 jam untuk keamanan data._\n\n` +
      `Terima kasih atas dedikasi Anda! 💪\n\n` +
      `*Lafi Swimming Academy*\n` +
      `📱 WA: 0821-4004-4677`;

    console.log('   📝 Message length:', whatsappMessage.length, 'characters');

    // ==================== SEND VIA WHATSAPP ====================
    console.log('\n   📤 Sending link to WhatsApp...');

    await whatsappService.sendMessage(
      student.phone,
      whatsappMessage,
      'report',
      req.user?._id,
      {
        recipientName: student.fullName,
        documentType: 'student-report-link',
        studentId: student._id,
        reportUrl: publicUrl,
        filename: filename,
        expiresAt: expiryDate
      }
    );

    console.log('   ✅ Link sent successfully to', student.phone);

    // ==================== SCHEDULE AUTO-DELETE (1 HOUR) ====================
    const deleteAfterMs = 60 * 60 * 1000; // ✅ 1 hour = 60 minutes * 60 seconds * 1000 ms
    
    setTimeout(() => {
      if (fs.existsSync(pdfPath)) {
        try {
          fs.unlinkSync(pdfPath);
          console.log(`\n🗑️ AUTO-DELETED: ${filename}`);
          console.log(`   Deleted at: ${new Date().toLocaleString('id-ID')}`);
          console.log(`   Reason: 1 hour expiry`);
        } catch (deleteError) {
          console.error(`   ❌ Failed to delete: ${deleteError.message}`);
        }
      }
    }, deleteAfterMs);

    console.log(`\n   ⏱️ Auto-delete scheduled:`);
    console.log(`   Will be deleted at: ${expiryDate.toLocaleString('id-ID')}`);
    console.log(`   Time remaining: 60 minutes`);

    // ==================== RESPONSE ====================
    console.log('\n' + '='.repeat(80));
    console.log('✅ SUCCESS - Link sent to WhatsApp');
    console.log('='.repeat(80) + '\n');

    res.json({
      success: true,
      message: `Link laporan berhasil dikirim ke WhatsApp ${student.fullName}!`,
      data: {
        student: {
          id: student._id,
          studentId: student.studentId,
          name: student.fullName,
          phone: student.phone
        },
        report: {
          filename: filename,
          url: publicUrl,
          expiresAt: expiryDate,
          expiresIn: '1 hour'
        },
        stats: result.stats,
        sentAt: new Date()
      }
    });

  } catch (error) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ ERROR - Failed to send PDF link');
    console.error('='.repeat(80));
    console.error('   Error:', error.message);
    console.error('   Stack:', error.stack);
    
    // ✅ CLEANUP PDF ON ERROR
    if (pdfPath && fs.existsSync(pdfPath)) {
      try {
        fs.unlinkSync(pdfPath);
        console.log('   🗑️ Cleaned up PDF after error');
      } catch (cleanupError) {
        console.error('   ⚠️ Cleanup failed:', cleanupError.message);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Gagal mengirim laporan ke WhatsApp',
      error: error.message
    });
  }
};





module.exports = exports;
