// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const {
  getAllPayments,
  getPaymentsByStudent,
  createPayment,
  deletePayment,
  getPaymentStats
} = require('../controllers/paymentController');

// Stats route (must be before /:id)
router.get('/stats', getPaymentStats);

// Get payments for specific student
router.get('/student/:studentId', getPaymentsByStudent);

// Main routes
router.route('/')
  .get(getAllPayments)
  .post(createPayment);

router.route('/:id')
  .delete(deletePayment);

module.exports = router;
