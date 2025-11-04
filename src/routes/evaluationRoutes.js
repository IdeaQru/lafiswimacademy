// backend/src/routes/evaluationRoutes.js

const express = require('express');
const router = express.Router();
const evaluationController = require('../controllers/evaluationController');
const { protect, authorize } = require('../middleware/authMiddleware');

// ==================== PUBLIC ROUTES ====================

/**
 * @route   GET /api/evaluations/progress/:studentId
 * @desc    Get training progress
 */
router.get('/progress/:studentId', evaluationController.getTrainingProgress);

// ==================== PROTECTED ROUTES (Admin Only) ====================

/**
 * @route   POST /api/evaluations/reset/:studentId
 * @desc    Reset CURRENT MONTH training count
 */
router.post('/reset/:studentId', protect, authorize('admin'), evaluationController.resetAllTrainingCount);

/**
 * @route   POST /api/evaluations/reset-all/:studentId
 * @desc    Reset ALL training count to 0
 */
router.post('/reset-all/:studentId', protect, authorize('admin'), evaluationController.resetAllTrainingCount);

/**
 * @route   POST /api/evaluations/bulk
 * @desc    Bulk create/update evaluations
 */
router.post('/bulk', protect, evaluationController.bulkCreateEvaluation);

/**
 * @route   GET /api/evaluations/schedule/:scheduleId
 * @desc    Get evaluations by schedule
 */
router.get('/schedule/:scheduleId', protect, evaluationController.getEvaluationsBySchedule);

/**
 * @route   GET /api/evaluations/student/:studentId
 * @desc    Get student attendance history
 */
router.get('/student/:studentId', protect, evaluationController.getStudentHistory);

/**
 * @route   GET /api/evaluations/coach-report
 * @desc    Get coach report
 */
router.get('/coach-report', protect, evaluationController.getCoachReport);

/**
 * @route   DELETE /api/evaluations/:id
 * @desc    Delete evaluation
 */
router.delete('/:id', protect, authorize('admin'), evaluationController.deleteEvaluation);

module.exports = router;
