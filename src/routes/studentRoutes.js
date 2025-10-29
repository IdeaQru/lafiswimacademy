const express = require('express');
const router = express.Router();
const { uploadStudent } = require('../config/upload');
const {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentStats,
  searchStudents,
  filterByStatus,
  uploadStudentPhoto,
  deleteStudentPhoto,
  getOverduePayments,
  getUpcomingPayments,
  sendPaymentReminder  // TAMBAHKAN INI

} = require('../controllers/studentController');

// ==================== SPECIFIC ROUTES FIRST ====================

// Stats route
router.get('/stats', getStudentStats);

// Payment routes
router.get('/overdue-payments', getOverduePayments);
router.get('/upcoming-payments', getUpcomingPayments);

// Search route
router.get('/search', searchStudents);

// Filter route
router.get('/filter', filterByStatus);

// ==================== CRUD WITH :id ====================

// Photo routes
router.post('/:id/photo', uploadStudent.single('photo'), uploadStudentPhoto);
router.delete('/:id/photo', deleteStudentPhoto);

// Main CRUD routes
router.route('/')
  .get(getAllStudents)
  .post(uploadStudent.single('photo'), createStudent);

router.route('/:id')
  .get(getStudentById)
  .put(uploadStudent.single('photo'), updateStudent)
  .delete(deleteStudent);
router.post('/:id/payment-reminder', sendPaymentReminder);
module.exports = router;
