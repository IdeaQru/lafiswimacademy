// backend/src/controllers/evaluationController.js - COMPLETE FINAL VERSION

const mongoose = require('mongoose');
const TrainingEvaluation = require('../models/TrainingEvaluation');
const SessionCounter = require('../models/SessionCounter');
const TrainingLogger = require('../models/TrainingLogger');
const Schedule = require('../models/Schedule');
const Student = require('../models/Student');
const Coach = require('../models/Coach');

// ==================== BULK CREATE/UPDATE EVALUATION ====================

/**
 * POST /api/evaluations/bulk
 * ✅ COMPLETE: Handle BOTH PRIVATE & GROUP
 * - Private: 1 coach
 * - Group: multiple coaches
 */
exports.bulkCreateEvaluation = async (req, res) => {
  try {
    const { scheduleId, coachId, trainingDate, evaluations } = req.body;

    console.log('\n' + '='.repeat(100));
    console.log('📥 [BULK EVALUATION] START');
    console.log('='.repeat(100));
    console.log('   Received:', {
      scheduleId,
      coachId,
      evaluationsCount: evaluations?.length,
      userId: req.user?._id
    });

    // ==================== VALIDATION ====================
    if (!scheduleId || !evaluations || evaluations.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'scheduleId dan evaluations required'
      });
    }

    // ==================== GET SCHEDULE ====================
    const schedule = await Schedule.findById(scheduleId)
      .populate('coachId', '_id coachId fullName')
      .populate('coaches', '_id coachId fullName')
      .populate('students', '_id')
      .populate('studentId', '_id');

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule tidak ditemukan'
      });
    }

    console.log(`✅ Schedule found: ${schedule._id}`);
    console.log(`   Type: ${schedule.scheduleType}`);

    // ==================== DETERMINE COACH ARRAY ====================
    let scheduleCoachIds = [];
    let allCoachObjectData = [];

    if (schedule.scheduleType === 'private') {
      if (schedule.coachId) {
        scheduleCoachIds = [schedule.coachId._id];
        allCoachObjectData = [schedule.coachId];
        console.log(`   👨‍🏫 PRIVATE: Coach = ${schedule.coachId.fullName}`);
      }
    } else if (schedule.scheduleType === 'group') {
      if (schedule.coaches && schedule.coaches.length > 0) {
        scheduleCoachIds = schedule.coaches.map(c => c._id);
        allCoachObjectData = schedule.coaches;
        console.log(`   👥 GROUP: ${schedule.coaches.length} coaches`);
      }
    }

    if (scheduleCoachIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Schedule tidak memiliki coach'
      });
    }

    // ==================== PERMISSION CHECK ====================
    if (req.user.role === 'coach') {
      const isCoachInSchedule = scheduleCoachIds.some(
        cId => cId.toString() === req.user.coachId?.toString()
      );

      if (!isCoachInSchedule) {
        return res.status(403).json({
          success: false,
          message: 'Anda tidak punya akses ke schedule ini'
        });
      }
    }

    // ==================== GET CURRENT COACH OBJECT ====================
    let actualCoachObjectId;
    let coachObject = null;
    
    if (coachId) {
      // Find dari allCoachObjectData dulu
      coachObject = allCoachObjectData.find(c => 
        c.coachId === coachId || c._id.toString() === coachId
      );

      if (!coachObject) {
        // Jika tidak ketemu, cari di database
        if (coachId.match(/^[0-9a-fA-F]{24}$/)) {
          coachObject = await Coach.findById(coachId).lean();
        } else {
          coachObject = await Coach.findOne({ coachId: coachId }).lean();
        }
      }

      if (!coachObject) {
        return res.status(404).json({
          success: false,
          message: `Coach ${coachId} tidak ditemukan`
        });
      }

      actualCoachObjectId = coachObject._id.toString();
    } else {
      // Use first coach dari schedule
      coachObject = allCoachObjectData[0];
      actualCoachObjectId = coachObject._id.toString();
    }

    console.log(`✅ Current coach: ${coachObject?.fullName}`);

    // ==================== SAVE EVALUATIONS ====================
    const promises = evaluations.map(async (evalItem) => {
      try {
        let studentObjectId;
        
        if (evalItem.studentId.match?.(/^[0-9a-fA-F]{24}$/)) {
          studentObjectId = evalItem.studentId;
        } else {
          const student = await Student.findOne({ studentId: evalItem.studentId }).lean();
          if (!student) {
            throw new Error(`Student ${evalItem.studentId} not found`);
          }
          studentObjectId = student._id.toString();
        }

        // ✅ Find by scheduleId + studentId (merge evaluations)
        let evaluation = await TrainingEvaluation.findOne({
          scheduleId,
          studentId: studentObjectId
        });

        if (evaluation) {
          // ✅ UPDATE: Add current coach if not in array
          const coachIdObj = new mongoose.Types.ObjectId(actualCoachObjectId);
          const coachAlreadyExists = evaluation.coachIds.some(
            id => id.toString() === coachIdObj.toString()
          );

          if (!coachAlreadyExists) {
            evaluation.coachIds.push(coachIdObj);
          }

          // Update attendance & training date
          evaluation.attendance = evalItem.attendance;
          evaluation.trainingDate = trainingDate || schedule.date;
          evaluation.updatedBy = req.user?._id;

          // ✅ Add to coachNotes history
          evaluation.coachNotes.push({
            coachId: coachIdObj,
            coachName: coachObject.fullName,
            notes: evalItem.notes || '',
            addedAt: new Date()
          });

          // Rebuild combined notes dari semua coaches
          const combinedNotes = evaluation.coachNotes
            .sort((a, b) => new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime())
            .map(cn => `[${cn.coachName}]: ${cn.notes}`)
            .filter(note => note.trim() !== `[${coachObject.fullName}]: `)
            .join('\n');

          evaluation.notes = combinedNotes;
          await evaluation.save();

          console.log(`   ✅ Updated: ${evalItem.studentId} by ${coachObject?.fullName}`);
          return evaluation;
        } else {
          // ✅ CREATE: New evaluation dengan SEMUA coaches dari schedule
          const newEvaluation = new TrainingEvaluation({
            scheduleId,
            studentId: studentObjectId,
            coachIds: scheduleCoachIds,
            trainingDate: trainingDate || schedule.date,
            attendance: evalItem.attendance,
            notes: `[${coachObject.fullName}]: ${evalItem.notes || ''}`,
            coachNotes: [{
              coachId: new mongoose.Types.ObjectId(actualCoachObjectId),
              coachName: coachObject.fullName,
              notes: evalItem.notes || '',
              addedAt: new Date()
            }],
            createdBy: req.user?._id,
            updatedBy: req.user?._id
          });

          await newEvaluation.save();
          console.log(`   ✅ Created: ${evalItem.studentId} by ${coachObject?.fullName}`);
          return newEvaluation;
        }

        await SessionCounter.getOrCreateCounter(studentObjectId);
      } catch (error) {
        console.error(`   ❌ Error ${evalItem.studentId}:`, error.message);
        return null;
      }
    });

    const results = await Promise.all(promises);
    const successfulResults = results.filter(r => r !== null);

    if (successfulResults.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No evaluations saved'
      });
    }

    console.log(`✅ Saved ${successfulResults.length}/${evaluations.length}`);
    console.log('='.repeat(100) + '\n');

    res.status(200).json({
      success: true,
      message: `${successfulResults.length} evaluasi berhasil disimpan oleh ${coachObject?.fullName}`,
      data: successfulResults
    });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== GET EVALUATIONS BY SCHEDULE ====================

/**
 * GET /api/evaluations/schedule/:scheduleId
 * ✅ Get evaluations dengan coach array + notes history
 */
exports.getEvaluationsBySchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;

    console.log('📋 Getting evaluations for schedule:', scheduleId);

    const schedule = await Schedule.findById(scheduleId)
      .populate('coachId')
      .populate('coaches');

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule tidak ditemukan'
      });
    }

    // ==================== PERMISSION CHECK ====================
    let scheduleCoachIds = [];
    if (schedule.scheduleType === 'private' && schedule.coachId) {
      scheduleCoachIds = [schedule.coachId._id];
    } else if (schedule.scheduleType === 'group' && schedule.coaches) {
      scheduleCoachIds = schedule.coaches.map(c => c._id);
    }

    if (req.user.role === 'coach') {
      const isCoachInSchedule = scheduleCoachIds.some(
        cId => cId.toString() === req.user.coachId?.toString()
      );

      if (!isCoachInSchedule) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    // ==================== GET EVALUATIONS ====================
    const evaluations = await TrainingEvaluation.find({ scheduleId })
      .populate('studentId', 'studentId fullName classLevel')
      .populate('coachIds', 'coachId fullName')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`✅ Found ${evaluations.length} evaluations`);

    // ✅ Group by student
    const mergedByStudent = {};
    
    evaluations.forEach(evaluation => {
      const studentId = evaluation.studentId._id.toString();
      
      if (!mergedByStudent[studentId]) {
        mergedByStudent[studentId] = {
          studentId: evaluation.studentId.studentId,
          studentName: evaluation.studentId.fullName,
          studentLevel: evaluation.studentId.classLevel,
          evaluationsFromCoaches: [],
          coachNotesHistory: evaluation.coachNotes || []
        };
      }

      evaluation.coachIds.forEach(coach => {
        mergedByStudent[studentId].evaluationsFromCoaches.push({
          coachId: coach.coachId,
          coachName: coach.fullName,
          attendance: evaluation.attendance,
          notes: evaluation.notes
        });
      });
    });

    res.status(200).json({
      success: true,
      count: Object.keys(mergedByStudent).length,
      data: Object.values(mergedByStudent)
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
 * GET /api/evaluations/coach-report
 * ✅ COMPLETE: Handle BOTH PRIVATE & GROUP
 */
exports.getCoachReport = async (req, res) => {
  try {
    const { startDate, endDate, coachId } = req.query;

    console.log('\n' + '='.repeat(100));
    console.log('📊 [COACH REPORT] START');
    console.log('='.repeat(100));

    const scheduleFilter = {};
    
    if (startDate && endDate) {
      scheduleFilter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    let coachObjectId = null;
    
    if (coachId) {
      if (coachId.match(/^[0-9a-fA-F]{24}$/)) {
        coachObjectId = new mongoose.Types.ObjectId(coachId);
      } else {
        const coach = await Coach.findOne({ coachId: coachId }).lean();
        if (coach) coachObjectId = coach._id;
      }
    }

    if (coachObjectId) {
      scheduleFilter.$or = [
        { coachId: coachObjectId, scheduleType: 'private' },
        { 'coaches._id': coachObjectId, scheduleType: 'group' }
      ];
    }

    // ✅ Fetch schedules dengan FULL populate
    const schedules = await Schedule.find(scheduleFilter)
      .populate('coachId', '_id coachId fullName specialization phone')
      .populate('studentId', '_id studentId fullName classLevel phone')
      .populate('students', '_id studentId fullName classLevel phone')
      .populate('coaches', '_id coachId fullName specialization phone')
      .lean()
      .sort({ date: -1 })
      .exec();

    console.log(`✅ Found ${schedules.length} schedules`);

    // ==================== NORMALIZE STUDENTS ====================
    const normalizedSchedules = schedules.map(schedule => {
      let students = [];

      if (schedule.scheduleType === 'private') {
        // Case 1: Private dengan students array
        if (Array.isArray(schedule.students) && schedule.students.length > 0) {
          students = schedule.students.map(s => ({
            _id: s._id.toString(),
            studentId: s.studentId || s._id.toString(),
            fullName: s.fullName,
            classLevel: s.classLevel || ''
          }));
        }
        // Case 2: Private tanpa students - ambil dari studentId
        else if (schedule.studentId) {
          const s = schedule.studentId;
          students = [{
            _id: s._id.toString(),
            studentId: s.studentId || s._id.toString(),
            fullName: s.fullName || 'Unknown',
            classLevel: s.classLevel || ''
          }];
        }
      } else if (schedule.scheduleType === 'group') {
        // Group dengan students array
        if (Array.isArray(schedule.students)) {
          students = schedule.students.map(s => ({
            _id: s._id.toString(),
            studentId: s.studentId || s._id.toString(),
            fullName: s.fullName,
            classLevel: s.classLevel || ''
          }));
        }
      }

      return { ...schedule, students };
    });

    console.log(`✅ ${normalizedSchedules.length} schedules normalized`);

    // ==================== GET EVALUATIONS ====================
    const scheduleIds = normalizedSchedules.map(s => s._id);
    
    const evaluations = await TrainingEvaluation
      .find({ scheduleId: { $in: scheduleIds } })
      .populate('studentId', '_id studentId fullName classLevel')
      .populate('coachIds', 'coachId fullName')
      .lean()
      .exec();

    console.log(`✅ Found ${evaluations.length} evaluations`);

    // ==================== BUILD MAPS ====================
    const evaluationMap = {};
    evaluations.forEach(ev => {
      const scheduleId = ev.scheduleId.toString();
      if (!evaluationMap[scheduleId]) {
        evaluationMap[scheduleId] = [];
      }
      evaluationMap[scheduleId].push({
        studentId: ev.studentId._id.toString(),
        studentName: ev.studentId.fullName,
        studentLevel: ev.studentId.classLevel,
        attendance: ev.attendance,
        notes: ev.notes || '',
        coachNames: (ev.coachIds || []).map(c => c.fullName).join(', '),
        coachEvaluations: (ev.coachIds || []).map(c => ({
          coachId: c._id.toString(),
          coachName: c.fullName,
          attendance: ev.attendance,
          notes: ev.notes
        })),
        coachNotesHistory: (ev.coachNotes || []).map(cn => ({
          coachName: cn.coachName,
          notes: cn.notes,
          addedAt: cn.addedAt
        }))
      });
    });

    // ==================== BUILD COACH MAP ====================
    const coachMap = {};
    
    normalizedSchedules.forEach((schedule) => {
      let coachsForThisSchedule = [];

      if (schedule.scheduleType === 'private' && schedule.coachId) {
        coachsForThisSchedule = [schedule.coachId];
      } 
      else if (schedule.scheduleType === 'group' && Array.isArray(schedule.coaches)) {
        coachsForThisSchedule = schedule.coaches;
      }

      coachsForThisSchedule.forEach((coach) => {
        if (!coach) return;

        const coachObjectId = coach._id.toString();
        const coachKey = coach.coachId || coachObjectId;
        
        if (!coachMap[coachKey]) {
          coachMap[coachKey] = {
            coachId: coachKey,
            coachName: coach.fullName,
            specialization: coach.specialization || '',
            totalSessions: 0,
            completedSessions: 0,
            cancelledSessions: 0,
            upcomingSessions: 0,
            totalStudents: new Set(),
            sessions: []
          };
        }

        coachMap[coachKey].totalSessions++;
        
        if (schedule.status === 'completed') {
          coachMap[coachKey].completedSessions++;
        } else if (schedule.status === 'cancelled') {
          coachMap[coachKey].cancelledSessions++;
        } else if (new Date(schedule.date) > new Date()) {
          coachMap[coachKey].upcomingSessions++;
        }

        const scheduleEvaluations = evaluationMap[schedule._id.toString()] || [];
        const students = schedule.students || [];

        students.forEach(s => {
          coachMap[coachKey].totalStudents.add(s._id);
        });

        coachMap[coachKey].sessions.push({
          scheduleId: schedule._id.toString(),
          scheduleType: schedule.scheduleType,
          groupName: schedule.groupName || '',
          program: schedule.program || 'Unknown',
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
    });

    // ==================== FORMAT RESPONSE ====================
    const coachReports = Object.values(coachMap).map(coach => ({
      coachId: coach.coachId,
      coachName: coach.coachName,
      specialization: coach.specialization,
      totalSessions: coach.totalSessions,
      completedSessions: coach.completedSessions,
      cancelledSessions: coach.cancelledSessions,
      upcomingSessions: coach.upcomingSessions,
      totalStudents: coach.totalStudents.size,
      sessions: coach.sessions
    }));

    console.log('\n' + '='.repeat(100));
    console.log('✅ FINAL RESULT:');
    console.log('='.repeat(100));
    coachReports.forEach(coach => {
      console.log(`\nCoach: ${coach.coachName}`);
      coach.sessions.forEach((s, idx) => {
        const status = s.studentCount > 0 ? '✅' : '❌';
        console.log(`  [${idx}] ${s.scheduleType}: ${s.studentCount} students ${status}`);
      });
    });

    const data = {
      stats: {
        totalCoaches: coachReports.length,
        totalSessions: normalizedSchedules.length,
        totalEvaluations: evaluations.length
      },
      coachReports
    };

    res.status(200).json({
      success: true,
      data,
      meta: {
        dateRange: { startDate, endDate },
        filteredCoach: coachId || 'all',
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

// ==================== GET STUDENT HISTORY ====================

/**
 * GET /api/evaluations/student/:studentId
 * ✅ Get student attendance history
 */
exports.getStudentHistory = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate, limit = 50 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID'
      });
    }

    const filter = { studentId: new mongoose.Types.ObjectId(studentId) };
    if (startDate && endDate) {
      filter.trainingDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const evaluations = await TrainingEvaluation.find(filter)
      .populate('coachIds', 'coachId fullName')
      .populate('scheduleId', 'location startTime endTime program')
      .sort({ trainingDate: -1 })
      .limit(parseInt(limit))
      .lean();

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

    res.status(200).json({
      success: true,
      data: {
        student: await Student.findById(studentId)
          .select('studentId fullName photo classLevel status')
          .lean(),
        stats,
        history: evaluations.map(e => ({
          date: e.trainingDate,
          coaches: e.coachIds?.map(c => c.fullName).join(', ') || '-',
          attendance: e.attendance,
          notes: e.notes,
          coachNotesHistory: e.coachNotes || [],
          location: e.scheduleId?.location || '-'
        }))
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

// ==================== DELETE EVALUATION ====================

/**
 * DELETE /api/evaluations/:id
 */
exports.deleteEvaluation = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid evaluation ID'
      });
    }

    const evaluation = await TrainingEvaluation.findById(id);

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation tidak ditemukan'
      });
    }

    await TrainingLogger.logDelete(evaluation.studentId, {
      _id: evaluation._id,
      scheduleId: evaluation.scheduleId,
      attendance: evaluation.attendance,
      trainingDate: evaluation.trainingDate,
      notes: evaluation.notes,
      coachIds: evaluation.coachIds,
      coachNotes: evaluation.coachNotes
    });

    await TrainingEvaluation.findByIdAndDelete(id);

    console.log('✅ Evaluation deleted:', id);

    res.status(200).json({
      success: true,
      message: 'Evaluation berhasil dihapus'
    });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== RESET TRAINING COUNT ====================

/**
 * POST /api/evaluations/reset/:studentId
 * ✅ Reset CURRENT MONTH ONLY
 */
exports.resetTrainingCount = async (req, res) => {
  try {
    const { studentId } = req.params;

    console.log('🔄 RESET CURRENT MONTH');

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID'
      });
    }

    const studentObjectId = new mongoose.Types.ObjectId(studentId);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const evaluationsToDelete = await TrainingEvaluation.find({
      studentId: studentObjectId,
      trainingDate: {
        $gte: new Date(currentYear, currentMonth - 1, 1),
        $lte: new Date(currentYear, currentMonth, 0, 23, 59, 59)
      }
    });

    if (evaluationsToDelete.length > 0) {
      await TrainingLogger.logReset(studentObjectId, currentYear, currentMonth, evaluationsToDelete);
      await TrainingEvaluation.deleteMany({
        studentId: studentObjectId,
        trainingDate: {
          $gte: new Date(currentYear, currentMonth - 1, 1),
          $lte: new Date(currentYear, currentMonth, 0, 23, 59, 59)
        }
      });
    }

    const counter = await SessionCounter.getOrCreateCounter(studentObjectId);
    const resetResult = counter.recordReset();
    await counter.save();

    console.log('✅ RESET COMPLETE');

    res.status(200).json({
      success: true,
      message: resetResult.message,
      data: {
        deletedEvaluations: evaluationsToDelete.length,
        resetCount: counter.resetCount
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

// ==================== RESET ALL ====================

/**
 * POST /api/evaluations/reset-all/:studentId
 */
exports.resetAllTrainingCount = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID'
      });
    }

    const studentObjectId = new mongoose.Types.ObjectId(studentId);

    const allEvaluations = await TrainingEvaluation.find({ studentId: studentObjectId });
    
    if (allEvaluations.length > 0) {
      const grouped = {};
      
      allEvaluations.forEach(evaluation => {
        const date = new Date(evaluation.trainingDate);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const key = `${year}-${month}`;
        
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(evaluation);
      });

      for (const [monthKey, evaluations] of Object.entries(grouped)) {
        const [year, month] = monthKey.split('-');
        await TrainingLogger.logReset(
          studentObjectId,
          parseInt(year),
          parseInt(month),
          evaluations
        );
      }

      await TrainingEvaluation.deleteMany({ studentId: studentObjectId });
    }

    const counter = await SessionCounter.getOrCreateCounter(studentObjectId);
    const resetResult = counter.recordReset();
    await counter.save();

    res.status(200).json({
      success: true,
      message: `Semua ${allEvaluations.length} training records telah di-reset`,
      data: {
        totalDeleted: allEvaluations.length,
        resetCount: counter.resetCount
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

// ==================== GET TRAINING PROGRESS ====================

/**
 * GET /api/evaluations/progress/:studentId
 */
exports.getTrainingProgress = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID'
      });
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const monthCount = await TrainingEvaluation.getMonthCount(studentId, currentYear, currentMonth);
    const totalCount = await TrainingEvaluation.getTotalCount(studentId);
    const counter = await SessionCounter.getOrCreateCounter(studentId);

    const progress = {
      monthCount,
      totalCount,
      carryOver: Math.max(0, totalCount - monthCount),
      message: `${monthCount} bulan ini, ${Math.max(0, totalCount - monthCount)} sebelumnya = ${totalCount} total`
    };

    res.status(200).json({
      success: true,
      data: {
        ...progress,
        counter: await counter.getStatus()
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

module.exports = exports;
