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
exports.getStudentsListWithStats = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      sortBy = 'fullName', 
      order = 'asc', 
      classLevel,
      status = 'Aktif'  // ✅ Default to Aktif, but allow override
    } = req.query;

    console.log('📋 Getting students list with stats');
    console.log('   Query params:', { startDate, endDate, sortBy, order, classLevel, status });

    // ==================== BUILD STUDENT FILTER ====================
    let studentFilter = {};
    
    // Status filter
    if (status === 'all') {
      studentFilter.status = { $ne: 'deleted' };  // All except deleted
    } else {
      studentFilter.status = status;  // Specific status (e.g., 'Aktif')
    }
    
    // Class level filter
    if (classLevel) {
      studentFilter.classLevel = classLevel;
    }

    console.log('   Student filter:', studentFilter);

    // ==================== GET STUDENTS ====================
    const students = await Student.find(studentFilter)
      .select('_id studentId fullName classLevel status phone photo enrollmentDate')  // ✅ ADD PHONE!
      .sort({ fullName: 1 })
      .lean();

    console.log(`✅ Found ${students.length} students`);

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

    // ==================== GET EVALUATIONS ====================
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

    console.log(`✅ Found ${evaluations.length} evaluations`);

    // ==================== BUILD STATS MAP ====================
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
      
      // ✅ Case-insensitive comparison
      const attendance = (ev.attendance || '').toLowerCase();
      
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

    // ==================== MAP STUDENTS WITH STATS ====================
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
        phone: student.phone || null,  // ✅ INCLUDE PHONE!
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

    // ==================== SORTING ====================
    const validSortKeys = ['fullName', 'attendanceRate', 'totalSessions', 'hadir', 'studentId'];
    const sortKey = validSortKeys.includes(sortBy) ? sortBy : 'fullName';
    const sortOrder = order === 'desc' ? -1 : 1;

    studentsWithStats.sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];

      // Handle string comparison (case-insensitive)
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

    console.log(`✅ Sorted by ${sortKey} (${order})`);

    // ==================== RESPONSE ====================
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

    console.log('✅ Students list with stats sent successfully');

  } catch (error) {
    console.error('❌ Error getting students list:', error);
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
        { 'coaches._id': userCoachObjectId, scheduleType: { $in: ['semiPrivate', 'group'] } }
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

    // ==================== NORMALIZE SCHEDULES ====================
    console.log('\n📊 STEP 2: Normalizing schedules...');
    const normalizeStart = Date.now();

    const normalizedSchedules = schedules.map(schedule => {
      let students = [];
      let mainCoach = null;

      if (schedule.scheduleType === 'private') {
        // ✅ PRIVATE: Extract students
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

        // Main coach for PRIVATE
        if (schedule.coachId) {
          mainCoach = {
            _id: schedule.coachId._id.toString(),
            coachId: schedule.coachId.coachId,
            fullName: schedule.coachId.fullName
          };
        }
      }
      else if (schedule.scheduleType === 'semiPrivate' || schedule.scheduleType === 'group') {
        // ✅ SEMI PRIVATE / GROUP: Extract students
        students = (schedule.students || []).map(s => ({
          _id: s._id.toString(),
          studentId: s.studentId,
          fullName: s.fullName,
          classLevel: s.classLevel || ''
        }));

        // Main coach for SEMI PRIVATE / GROUP
        if (Array.isArray(schedule.coaches) && schedule.coaches.length > 0) {
          if (userCoachObjectId) {
            // Find coach that matches user login
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
            } else {
              // If admin or coach not in list, take first coach
              mainCoach = {
                _id: schedule.coaches[0]._id.toString(),
                coachId: schedule.coaches[0].coachId,
                fullName: schedule.coaches[0].fullName
              };
            }
          } else {
            // Admin without filter - take first coach
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
        attendance: ev.attendance || 'Tidak Hadir',  // ✅ Default if empty
        notes: ev.notes || ''
      });
    });

    // ✅ DEBUG: Print evaluation map
    console.log('\n🗂️ EVALUATION MAP:');
    evaluationMap.forEach((evals, scheduleId) => {
      console.log(`   Schedule ${scheduleId}:`);
      evals.forEach(ev => {
        console.log(`      - ${ev.studentName}: ${ev.attendance}`);
      });
    });

    // ==================== BUILD COACH MAP - ATTENDANCE-BASED ====================
    console.log('\n👥 STEP 4: Building coach map...');
    const mapStart = Date.now();

    const coachMap = new Map();

    normalizedSchedules.forEach((schedule) => {
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

      // ✅ GET EVALUATIONS FOR THIS SCHEDULE
      const scheduleEvaluations = evaluationMap.get(schedule._id.toString()) || [];

      console.log(`\n   📋 Processing Schedule: ${schedule._id}`);
      console.log(`      Type: ${schedule.scheduleType} (${schedule.programCategory})`);
      console.log(`      Status: ${schedule.status}`);
      console.log(`      Date: ${schedule.date}`);
      console.log(`      Evaluations: ${scheduleEvaluations.length}`);

      // ✅ CHECK ATTENDANCE STATUS
      let hasHadir = false;
      let hasCancelled = false;

      scheduleEvaluations.forEach(ev => {
        const attendance = (ev.attendance || '').toLowerCase().trim();
        
        console.log(`      → Student: ${ev.studentName} | Attendance: "${ev.attendance}" (normalized: "${attendance}")`);

        if (attendance === 'hadir') {
          hasHadir = true;
        } else if (attendance === 'sakit' || attendance === 'izin' || attendance === 'tidak hadir') {
          hasCancelled = true;
        }
      });

      console.log(`      → hasHadir: ${hasHadir}, hasCancelled: ${hasCancelled}`);

      // ✅ ATTENDANCE-BASED COUNTING LOGIC
      let isCompleted = false;
      let isCancelled = false;
      let isUpcoming = false;
      let resultStatus = '';

      if (schedule.status === 'cancelled' || schedule.status === 'rescheduled') {
        // 1. Schedule cancelled by system
        isCancelled = true;
        coachData.cancelledSessions++;
        resultStatus = 'CANCELLED (schedule status)';
      }
      else if (new Date(schedule.date) > new Date()) {
        // 2. Future schedule - upcoming
        isUpcoming = true;
        coachData.upcomingSessions++;
        resultStatus = 'UPCOMING (future date)';
      }
      else if (scheduleEvaluations.length === 0) {
        // 3. No evaluation yet - default cancelled
        isCancelled = true;
        coachData.cancelledSessions++;
        resultStatus = 'CANCELLED (no evaluation)';
      }
      else if (hasHadir) {
        // 4. At least one student present - COMPLETED
        isCompleted = true;
        coachData.completedSessions++;
        resultStatus = 'COMPLETED (has attendance)';
      }
      else if (hasCancelled) {
        // 5. All students absent (sakit/izin/tidak hadir) - CANCELLED
        isCancelled = true;
        coachData.cancelledSessions++;
        resultStatus = 'CANCELLED (all absent)';
      }
      else {
        // 6. Fallback to schedule status
        if (schedule.status === 'completed') {
          isCompleted = true;
          coachData.completedSessions++;
          resultStatus = 'COMPLETED (fallback to status)';
        } else {
          isCancelled = true;
          coachData.cancelledSessions++;
          resultStatus = 'CANCELLED (fallback)';
        }
      }

      console.log(`      ✅ Result: ${resultStatus}`);

      // ✅ Schedule type stats with same logic
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

      // ✅ Apply same counting logic to type stats
      if (isCompleted) {
        typeStats.completedSessions++;
      } else if (isCancelled) {
        typeStats.cancelledSessions++;
      } else if (isUpcoming) {
        typeStats.upcomingSessions++;
      }

      const students = schedule.students || [];
      students.forEach(s => {
        coachData.totalStudents.add(s._id);
        typeStats.totalStudents.add(s._id);
      });

      coachData.sessions.push({
        scheduleId: schedule._id.toString(),
        scheduleType: schedule.scheduleType || 'Unknown',
        program: schedule.program || 'Unknown',
        programCategory: schedule.programCategory || 'General',
        scheduleDate: schedule.date,
        scheduleTime: `${schedule.startTime} - ${schedule.endTime}`,
        location: schedule.location || 'N/A',
        status: schedule.status,
        computedStatus: isCompleted ? 'completed' : isCancelled ? 'cancelled' : 'upcoming',
        studentCount: students.length,
        students: students,
        evaluations: scheduleEvaluations
      });
    });

    const mapDuration = Date.now() - mapStart;
    console.log(`✅ Coach map built (${mapDuration}ms)`);

    // ✅ PRINT FINAL STATS FOR DEBUGGING
    console.log('\n📊 FINAL STATISTICS:');
    coachMap.forEach((coach) => {
      console.log(`\nCoach: ${coach.coachName} (${coach.coachId})`);
      console.log(`  Total: ${coach.totalSessions}, Completed: ${coach.completedSessions}, Cancelled: ${coach.cancelledSessions}, Upcoming: ${coach.upcomingSessions}`);
      
      coach.scheduleTypeStats.forEach((stats, typeKey) => {
        console.log(`  ${typeKey}:`);
        console.log(`    Total: ${stats.totalSessions}, Completed: ${stats.completedSessions}, Cancelled: ${stats.cancelledSessions}, Upcoming: ${stats.upcomingSessions}`);
      });
    });

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
    console.log('COACHES:', coachReports.map(c => `${c.coachName} (${c.coachId})`).join(', '));
    console.log('TIMING:', {
      fetch: `${fetchDuration}ms`,
      normalize: `${normalizeDuration}ms`,
      eval: `${evalDuration}ms`,
      map: `${mapDuration}ms`,
      format: `${formatDuration}ms`,
      TOTAL: `${totalDuration}ms`
    });
    console.log('='.repeat(100) + '\n');

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
    console.error('\n' + '='.repeat(100));
    console.error('❌ [COACH REPORT] ERROR');
    console.error('='.repeat(100));
    console.error('   Error:', error.message);
    console.error('   Stack:', error.stack);
    console.error('='.repeat(100) + '\n');

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
exports.generateAndSendStudentPDFToWhatsApp = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, message } = req.body;

    console.log('📱 Generate & send student PDF to WhatsApp...');
    console.log('   Student ID:', id);
    console.log('   Date range:', { startDate, endDate });

    // ==================== GET STUDENT DATA ====================
    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check phone number
    if (!student.phone) {
      return res.status(400).json({
        success: false,
        message: 'Nomor HP siswa tidak tersedia. Silakan update data siswa terlebih dahulu.'
      });
    }

    console.log('   Student:', student.fullName);
    console.log('   Phone:', student.phone);

    // ==================== GET REPORT DATA ====================
    // ✅ REUSE EXISTING HELPER
    const data = await reportHelper.getStudentExportData(id, startDate, endDate);

    console.log(`   History count: ${data.history.length}`);

    // Calculate stats
    const stats = {
      total: data.history.length,
      hadir: data.history.filter(h => h.attendance === 'hadir').length,
      tidakHadir: data.history.filter(h => h.attendance === 'tidak hadir').length,
      izin: data.history.filter(h => h.attendance === 'izin').length,
      sakit: data.history.filter(h => h.attendance === 'sakit').length
    };
    stats.attendanceRate = stats.total > 0 
      ? Math.round((stats.hadir / stats.total) * 100) 
      : 0;

    console.log('   Stats:', stats);

    // ==================== GENERATE PDF TO TEMP FILE ====================
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const pdfPath = path.join(tempDir, `student-report-${id}-${Date.now()}.pdf`);
    
    // ✅ REUSE EXISTING PDF GENERATOR - Write to file instead of response
    const writeStream = fs.createWriteStream(pdfPath);
    
    // Create a mock response object that writes to file
    const mockRes = {
      setHeader: () => {},
      headersSent: false,
      pipe: (stream) => stream,
      // Pipe PDFDocument output to file
      write: (chunk) => writeStream.write(chunk),
      end: () => {
        writeStream.end();
      }
    };

    // ✅ Call existing helper with mock response
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);

      // Use existing helper
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
      doc.pipe(writeStream);

      // ✅ REUSE EXISTING RENDERING LOGIC
      // Copy from renderStudentPDF in reportHelper.js
      const title = 'Laporan Riwayat Latihan';
      const startDateStr = startDate || 'Semua';
      const endDateStr = endDate || 'Semua';

      // Header
      doc.rect(0, 0, doc.page.width, 100).fill('#0ea5e9');
      doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold')
         .text('LAFI SWIMMING ACADEMY', 50, 20, { align: 'center' });
      doc.fontSize(14).text(title, 50, 45, { align: 'center' });
      doc.fontSize(9).font('Helvetica')
         .text(`Periode: ${startDateStr} s/d ${endDateStr}`, 50, 65, { align: 'center' });
      doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}`, 50, 78, { align: 'center' });

      doc.moveDown(2).fillColor('#000000');

      // Student Info
      let y = 125;
      doc.roundedRect(50, y, doc.page.width - 100, 65, 5)
        .fillAndStroke('#f0f9ff', '#0ea5e9');
      doc.fillColor('#0ea5e9').fontSize(12).font('Helvetica-Bold')
        .text(`SISWA: ${data.student.fullName}`, 70, y + 10);
      doc.fontSize(9).fillColor('#1e293b').font('Helvetica')
        .text(`ID: ${data.student.studentId}`, 70, y + 28)
        .text(`Total Sesi: ${data.history.length}`, 70, y + 42)
        .text(`Hadir: ${stats.hadir} | Tingkat Kehadiran: ${stats.attendanceRate}%`, 70, y + 56);

      y += 75;

      // Table Header
      doc.rect(50, y, doc.page.width - 100, 16).fill('#0ea5e9');
      doc.fillColor('#fff').fontSize(6).font('Helvetica-Bold')
        .text('Tanggal', 60, y + 4, { width: 40 })
        .text('Waktu', 105, y + 4, { width: 35 })
        .text('Tipe', 145, y + 4, { width: 30 })
        .text('Kategori', 180, y + 4, { width: 35 })
        .text('Program', 220, y + 4, { width: 40 })
        .text('Pelatih', 265, y + 4, { width: 60 })
        .text('Kehadiran', 330, y + 4, { width: 35 })
        .text('Catatan', 370, y + 4, { width: 125 });

      y += 18;

      // History rows
      data.history.forEach((item, i) => {
        if (y > doc.page.height - 100) {
          doc.addPage();
          y = 50;
        }

        const bgColor = i % 2 === 0 ? '#f9fafb' : '#ffffff';
        doc.rect(50, y, doc.page.width - 100, 14).fill(bgColor);

        doc.fillColor('#000').fontSize(5.5).font('Helvetica')
          .text(new Date(item.date).toLocaleDateString('id-ID'), 60, y + 2, { width: 40 })
          .text(item.time, 105, y + 2, { width: 35 })
          .text(item.scheduleType || '-', 145, y + 2, { width: 30 })
          .text(item.programCategory, 180, y + 2, { width: 35 })
          .text(item.program, 220, y + 2, { width: 40 })
          .text(item.coachNames, 265, y + 2, { width: 60 })
          .text(item.attendance, 330, y + 2, { width: 35 })
          .text(item.notes, 370, y + 2, { width: 125 });

        y += 14;
      });

      // Footer
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.moveTo(50, doc.page.height - 45)
          .lineTo(doc.page.width - 50, doc.page.height - 45)
          .stroke('#e5e7eb');
        doc.fontSize(8).fillColor('#6b7280')
          .text(`Halaman ${i + 1} dari ${pages.count}`, 50, doc.page.height - 35, { 
            align: 'center', 
            width: doc.page.width - 100 
          });
      }

      doc.end();
    });

    console.log('   ✅ PDF generated:', pdfPath);

    // ==================== SEND VIA WHATSAPP ====================
    if (!whatsappService.isReady()) {
      // Clean up PDF
      fs.unlinkSync(pdfPath);
      
      return res.status(503).json({
        success: false,
        message: 'WhatsApp service tidak tersedia saat ini'
      });
    }

    // Custom message or default
    const whatsappMessage = message || 
      `Halo ${student.fullName}! 👋\n\n` +
      `Berikut adalah laporan riwayat latihan Anda di Lafi Swimming Academy.\n\n` +
      `📊 *Statistik:*\n` +
      `Total Sesi: ${stats.total}\n` +
      `✅ Hadir: ${stats.hadir} sesi\n` +
      `📈 Tingkat Kehadiran: ${stats.attendanceRate}%\n\n` +
      `Terima kasih atas dedikasi Anda! 💪\n\n` +
      `*Lafi Swimming Academy*\n` +
      `📱 WA: 0821-4004-4677`;

    // Send document via WhatsApp
    const result = await whatsappService.sendDocument(
      student.phone,
      pdfPath,
      whatsappMessage,
      {
        recipientName: student.fullName,
        documentType: 'student-report',
        studentId: student._id
      }
    );

    // Clean up PDF file
    fs.unlinkSync(pdfPath);
    console.log('   🗑️ PDF file cleaned up');

    console.log('   ✅ Report sent to WhatsApp!');

    res.json({
      success: true,
      message: `Laporan berhasil dikirim ke WhatsApp ${student.fullName}!`,
      data: {
        student: {
          id: student._id,
          name: student.fullName,
          phone: student.phone
        },
        stats,
        sentAt: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengirim laporan ke WhatsApp',
      error: error.message
    });
  }
};



module.exports = exports;
