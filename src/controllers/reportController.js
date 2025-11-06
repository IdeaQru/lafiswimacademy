// backend/src/controllers/reportController.js - COMPLETE FINAL VERSION - ADJUSTED TO PROTECT MIDDLEWARE

const mongoose = require('mongoose');
const Student = require('../models/Student');
const Coach = require('../models/Coach');
const Schedule = require('../models/Schedule');
const TrainingEvaluation = require('../models/TrainingEvaluation');
const Payment = require('../models/Payment');
const reportHelper = require('../helpers/reportHelper');

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
 * Get all students dengan attendance stats
 */
exports.getStudentsListWithStats = async (req, res) => {
  try {
    const { startDate, endDate, sortBy = 'fullName', order = 'asc', classLevel } = req.query;

    console.log('📋 Getting students list with stats');

    let studentFilter = { status: 'Aktif' };
    if (classLevel) {
      studentFilter.classLevel = classLevel;
    }

    const students = await Student.find(studentFilter)
      .select('_id studentId fullName classLevel status photo enrollmentDate')
      .sort({ fullName: 1 })
      .lean();

    console.log(`✅ Found ${students.length} active students`);

    // Get evaluations
    const evalFilter = {};
    if (startDate && endDate) {
      evalFilter.trainingDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const evaluations = await TrainingEvaluation.find(evalFilter)
      .select('studentId attendance')
      .lean();

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
      if (ev.attendance === 'Hadir') evalsByStudent[studentId].hadir++;
      else if (ev.attendance === 'Tidak Hadir') evalsByStudent[studentId].tidakHadir++;
      else if (ev.attendance === 'Izin') evalsByStudent[studentId].izin++;
      else if (ev.attendance === 'Sakit') evalsByStudent[studentId].sakit++;
    });

    // Map with stats
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

    // Sorting
    const sortKey = sortBy === 'attendanceRate' ? 'attendanceRate' : 'fullName';
    const sortOrder = order === 'desc' ? -1 : 1;

    studentsWithStats.sort((a, b) => {
      if (sortOrder === -1) {
        return b[sortKey] > a[sortKey] ? 1 : -1;
      } else {
        return a[sortKey] > b[sortKey] ? 1 : -1;
      }
    });

    console.log(`✅ Sorted by ${sortKey} (${order})`);

    res.status(200).json({
      success: true,
      count: studentsWithStats.length,
      data: studentsWithStats,
      meta: {
        dateRange: { startDate, endDate },
        sortBy,
        order,
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

// ==================== GET COACH REPORT ====================

/**
 * ✅ GET /api/reports/coaches
 * Get coach report dengan stats by programType
 * - Coach hanya lihat data miliknya
 * - Admin lihat semua
 * - Statistik berdasarkan programType
 */
// backend/src/controllers/reportController.js - OPTIMIZED COACH REPORT

// backend/src/controllers/reportController.js - OPTIMIZED COACH REPORT

// backend/src/controllers/reportController.js - FIXED getCoachReport

/**
 * ✅ GET /api/reports/coaches
 * FIXED: Hanya tampilkan coach yang login (jika coach) atau all (jika admin)
 */
exports.getCoachReport = async (req, res) => {
  try {
    const startTime = Date.now();
    const { startDate, endDate, coachId } = req.query;

    console.log('\n' + '='.repeat(100));
    console.log('📊 [COACH REPORT] START');
    console.log('='.repeat(100));
    console.log('   User:', {
      _id: req.user?._id,
      role: req.user?.role,
      coachId: req.user?.coachId
    });
    console.log('   Params:', { startDate, endDate, coachId });

    // ==================== VALIDATION ====================
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate dan endDate required'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    console.log('✅ Validation passed');

    // ==================== PERMISSION ====================
    let userCoachObjectId = null;

    if (req.user?.role === 'coach') {
      // ✅ Get coach ObjectId dari req.user.coachId (set oleh middleware auth)
      if (req.user?.coachId) {
        userCoachObjectId = new mongoose.Types.ObjectId(req.user.coachId);
        console.log(`✅ Coach user: ${req.user._id} -> Coach ObjectId: ${userCoachObjectId}`);
      } else {
        console.warn('❌ Coach user tapi coachId tidak ter-set');
        return res.status(404).json({
          success: false,
          message: 'Coach profile not found'
        });
      }

      // ✅ PERMISSION: Coach hanya bisa lihat laporan miliknya
      if (coachId && coachId !== userCoachObjectId.toString()) {
        console.warn(`❌ Coach ${userCoachObjectId} mencoba akses ${coachId}`);
        return res.status(403).json({
          success: false,
          message: 'Anda hanya bisa lihat laporan Anda sendiri'
        });
      }
    } else if (req.user?.role === 'admin') {
      console.log('👨‍💼 Admin mode - can view all coaches');
    }

    console.log('✅ Permission check passed');

    // ==================== BUILD FILTER ====================
    const scheduleFilter = {
      date: {
        $gte: start,
        $lte: end
      }
    };

    if (userCoachObjectId) {
      scheduleFilter.$or = [
        { coachId: userCoachObjectId, scheduleType: 'private' },
        { 'coaches._id': userCoachObjectId, scheduleType: 'group' }
      ];
    }

    // ==================== FETCH SCHEDULES ====================
    console.log('\n📅 STEP 1: Fetching schedules...');
    const fetchStart = Date.now();

    const schedules = await Schedule.find(scheduleFilter)
      .populate('coachId', '_id coachId fullName')
      .populate('studentId', '_id studentId fullName classLevel')
      .populate('students', '_id studentId fullName classLevel')
      .populate('coaches', '_id coachId fullName')
      .lean()
      .sort({ date: -1 })
      .limit(500)
      .exec();

    const fetchDuration = Date.now() - fetchStart;
    console.log(`✅ Found ${schedules.length} schedules (${fetchDuration}ms)`);

    if (schedules.length === 0) {
      console.log('⚠️ No schedules found');
      return res.status(200).json({
        success: true,
        data: {
          stats: {
            totalCoaches: 0,
            totalSessions: 0,
            totalEvaluations: 0
          },
          coachReports: []
        },
        meta: {
          duration: `${Date.now() - startTime}ms`,
          dateRange: { startDate, endDate },
          userRole: req.user?.role,
          timestamp: new Date().toISOString()
        }
      });
    }

    // ==================== NORMALIZE STUDENTS ====================
    console.log('\n📊 STEP 2: Normalizing schedules...');
    const normalizeStart = Date.now();

    const normalizedSchedules = schedules.map(schedule => {
      let students = [];
      let mainCoach = null;

      if (schedule.scheduleType === 'private') {
        if (Array.isArray(schedule.students) && schedule.students.length > 0) {
          students = schedule.students.map(s => ({
            _id: s._id.toString(),
            studentId: s.studentId,
            fullName: s.fullName,
            classLevel: s.classLevel || ''
          }));
        } else if (schedule.studentId) {
          const s = schedule.studentId;
          students = [{
            _id: s._id.toString(),
            studentId: s.studentId,
            fullName: s.fullName || 'Unknown',
            classLevel: s.classLevel || ''
          }];
        }

        // ✅ Main coach untuk PRIVATE
        if (schedule.coachId) {
          mainCoach = {
            _id: schedule.coachId._id.toString(),
            coachId: schedule.coachId.coachId,
            fullName: schedule.coachId.fullName
          };
        }
      } 
      else if (schedule.scheduleType === 'group') {
        students = (schedule.students || []).map(s => ({
          _id: s._id.toString(),
          studentId: s.studentId,
          fullName: s.fullName,
          classLevel: s.classLevel || ''
        }));

        // ✅ FIXED: Cari coach yang match dengan user login
        if (Array.isArray(schedule.coaches) && schedule.coaches.length > 0) {
          if (userCoachObjectId) {
            // ✅ Cari coach yang match dengan user login
            const matchedCoach = schedule.coaches.find(c => {
              const cId = c._id?.toString?.() || c._id.toString();
              return cId === userCoachObjectId.toString();
            });

            if (matchedCoach) {
              mainCoach = {
                _id: matchedCoach._id.toString(),
                coachId: matchedCoach.coachId,
                fullName: matchedCoach.fullName
              };
              console.log(`   📌 GROUP: Matched - ${mainCoach.fullName}`);
            } else {
              // Jika admin atau coach tidak ada di group, ambil coach pertama
              mainCoach = {
                _id: schedule.coaches[0]._id.toString(),
                coachId: schedule.coaches[0].coachId,
                fullName: schedule.coaches[0].fullName
              };
            }
          } else {
            // Admin tanpa filter - ambil coach pertama
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

    const normalizeDuration = Date.now() - normalizeStart;
    console.log(`✅ Normalized (${normalizeDuration}ms)`);

    // ==================== GET EVALUATIONS ====================
    console.log('\n📋 STEP 3: Fetching evaluations...');
    const evalStart = Date.now();

    const scheduleIds = normalizedSchedules.map(s => s._id);
    
    const evaluations = await TrainingEvaluation
      .find({ scheduleId: { $in: scheduleIds } })
      .populate('studentId', '_id studentId fullName classLevel')
      .populate('coachIds', '_id coachId fullName')
      .lean()
      .exec();

    const evalDuration = Date.now() - evalStart;
    console.log(`✅ Found ${evaluations.length} evaluations (${evalDuration}ms)`);

    // ==================== BUILD EVALUATION MAP ====================
    const evaluationMap = new Map();
    evaluations.forEach(ev => {
      const scheduleId = ev.scheduleId.toString();
      if (!evaluationMap.has(scheduleId)) {
        evaluationMap.set(scheduleId, []);
      }

      evaluationMap.get(scheduleId).push({
        studentId: ev.studentId._id.toString(),
        studentName: ev.studentId.fullName,
        attendance: ev.attendance,
        notes: ev.notes || ''
      });
    });

    // ==================== BUILD COACH MAP ====================
    console.log('\n👥 STEP 4: Building coach map...');
    const mapStart = Date.now();

    const coachMap = new Map();

    normalizedSchedules.forEach((schedule) => {
      // ✅ Gunakan mainCoach yang sudah di-filter
      if (!schedule.mainCoach) {
        console.warn('⚠️ No mainCoach for schedule:', schedule._id);
        return;
      }

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

        console.log(`   ✅ Coach added: ${coach.fullName} (${coach.coachId})`);
      }

      const coachData = coachMap.get(coachKey);
      coachData.totalSessions++;

      if (schedule.status === 'completed') {
        coachData.completedSessions++;
      } else if (schedule.status === 'cancelled') {
        coachData.cancelledSessions++;
      } else if (new Date(schedule.date) > new Date()) {
        coachData.upcomingSessions++;
      }

      // Schedule type stats
      const scheduleType = schedule.scheduleType || 'Unknown';
      const programCategory = schedule.programCategory || 'General';
      const typeKey = `${scheduleType} (${programCategory})`;

      if (!coachData.scheduleTypeStats.has(typeKey)) {
        coachData.scheduleTypeStats.set(typeKey, {
          scheduleType,
          programCategory,
          totalSessions: 0,
          completedSessions: 0,
          cancelledSessions: 0,
          upcomingSessions: 0,
          totalStudents: new Set()
        });
      }

      const typeStats = coachData.scheduleTypeStats.get(typeKey);
      typeStats.totalSessions++;

      if (schedule.status === 'completed') {
        typeStats.completedSessions++;
      } else if (schedule.status === 'cancelled') {
        typeStats.cancelledSessions++;
      } else if (new Date(schedule.date) > new Date()) {
        typeStats.upcomingSessions++;
      }

      const students = schedule.students || [];
      students.forEach(s => {
        coachData.totalStudents.add(s._id);
        typeStats.totalStudents.add(s._id);
      });

      const scheduleEvaluations = evaluationMap.get(schedule._id.toString()) || [];

      coachData.sessions.push({
        scheduleId: schedule._id.toString(),
        scheduleType: schedule.scheduleType,
        program: schedule.program || 'Unknown',
        scheduleType: schedule.scheduleType || 'Unknown',
        programCategory: schedule.programCategory || 'General',
        scheduleDate: schedule.date,
        scheduleTime: `${schedule.startTime} - ${schedule.endTime}`,
        location: schedule.location || 'N/A',
        status: schedule.status,
        studentCount: students.length,
        students: students,
        evaluations: scheduleEvaluations
      });
    });

    const mapDuration = Date.now() - mapStart;
    console.log(`✅ Coach map built (${mapDuration}ms)`);

    // ==================== FORMAT RESPONSE ====================
    console.log('\n📦 STEP 5: Formatting response...');
    const formatStart = Date.now();

    const coachReports = Array.from(coachMap.values()).map(coach => {
      const scheduleTypeStats = {};
      coach.scheduleTypeStats.forEach((stats, typeKey) => {
        scheduleTypeStats[typeKey] = {
          scheduleType: stats.scheduleType,
          programCategory: stats.programCategory,
          totalSessions: stats.totalSessions,
          completedSessions: stats.completedSessions,
          cancelledSessions: stats.cancelledSessions,
          upcomingSessions: stats.upcomingSessions,
          totalStudents: stats.totalStudents.size
        };
      });

      return {
        coachId: coach.coachId,
        coachName: coach.coachName,
        totalSessions: coach.totalSessions,
        completedSessions: coach.completedSessions,
        cancelledSessions: coach.cancelledSessions,
        upcomingSessions: coach.upcomingSessions,
        totalStudents: coach.totalStudents.size,
        scheduleTypeStats: scheduleTypeStats,
        sessions: coach.sessions
      };
    });

    const formatDuration = Date.now() - formatStart;
    console.log(`✅ Formatted (${formatDuration}ms)`);

    const totalDuration = Date.now() - startTime;

    console.log('\n' + '='.repeat(100));
    console.log('✅ [COACH REPORT] COMPLETE');
    console.log('='.repeat(100));
    console.log('COACHES IN REPORT:', coachReports.map(c => `${c.coachName} (${c.coachId})`).join(', '));
    console.log('TIMING:', {
      fetch: `${fetchDuration}ms`,
      normalize: `${normalizeDuration}ms`,
      eval: `${evalDuration}ms`,
      map: `${mapDuration}ms`,
      format: `${formatDuration}ms`,
      TOTAL: `${totalDuration}ms`
    });
    console.log('');

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
        duration: `${totalDuration}ms`,
        dateRange: { startDate, endDate },
        userRole: req.user?.role,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
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

exports.exportReport = async (req, res) => {
  try {
    const { format, reportType, startDate, endDate, coachId, studentId } = req.query;

    console.log('\n' + '='.repeat(100));
    console.log('📥 Export request');
    console.log('='.repeat(100));
    console.log('   User:', {
      role: req.user?.role,
      coachId: req.user?.coachId  // ✅ Use from middleware
    });
    console.log('   Params:', { format, reportType, coachId });

    // Validation
    if (!format || !reportType) {
      return res.status(400).json({
        success: false,
        message: 'Format dan reportType required'
      });
    }

    if (!['pdf', 'excel'].includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Format hanya boleh pdf atau excel'
      });
    }

    const validReportTypes = ['coach', 'student-individual', 'financial'];
    if (!validReportTypes.includes(reportType)) {
      return res.status(400).json({
        success: false,
        message: 'Report type tidak valid'
      });
    }

    // ==================== COACH REPORT EXPORT ====================
    if (reportType === 'coach') {
      try {
        if (!startDate || !endDate) {
          return res.status(400).json({
            success: false,
            message: 'startDate dan endDate required'
          });
        }

        // ✅ PERMISSION: Coach hanya export PRIVATE miliknya
        if (req.user?.role === 'coach') {
          if (coachId && coachId !== req.user.coachId) {
            console.warn(`❌ Coach ${req.user.coachId} mencoba export private ${coachId}`);
            return res.status(403).json({
              success: false,
              message: 'Anda hanya bisa export PRIVATE laporan Anda sendiri'
            });
          }
        }

        console.log('✅ Permission passed');
const userCoachId = req.user.coachId;  // ✅ Dari middleware

// Pass ke helper


        const exportData = await reportHelper.getCoachExportData(
          startDate,
          endDate,
          coachId,
          req.user?.role,
          userCoachId  // ✅ Pass from middleware
        );

        const reportTitle = `Laporan Pelatih - ${new Date(startDate).toLocaleDateString('id-ID')} s/d ${new Date(endDate).toLocaleDateString('id-ID')}`;

        if (format === 'pdf') {
          console.log('📄 Generating PDF...');
          await reportHelper.exportToPDFBeautiful(
            res,
            reportTitle,
            exportData,
            'coach',
            startDate,
            endDate,
          );
        } else if (format === 'excel') {
          console.log('📊 Generating Excel...');
          await reportHelper.exportToExcelBeautiful(
            res,
            reportTitle,
            exportData,
            'coach'
          );
        }

      } catch (error) {
        console.error(`❌ Coach export error: ${error.message}`);
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
    }

    // ==================== STUDENT REPORT EXPORT ====================
    else if (reportType === 'student-individual') {
      try {
        if (!studentId) {
          return res.status(400).json({
            success: false,
            message: 'studentId required'
          });
        }

        if (!mongoose.Types.ObjectId.isValid(studentId)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid student ID'
          });
        }

        const exportData = await reportHelper.getStudentExportData(
          studentId,
          startDate,
          endDate
        );

        if (!exportData.student) {
          return res.status(404).json({
            success: false,
            message: 'Student tidak ditemukan'
          });
        }

        const reportTitle = `Laporan Siswa - ${exportData.student.fullName}`;

        if (format === 'pdf') {
          console.log('📄 Generating PDF...');
          await reportHelper.exportToPDFBeautiful(
            res,
            reportTitle,
            exportData,
            'student-individual',
            startDate,
            endDate
          );
        } else if (format === 'excel') {
          console.log('📊 Generating Excel...');
          await reportHelper.exportToExcelBeautiful(
            res,
            reportTitle,
            exportData,
            'student-individual'
          );
        }

      } catch (error) {
        console.error(`❌ Student export error: ${error.message}`);
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
    }

    // ==================== FINANCIAL REPORT EXPORT ====================
    else if (reportType === 'financial') {
      try {
        if (req.user?.role !== 'admin') {
          console.warn(`❌ ${req.user?.role} mencoba akses financial`);
          return res.status(403).json({
            success: false,
            message: 'Hanya admin yang bisa export laporan keuangan'
          });
        }

        const exportData = await reportHelper.getFinancialExportData(
          startDate,
          endDate
        );

        const reportTitle = `Laporan Keuangan - ${new Date().toLocaleDateString('id-ID')}`;

        if (format === 'pdf') {
          console.log('📄 Generating PDF...');
          await reportHelper.exportToPDFBeautiful(
            res,
            reportTitle,
            exportData,
            'financial',
            startDate,
            endDate
          );
        } else if (format === 'excel') {
          console.log('📊 Generating Excel...');
          await reportHelper.exportToExcelBeautiful(
            res,
            reportTitle,
            exportData,
            'financial'
          );
        }

      } catch (error) {
        console.error(`❌ Financial export error: ${error.message}`);
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
    }

    console.log('✅ Export completed\n');

  } catch (error) {
    console.error('❌ Export controller error:', error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};



module.exports = exports;
