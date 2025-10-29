const express = require('express');
const router = express.Router();
const {
  getStudentIndividualReport,
  searchStudentsForReport,
  getCoachReport,
  getFinancialReport,
  exportReport,
  getStudentsListWithStats
} = require('../controllers/reportController');

// Student reports
router.get('/students/search', searchStudentsForReport);
router.get('/student/:studentId', getStudentIndividualReport);
router.get('/students/list', getStudentsListWithStats);
// Coach report
router.get('/coaches', getCoachReport);

// Financial report
router.get('/financial', getFinancialReport);

// Export
router.get('/export', exportReport);

module.exports = router;
