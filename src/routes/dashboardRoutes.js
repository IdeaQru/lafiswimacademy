// routes/dashboardRoutes.js

const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/dashboardController');

// @route   GET /api/dashboard/stats
// @desc    Get dashboard statistics
// @access  Public
router.get('/stats', getDashboardStats);

module.exports = router;
