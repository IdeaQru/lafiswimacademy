const express = require('express');
const router = express.Router();
const { uploadNews } = require('../config/upload');
const {
  getAllNews,
  getNewsById,
  getNewsBySlug,
  createNews,
  updateNews,
  deleteNews,
  uploadCoverImage,
  deleteCoverImage,
  incrementViews,
  getNewsStats,
  getAllNewsSimple
} = require('../controllers/newsController');

// Statistics (must be before /:id)
router.get('/stats', getNewsStats);
router.get('/simple', getAllNewsSimple);

// Slug route (must be before /:id)
router.get('/slug/:slug', getNewsBySlug);

// CRUD routes
router.route('/')
  .get(getAllNews)
  .post(uploadNews.single('coverImage'), createNews);

router.route('/:id')
  .get(getNewsById)
  .put(uploadNews.single('coverImage'), updateNews)
  .delete(deleteNews);

// Cover image management
router.route('/:id/cover')
  .post(uploadNews.single('coverImage'), uploadCoverImage)
  .delete(deleteCoverImage);

// Increment views
router.post('/:id/view', incrementViews);

module.exports = router;
