// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const {
  getAllPayments,
  getPaymentStats,
  createPayment,
  updatePayment,
  deletePayment,
  getMonthlyRevenue
} = require('../controllers/paymentController');

// ==================== STATIC ROUTES FIRST ====================
// These MUST come before /:id routes

// Get statistics
router.get('/stats', getPaymentStats);

// Get revenue for specific month
router.get('/revenue/:year/:month', getMonthlyRevenue);

// ==================== MAIN CRUD ROUTES ====================
// Get all payments & Create payment
router
  .route('/')
  .get(getAllPayments)
  .post(createPayment);

// Update & Delete payment
router
  .route('/:id')
  .put(updatePayment)
  .delete(deletePayment);

module.exports = router;
