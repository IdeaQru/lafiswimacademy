// backend/src/routes/evaluationRoutes.js

const express = require('express');
const router = express.Router();
const {
  bulkCreateEvaluation,
  getEvaluationsBySchedule,
  getStudentHistory,
  getCoachReport,
  deleteEvaluation
} = require('../controllers/evaluationController');

// @route   POST /api/evaluations/bulk
// @desc    Bulk create/update evaluations for a schedule
router.post('/bulk', bulkCreateEvaluation);

// @route   GET /api/evaluations/schedule/:scheduleId
// @desc    Get all evaluations for a schedule
router.get('/schedule/:scheduleId', getEvaluationsBySchedule);

// @route   GET /api/evaluations/student/:studentId
// @desc    Get student attendance & notes history
router.get('/student/:studentId', getStudentHistory);

// @route   GET /api/evaluations/coach-report
// @desc    Get coach report with sessions & evaluations
router.get('/coach-report', getCoachReport);

// @route   DELETE /api/evaluations/:id
// @desc    Delete evaluation
router.delete('/:id', deleteEvaluation);

module.exports = router;
