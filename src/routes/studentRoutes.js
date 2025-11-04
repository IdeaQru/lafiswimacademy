// routes/studentRoutes.js
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
  sendPaymentReminder
} = require('../controllers/studentController');

// ==================== STATIC ROUTES FIRST (MUST BE BEFORE /:id) ====================

/**
 * @route   GET /api/students/stats
 * @desc    Get student statistics
 */
router.get('/stats', getStudentStats);
// router.get('/stud', getStudent);

/**
 * @route   GET /api/students/search
 * @desc    Search students
 */
router.get('/search', searchStudents);

/**
 * @route   GET /api/students/filter
 * @desc    Filter students by status
 */
router.get('/filter', filterByStatus);

// ==================== COLLECTION ROUTES ====================

/**
 * @route   GET /api/students
 * @route   POST /api/students
 */
router.route('/')
  .get(getAllStudents)
  .post(uploadStudent.single('photo'), createStudent);

// ==================== DYNAMIC ROUTES WITH :id ====================

/**
 * @route   GET /api/students/:id
 * @route   PUT /api/students/:id
 * @route   DELETE /api/students/:id
 */
router.route('/:id')
  .get(getStudentById)
  .put(uploadStudent.single('photo'), updateStudent)
  .delete(deleteStudent);

// ==================== PHOTO MANAGEMENT ROUTES ====================

/**
 * @route   POST /api/students/:id/photo
 * @desc    Upload student photo
 */
router.post('/:id/photo', uploadStudent.single('photo'), uploadStudentPhoto);

/**
 * @route   DELETE /api/students/:id/photo
 * @desc    Delete student photo
 */
router.delete('/:id/photo', deleteStudentPhoto);

// ==================== PAYMENT REMINDER ROUTE ====================

/**
 * @route   POST /api/students/:id/send-reminder
 * @desc    Send payment reminder via WhatsApp (manual)
 */
router.post('/:id/send-reminder', sendPaymentReminder);

module.exports = router;
