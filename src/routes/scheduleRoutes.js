const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// GET routes
router.get('/', scheduleController.getSchedules);
router.get('/range', scheduleController.getSchedulesByDateRange);
router.get('/coach/:coachId', scheduleController.getSchedulesByCoach);
router.get('/student/:studentId', scheduleController.getSchedulesByStudent);
router.get('/:id', scheduleController.getScheduleById);

// POST routes
router.post('/', scheduleController.createSchedule);
router.post('/check-conflicts', scheduleController.checkConflicts);
// router.post('/:id/send-whatsapp-reminder', scheduleController.sendWhatsAppReminder);

// PUT/PATCH routes
router.put('/:id', scheduleController.updateSchedule);
router.patch('/:id/status', scheduleController.updateScheduleStatus);
// router.patch('/:id/reminder', scheduleController.toggleReminder);

// DELETE routes
router.delete('/:id', scheduleController.deleteSchedule);
router.post(
  '/recap/manual', 
  scheduleController.triggerManualRecap
);
module.exports = router;
