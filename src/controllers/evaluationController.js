// backend/src/controllers/evaluationController.js

const TrainingEvaluation = require('../models/TrainingEvaluation');
const Schedule = require('../models/Schedule');
const Student = require('../models/Student');
const Coach = require('../models/Coach');

// @desc    Create or update training evaluation (bulk)
// @route   POST /api/evaluations/bulk
// @access  Private (Coach/Admin)


// @desc    Create or update training evaluation (bulk)
// @route   POST /api/evaluations/bulk
// @access  Private (Coach/Admin)
exports.bulkCreateEvaluation = async (req, res) => {
  try {
    const { scheduleId, coachId, trainingDate, evaluations } = req.body;

    console.log('📥 Received evaluation data:', JSON.stringify({ scheduleId, coachId, evaluations }, null, 2));

    // Get schedule
    const schedule = await Schedule.findById(scheduleId).populate('coachId');
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule tidak ditemukan'
      });
    }

    // Handle coachId - convert custom ID to ObjectId if needed
    let actualCoachObjectId;
    
    if (coachId) {
      if (coachId.match(/^[0-9a-fA-F]{24}$/)) {
        // Already ObjectId
        actualCoachObjectId = coachId;
        console.log(`✅ Valid CoachId ObjectId: ${actualCoachObjectId}`);
      } else {
        // Custom coach ID, lookup
        console.log(`🔍 Looking up coach by custom ID: ${coachId}`);
        const coach = await Coach.findOne({ coachId: coachId }).lean();
        
        if (!coach) {
          console.error(`❌ Coach not found: ${coachId}`);
          return res.status(404).json({
            success: false,
            message: `Pelatih dengan ID ${coachId} tidak ditemukan`
          });
        }
        
        actualCoachObjectId = coach._id.toString();
        console.log(`✅ Found coach ObjectId: ${actualCoachObjectId} for custom ID: ${coachId}`);
      }
    } else {
      // Use coach from schedule
      actualCoachObjectId = schedule.coachId._id ? schedule.coachId._id.toString() : schedule.coachId.toString();
      console.log(`✅ Using coachId from schedule: ${actualCoachObjectId}`);
    }

    const promises = evaluations.map(async (evalItem) => {
      try {
        // Handle studentId - convert custom ID to ObjectId if needed
        let studentObjectId;
        
        console.log(`🔍 Processing studentId: ${evalItem.studentId} (type: ${typeof evalItem.studentId})`);
        
        if (evalItem.studentId.match(/^[0-9a-fA-F]{24}$/)) {
          // It's a valid ObjectId
          studentObjectId = evalItem.studentId;
          console.log(`✅ Valid StudentId ObjectId: ${studentObjectId}`);
        } else {
          // It's a custom ID, find the student
          console.log(`🔍 Looking up student by custom ID: ${evalItem.studentId}`);
          const student = await Student.findOne({ studentId: evalItem.studentId }).lean();
          
          if (!student) {
            console.error(`❌ Student not found: ${evalItem.studentId}`);
            throw new Error(`Student dengan ID ${evalItem.studentId} tidak ditemukan`);
          }
          
          studentObjectId = student._id.toString();
          console.log(`✅ Found student ObjectId: ${studentObjectId} for custom ID: ${evalItem.studentId}`);
        }

        console.log(`💾 Saving evaluation for studentId: ${studentObjectId}, coachId: ${actualCoachObjectId}`);

        const evaluation = await TrainingEvaluation.findOneAndUpdate(
          { scheduleId, studentId: studentObjectId },
          {
            scheduleId,
            studentId: studentObjectId,
            coachId: actualCoachObjectId,  // ← FIXED: Use ObjectId
            trainingDate: trainingDate || schedule.date,
            attendance: evalItem.attendance,
            notes: evalItem.notes || '',
            createdBy: req.user?._id
          },
          { upsert: true, new: true }
        );

        console.log(`✅ Evaluation saved for student: ${studentObjectId}`);
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



// @desc    Get evaluations by schedule
// @route   GET /api/evaluations/schedule/:scheduleId
// @access  Public
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

// @desc    Get student attendance & notes history
// @route   GET /api/evaluations/student/:studentId
// @access  Public
exports.getStudentHistory = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate, limit = 50 } = req.query;

    const filter = { studentId };
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

    // Calculate stats
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

// @desc    Get coach report (sessions with evaluations)
// @route   GET /api/evaluations/coach-report
// @access  Public
exports.getCoachReport = async (req, res) => {
  try {
    const { coachId, startDate, endDate } = req.query;

    const filter = {};
    if (coachId) filter.coachId = coachId;
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

    // Group by schedule
    const sessionsMap = {};
    
    evaluations.forEach(evalItem => {  // ← FIXED: eval → evalItem
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

    // Overall stats
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

// @desc    Delete evaluation
// @route   DELETE /api/evaluations/:id
// @access  Private (Admin)
exports.deleteEvaluation = async (req, res) => {
  try {
    const evaluation = await TrainingEvaluation.findById(req.params.id);

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluasi tidak ditemukan'
      });
    }

    await evaluation.deleteOne();

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
