// backend/src/routes/reportRoutes.js - VERIFY MIDDLEWARE

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getStudentIndividualReport,
  searchStudentsForReport,
  getCoachReport,
  getFinancialReport,
  exportReport,
  getStudentsListWithStats
} = require('../controllers/reportController');

// ✅ Apply protect middleware ke SEMUA routes
router.use(protect);

console.log('✅ [REPORT ROUTES] Protect middleware applied to all routes');

// ==================== STUDENT REPORTS ====================
router.get('/students/search', searchStudentsForReport);
router.get('/student/:studentId', getStudentIndividualReport);
router.get('/students/list', getStudentsListWithStats);

// ==================== COACH REPORT ====================
router.get('/coaches', getCoachReport);

// ==================== FINANCIAL REPORT - ADMIN ONLY ====================
router.get('/financial', authorize('admin'), getFinancialReport);

// ==================== EXPORT ====================
router.get('/export', exportReport);

module.exports = router;
