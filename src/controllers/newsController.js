const News = require('../models/News');
const fs = require('fs');
const path = require('path');

// Helper: delete cover image from filesystem
const deleteCoverImageFile = (imagePath) => {
  try {
    if (!imagePath) return;
    const fullPath = path.join(__dirname, '../../', imagePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log('🗑️ News cover image deleted:', imagePath);
    } else {
      console.log('⚠️ News cover image file not found:', fullPath);
    }
  } catch (error) {
    console.error('❌ Error deleting news cover image file:', error);
  }
};

// ==================== GET ALL NEWS - PAGINATED ====================
exports.getAllNews = async (req, res) => {
  try {
    const { 
      status, category, featured, search, 
      page = 1, limit = 10,
      sortBy = 'publishDate', order = 'desc'
    } = req.query;

    // Build query filter
    let query = {};
    if (status && status !== 'Semua') query.status = status;
    if (category && category !== 'Semua') query.category = category;
    if (featured === 'true') query.featured = true;
    if (search) {
      query.$or = [
        { title:    { $regex: search, $options: 'i' } },
        { newsId:   { $regex: search, $options: 'i' } },
        { excerpt:  { $regex: search, $options: 'i' } },
        { author:   { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sortOptions = {};
    sortOptions[sortBy] = order === 'asc' ? 1 : -1;
    if (sortBy !== 'createdAt') sortOptions.createdAt = -1;

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Query
    const news = await News.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const totalItems = await News.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limitNum);

    res.status(200).json({
      success: true,
      data: news,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      },
      meta: {
        count: news.length,
        sortBy, order,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Error in getAllNews:', error);
    res.status(500).json({ success: false, message: 'Error retrieving news', error: error.message });
  }
};

// ==================== GET ALL NEWS (NO PAGINATION) ====================
exports.getAllNewsSimple = async (req, res) => {
  try {
    const news = await News.find().sort({ createdAt: -1 }).select('-__v').lean();
    res.status(200).json({
      success: true,
      data: news,
      total: news.length
    });
  } catch (error) {
    console.error('❌ Error fetching all news:', error);
    res.status(500).json({ success: false, message: 'Error fetching news', error: error.message });
  }
};

// ==================== GET SINGLE BY ID ====================
exports.getNewsById = async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) {
      return res.status(404).json({ success: false, message: 'News not found' });
    }
    res.status(200).json({ success: true, data: news });
  } catch (error) {
    console.error('❌ Error in getNewsById:', error);
    res.status(500).json({ success: false, message: 'Error retrieving news', error: error.message });
  }
};

// ==================== GET BY SLUG ====================
exports.getNewsBySlug = async (req, res) => {
  try {
    const news = await News.findOne({ slug: req.params.slug });
    if (!news) {
      return res.status(404).json({ success: false, message: 'News not found' });
    }
    res.status(200).json({ success: true, data: news });
  } catch (error) {
    console.error('❌ Error in getNewsBySlug:', error);
    res.status(500).json({ success: false, message: 'Error retrieving news', error: error.message });
  }
};

// ==================== CREATE NEWS ====================
exports.createNews = async (req, res) => {
  try {
    const newsData = req.body;
    if (req.file) newsData.coverImage = `/uploads/news/${req.file.filename}`;

    // Check for duplicate newsId and slug
    if (await News.findOne({ newsId: newsData.newsId })) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'News ID already exists' });
    }
    if (await News.findOne({ slug: newsData.slug })) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Slug already exists' });
    }

    const news = await News.create(newsData);
    res.status(201).json({ success: true, message: 'News created successfully', data: news });
  } catch (error) {
    console.error('❌ Error in createNews:', error);
    if (req.file) fs.unlinkSync(req.file.path);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ success: false, message: 'Validation error', errors: messages });
    }
    res.status(500).json({ success: false, message: 'Error creating news', error: error.message });
  }
};

// ==================== UPDATE NEWS ====================
exports.updateNews = async (req, res) => {
  try {
    let news = await News.findById(req.params.id);
    if (!news) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: 'News not found' });
    }
    const updateData = req.body;
    // Handle cover image upload
    if (req.file) {
      if (news.coverImage) deleteCoverImageFile(news.coverImage);
      updateData.coverImage = `/uploads/news/${req.file.filename}`;
    }
    // Check slug duplicate
    if (updateData.slug && updateData.slug !== news.slug) {
      const existingSlug = await News.findOne({ slug: updateData.slug, _id: { $ne: req.params.id } });
      if (existingSlug) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, message: 'Slug already exists' });
      }
    }
    news = await News.findByIdAndUpdate(
      req.params.id, updateData,
      { new: true, runValidators: true }
    );
    res.status(200).json({ success: true, message: 'News updated successfully', data: news });
  } catch (error) {
    console.error('❌ Error in updateNews:', error);
    if (req.file) fs.unlinkSync(req.file.path);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ success: false, message: 'Validation error', errors: messages });
    }
    res.status(500).json({ success: false, message: 'Error updating news', error: error.message });
  }
};

// ==================== DELETE NEWS ====================
exports.deleteNews = async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) {
      return res.status(404).json({ success: false, message: 'News not found' });
    }
    if (news.coverImage) deleteCoverImageFile(news.coverImage);
    await News.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'News and associated cover image deleted successfully', data: {} });
  } catch (error) {
    console.error('❌ Error in deleteNews:', error);
    res.status(500).json({ success: false, message: 'Error deleting news', error: error.message });
  }
};

// ==================== UPLOAD COVER IMAGE ====================
exports.uploadCoverImage = async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: 'News not found' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    if (news.coverImage) deleteCoverImageFile(news.coverImage);
    const imageUrl = `/uploads/news/${req.file.filename}`;
    news.coverImage = imageUrl;
    await news.save();
    res.status(200).json({ success: true, message: 'Cover image uploaded successfully', data: news });
  } catch (error) {
    console.error('❌ Error uploading cover image:', error);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: 'Error uploading cover image', error: error.message });
  }
};

// ==================== DELETE COVER IMAGE ====================
exports.deleteCoverImage = async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) return res.status(404).json({ success: false, message: 'News not found' });
    if (!news.coverImage) return res.status(400).json({ success: false, message: 'News has no cover image' });
    deleteCoverImageFile(news.coverImage);
    news.coverImage = null;
    await news.save();
    res.status(200).json({ success: true, message: 'Cover image deleted successfully', data: news });
  } catch (error) {
    console.error('❌ Error deleting cover image:', error);
    res.status(500).json({ success: false, message: 'Error deleting cover image', error: error.message });
  }
};

// ==================== INCREMENT NEWS VIEWS ====================
exports.incrementViews = async (req, res) => {
  try {
    const news = await News.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!news) return res.status(404).json({ success: false, message: 'News not found' });
    res.status(200).json({ success: true, data: news });
  } catch (error) {
    console.error('❌ Error incrementing views:', error);
    res.status(500).json({ success: false, message: 'Error incrementing views', error: error.message });
  }
};

// ==================== NEWS STATISTICS ====================
exports.getNewsStats = async (req, res) => {
  try {
    // Count by status
    const totalNews = await News.countDocuments();
    const draftNews = await News.countDocuments({ status: 'Draft' });
    const publishedNews = await News.countDocuments({ status: 'Published' });
    const archivedNews = await News.countDocuments({ status: 'Archived' });
    const featuredNews = await News.countDocuments({ featured: true });

    const byCategory = await News.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const totalViewsResult = await News.aggregate([
      { $group: { _id: null, total: { $sum: '$views' } } }
    ]);

    const mostViewed = await News.find()
      .sort({ views: -1 })
      .limit(5)
      .select('title slug views coverImage publishDate')
      .lean();

    const recentNews = await News.find({ status: 'Published' })
      .sort({ publishDate: -1 })
      .limit(5)
      .select('title slug publishDate')
      .lean();

    const stats = {
      total: totalNews,
      draft: draftNews,
      published: publishedNews,
      archived: archivedNews,
      featured: featuredNews,
      byCategory,
      totalViews: totalViewsResult[0]?.total || 0,
      mostViewed,
      recentNews
    };

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error('❌ Error in getNewsStats:', error);
    res.status(500).json({ success: false, message: 'Error retrieving statistics', error: error.message });
  }
};
