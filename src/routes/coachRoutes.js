const express = require('express');
const router = express.Router();
const { uploadCoach } = require('../config/upload');
const {
  getAllCoaches,
  getCoachById,
  createCoach,
  updateCoach,
  deleteCoach,
  uploadCoachPhoto,
  deleteCoachPhoto,
  getCoachStats,
  searchCoaches,
  filterByStatus,
  getAllCoachesSimple
} = require('../controllers/coachController');

// Statistics (must be before /:id)
router.get('/stats', getCoachStats);

// Search
router.get('/search', searchCoaches);

// Filter
router.get('/filter', filterByStatus);
router.get('/simple', getAllCoachesSimple);

// CRUD routes
router.route('/')
  .get(getAllCoaches)
  .post(uploadCoach.single('photo'), createCoach);

router.route('/:id')
  .get(getCoachById)
  .put(uploadCoach.single('photo'), updateCoach)
  .delete(deleteCoach);

// Photo management
router.route('/:id/photo')
  .post(uploadCoach.single('photo'), uploadCoachPhoto)
  .delete(deleteCoachPhoto);

module.exports = router;
