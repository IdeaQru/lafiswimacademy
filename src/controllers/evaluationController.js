// backend/src/controllers/evaluationController.js

const mongoose = require('mongoose');
const TrainingEvaluation = require('../models/TrainingEvaluation');
const SessionCounter = require('../models/SessionCounter');
const TrainingLogger = require('../models/TrainingLogger');
const Schedule = require('../models/Schedule');
const Student = require('../models/Student');
const Coach = require('../models/Coach');

// ==================== BULK CREATE/UPDATE EVALUATION ====================

exports.bulkCreateEvaluation = async (req, res) => {
  try {
    const { scheduleId, coachId, trainingDate, evaluations } = req.body;

    console.log('📥 Received evaluation data:', JSON.stringify({ scheduleId, coachId, evaluations }, null, 2));

    const schedule = await Schedule.findById(scheduleId).populate('coachId');
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule tidak ditemukan'
      });
    }

    let actualCoachObjectId;
    
    if (coachId) {
      if (coachId.match(/^[0-9a-fA-F]{24}$/)) {
        actualCoachObjectId = coachId;
        console.log(`✅ Valid CoachId ObjectId: ${actualCoachObjectId}`);
      } else {
        const coach = await Coach.findOne({ coachId: coachId }).lean();
        
        if (!coach) {
          return res.status(404).json({
            success: false,
            message: `Pelatih dengan ID ${coachId} tidak ditemukan`
          });
        }
        
        actualCoachObjectId = coach._id.toString();
        console.log(`✅ Found coach ObjectId: ${actualCoachObjectId}`);
      }
    } else {
      actualCoachObjectId = schedule.coachId._id ? schedule.coachId._id.toString() : schedule.coachId.toString();
      console.log(`✅ Using coachId from schedule: ${actualCoachObjectId}`);
    }

    const promises = evaluations.map(async (evalItem) => {
      try {
        let studentObjectId;
        
        if (evalItem.studentId.match(/^[0-9a-fA-F]{24}$/)) {
          studentObjectId = evalItem.studentId;
          console.log(`✅ Valid StudentId ObjectId: ${studentObjectId}`);
        } else {
          const student = await Student.findOne({ studentId: evalItem.studentId }).lean();
          
          if (!student) {
            throw new Error(`Student dengan ID ${evalItem.studentId} tidak ditemukan`);
          }
          
          studentObjectId = student._id.toString();
          console.log(`✅ Found student ObjectId: ${studentObjectId}`);
        }

        const evaluation = await TrainingEvaluation.findOneAndUpdate(
          { scheduleId, studentId: studentObjectId },
          {
            scheduleId,
            studentId: studentObjectId,
            coachId: actualCoachObjectId,
            trainingDate: trainingDate || schedule.date,
            attendance: evalItem.attendance,
            notes: evalItem.notes || '',
            createdBy: req.user?._id
          },
          { upsert: true, new: true }
        );

        await SessionCounter.getOrCreateCounter(studentObjectId);
        
        return evaluation;
        
      } catch (error) {
        console.error(`❌ Error processing evaluation for ${evalItem.studentId}:`, error.message);
        return null;
      }
    });

    const results = await Promise.all(promises);
    const successfulResults = results.filter(r => r !== null);

    if (successfulResults.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak ada evaluasi yang berhasil disimpan. Periksa ID siswa dan pelatih.'
      });
    }

    console.log(`✅ Saved ${successfulResults.length} of ${evaluations.length} evaluations`);

    res.status(200).json({
      success: true,
      message: `${successfulResults.length} evaluasi berhasil disimpan`,
      data: successfulResults
    });
  } catch (error) {
    console.error('❌ Error creating evaluations:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== GET EVALUATIONS BY SCHEDULE ====================

exports.getEvaluationsBySchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;

    const evaluations = await TrainingEvaluation.find({ scheduleId })
      .populate('studentId', 'studentId fullName photo classLevel')
      .populate('coachId', 'fullName')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: evaluations.length,
      data: evaluations
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== GET STUDENT ATTENDANCE HISTORY ====================

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
      .populate('coachId', 'fullName')
      .populate('scheduleId', 'location scheduleTime classLevel')
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
        history: evaluations
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

exports.getCoachReport = async (req, res) => {
  try {
    const { coachId, startDate, endDate } = req.query;

    const filter = {};
    if (coachId) {
      if (coachId.match(/^[0-9a-fA-F]{24}$/)) {
        filter.coachId = new mongoose.Types.ObjectId(coachId);
      } else {
        const coach = await Coach.findOne({ coachId: coachId }).lean();
        if (coach) {
          filter.coachId = coach._id;
        }
      }
    }
    
    if (startDate && endDate) {
      filter.trainingDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const evaluations = await TrainingEvaluation.find(filter)
      .populate('studentId', 'studentId fullName classLevel')
      .populate('coachId', 'coachId fullName specialization')
      .populate('scheduleId', 'location scheduleTime classLevel')
      .sort({ trainingDate: -1 })
      .lean();

    const sessionsMap = {};
    
    evaluations.forEach(evalItem => {
      const scheduleId = evalItem.scheduleId?._id?.toString();
      if (!scheduleId) return;

      if (!sessionsMap[scheduleId]) {
        sessionsMap[scheduleId] = {
          scheduleId,
          scheduleDate: evalItem.trainingDate,
          scheduleTime: evalItem.scheduleId?.scheduleTime,
          location: evalItem.scheduleId?.location,
          classLevel: evalItem.scheduleId?.classLevel,
          coachId: evalItem.coachId?.coachId,
          coachName: evalItem.coachId?.fullName,
          studentEvaluations: []
        };
      }

      sessionsMap[scheduleId].studentEvaluations.push({
        studentId: evalItem.studentId?.studentId,
        studentName: evalItem.studentId?.fullName,
        studentLevel: evalItem.studentId?.classLevel,
        attendance: evalItem.attendance,
        notes: evalItem.notes
      });
    });

    const sessions = Object.values(sessionsMap);

    const stats = {
      totalSessions: sessions.length,
      totalEvaluations: evaluations.length,
      attendanceRate: evaluations.length > 0 
        ? Math.round((evaluations.filter(e => e.attendance === 'Hadir').length / evaluations.length) * 100)
        : 0
    };

    res.status(200).json({
      success: true,
      data: {
        stats,
        sessions
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
        message: 'Evaluasi tidak ditemukan'
      });
    }

    console.log('🗑️ Deleting evaluation:', id);

    await TrainingLogger.logDelete(evaluation.studentId, {
      _id: evaluation._id,
      scheduleId: evaluation.scheduleId,
      attendance: evaluation.attendance,
      trainingDate: evaluation.trainingDate,
      notes: evaluation.notes,
      coachId: evaluation.coachId
    });

    await TrainingEvaluation.findByIdAndDelete(id);

    console.log('✅ Evaluation deleted successfully');

    res.status(200).json({
      success: true,
      message: 'Evaluasi berhasil dihapus'
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== RESET CURRENT MONTH ONLY ====================

/**
 * ✅ Reset HANYA bulan ini
 * @route   POST /api/evaluations/reset/:studentId
 */
exports.resetTrainingCount = async (req, res) => {
  try {
    const { studentId } = req.params;

    console.log('═══════════════════════════════════════════');
    console.log('🔄 RESET CURRENT MONTH');
    console.log('═══════════════════════════════════════════');

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

    console.log(`📅 Reset for: ${currentYear}-${currentMonth}`);

    // Get SessionCounter
    const counter = await SessionCounter.getOrCreateCounter(studentObjectId);

    // Get evaluations bulan ini
    const evaluationsToDelete = await TrainingEvaluation.find({
      studentId: studentObjectId,
      trainingDate: {
        $gte: new Date(currentYear, currentMonth - 1, 1),
        $lte: new Date(currentYear, currentMonth, 0, 23, 59, 59)
      }
    });

    console.log(`✅ Found ${evaluationsToDelete.length} evaluations`);

    // Archive
    if (evaluationsToDelete.length > 0) {
      await TrainingLogger.logReset(studentObjectId, currentYear, currentMonth, evaluationsToDelete);
      console.log(`✅ Archived`);
    }

    // Delete
    await TrainingEvaluation.deleteMany({
      studentId: studentObjectId,
      trainingDate: {
        $gte: new Date(currentYear, currentMonth - 1, 1),
        $lte: new Date(currentYear, currentMonth, 0, 23, 59, 59)
      }
    });

    // Update counter
    const resetResult = counter.recordReset();
    await counter.save();

    console.log('═══════════════════════════════════════════');
    console.log('✅ RESET COMPLETE');
    console.log('═══════════════════════════════════════════\n');

    res.status(200).json({
      success: true,
      message: resetResult.message,
      data: {
        studentId: studentObjectId.toString(),
        deletedCount: evaluationsToDelete.length,
        resetDate: resetResult.resetDate,
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

// ==================== RESET ALL (DELETE EVERYTHING) ====================

/**
 * ✅ Reset SEMUA - Delete everything dan move ke archive
 * @route   POST /api/evaluations/reset-all/:studentId
 */
// backend/src/controllers/evaluationController.js

/**
 * ✅ Reset ALL training count - Delete everything
 * @route   POST /api/evaluations/reset-all/:studentId
 */
exports.resetAllTrainingCount = async (req, res) => {
  try {
    const { studentId } = req.params;

    console.log('═══════════════════════════════════════════');
    console.log('🔄 RESET ALL TRAINING COUNT');
    console.log('═══════════════════════════════════════════');

    // Validate
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID'
      });
    }

    const studentObjectId = new mongoose.Types.ObjectId(studentId);
    console.log('📝 Student ID:', studentObjectId.toString());

    // ==================== STEP 1: Get ALL evaluations ====================
    console.log('\n📋 STEP 1: Getting ALL evaluations...');
    let allEvaluations;
    try {
      allEvaluations = await TrainingEvaluation.find({
        studentId: studentObjectId
      });
      console.log(`✅ Found ${allEvaluations.length} total`);
    } catch (error) {
      console.error('❌ STEP 1 FAILED:', error.message);
      return res.status(400).json({
        success: false,
        message: 'Error getting evaluations: ' + error.message
      });
    }

    // ==================== STEP 2: Group by year-month ====================
    console.log('\n💾 STEP 2: Grouping by month...');
    const grouped = {};
    
    // ✅ RENAMED: eval → evaluation (eval is reserved word)
    allEvaluations.forEach(evaluation => {
      try {
        const date = new Date(evaluation.trainingDate);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const key = `${year}-${month}`;
        
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(evaluation);
      } catch (error) {
        console.error('❌ Error grouping evaluation:', error.message);
      }
    });

    console.log(`📊 Grouped into ${Object.keys(grouped).length} month(s)`);
    Object.entries(grouped).forEach(([key, evals]) => {
      console.log(`   - ${key}: ${evals.length} evaluations`);
    });

    // ==================== STEP 3: Archive each month ====================
    console.log('\n💾 STEP 3: Archiving to TrainingLogger...');
    try {
      for (const [monthKey, evaluations] of Object.entries(grouped)) {
        const [year, month] = monthKey.split('-');
        console.log(`   📝 Archiving ${evaluations.length} from ${monthKey}...`);
        
        await TrainingLogger.logReset(
          studentObjectId,
          parseInt(year),
          parseInt(month),
          evaluations
        );
        console.log(`      ✅ Archived`);
      }
    } catch (error) {
      console.error('❌ STEP 3 FAILED:', error.message);
      return res.status(400).json({
        success: false,
        message: 'Error archiving: ' + error.message
      });
    }

    // ==================== STEP 4: Delete ALL from TrainingEvaluation ====================
    console.log('\n🗑️ STEP 4: Deleting ALL from TrainingEvaluation...');
    let deleteResult;
    try {
      deleteResult = await TrainingEvaluation.deleteMany({
        studentId: studentObjectId
      });
      console.log(`✅ Deleted ${deleteResult.deletedCount}`);
    } catch (error) {
      console.error('❌ STEP 4 FAILED:', error.message);
      return res.status(400).json({
        success: false,
        message: 'Error deleting evaluations: ' + error.message
      });
    }

    // ==================== STEP 5: Update SessionCounter ====================
    console.log('\n📊 STEP 5: Updating SessionCounter...');
    let counter, resetResult;
    try {
      counter = await SessionCounter.getOrCreateCounter(studentObjectId);
      resetResult = counter.recordReset();
      await counter.save();
      
      console.log('✅ SessionCounter updated');
      console.log(`   - Total resets: ${counter.resetCount}`);
      console.log(`   - Last reset: ${counter.lastResetDate}`);
    } catch (error) {
      console.error('❌ STEP 5 FAILED:', error.message);
      return res.status(400).json({
        success: false,
        message: 'Error updating counter: ' + error.message
      });
    }

    console.log('\n═══════════════════════════════════════════');
    console.log('✅ RESET ALL COMPLETE');
    console.log('═══════════════════════════════════════════\n');

    res.status(200).json({
      success: true,
      message: `Semua ${allEvaluations.length} training records telah di-archive dan dihapus`,
      data: {
        studentId: studentObjectId.toString(),
        totalDeleted: allEvaluations.length,
        monthsArchived: Object.keys(grouped).length,
        resetDate: resetResult.resetDate,
        totalResets: counter.resetCount
      }
    });

  } catch (error) {
    console.error('❌ CRITICAL ERROR:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};


// ==================== GET TRAINING PROGRESS ====================

/**
 * ✅ Get training progress
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

    console.log('📊 Getting training progress for:', studentId);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Get count bulan ini
    const monthCount = await TrainingLogger.getTotalForMonth(
      studentId,
      currentYear,
      currentMonth
    );

    // Get total semua waktu
    const totalCount = await TrainingEvaluation.getTotalCount(studentId);

    // Get counter info
    const counter = await SessionCounter.getOrCreateCounter(studentId);
    const counterStatus = await counter.getStatus();

    const progress = {
      monthCount,
      totalCount,
      carryOver: Math.max(0, totalCount - monthCount),
      message: `${monthCount} bulan ini, ${Math.max(0, totalCount - monthCount)} sebelumnya = ${totalCount} total`
    };

    console.log('✅ Progress retrieved:', progress);

    res.status(200).json({
      success: true,
      data: {
        ...progress,
        counter: counterStatus
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
