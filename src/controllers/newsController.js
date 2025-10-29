const News = require('../models/News');
const fs = require('fs');
const path = require('path');

// Helper function to delete cover image file
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

// @desc    Get all news
// @route   GET /api/news
// @access  Public
exports.getAllNews = async (req, res) => {
  try {
    const { status, category, featured, search, page = 1, limit = 10 } = req.query;

    // Build query
    let query = {};

    if (status && status !== 'Semua') {
      query.status = status;
    }

    if (category && category !== 'Semua') {
      query.category = category;
    }

    if (featured === 'true') {
      query.featured = true;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { newsId: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const news = await News.find(query)
      .sort({ publishDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await News.countDocuments(query);

    res.status(200).json({
      success: true,
      count: news.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: news
    });
  } catch (error) {
    console.error('❌ Error in getAllNews:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving news',
      error: error.message
    });
  }
};

// @desc    Get single news by ID
// @route   GET /api/news/:id
// @access  Public
exports.getNewsById = async (req, res) => {
  try {
    const news = await News.findById(req.params.id);

    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News not found'
      });
    }

    res.status(200).json({
      success: true,
      data: news
    });
  } catch (error) {
    console.error('❌ Error in getNewsById:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving news',
      error: error.message
    });
  }
};

// @desc    Get news by slug
// @route   GET /api/news/slug/:slug
// @access  Public
exports.getNewsBySlug = async (req, res) => {
  try {
    const news = await News.findOne({ slug: req.params.slug });

    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News not found'
      });
    }

    res.status(200).json({
      success: true,
      data: news
    });
  } catch (error) {
    console.error('❌ Error in getNewsBySlug:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving news',
      error: error.message
    });
  }
};

// @desc    Create new news
// @route   POST /api/news
// @access  Public
exports.createNews = async (req, res) => {
  try {
    const newsData = req.body;

    // Add cover image URL if file uploaded
    if (req.file) {
      newsData.coverImage = `/uploads/news/${req.file.filename}`;
      console.log('📸 Cover image attached to news:', newsData.coverImage);
    }

    // Check if news ID already exists
    const existingNewsId = await News.findOne({ newsId: newsData.newsId });
    
    if (existingNewsId) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'News ID already exists'
      });
    }

    // Check if slug already exists
    const existingSlug = await News.findOne({ slug: newsData.slug });
    
    if (existingSlug) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Slug already exists'
      });
    }

    const news = await News.create(newsData);

    res.status(201).json({
      success: true,
      message: 'News created successfully',
      data: news
    });
  } catch (error) {
    console.error('❌ Error in createNews:', error);
    
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating news',
      error: error.message
    });
  }
};

// @desc    Update news
// @route   PUT /api/news/:id
// @access  Public
exports.updateNews = async (req, res) => {
  try {
    let news = await News.findById(req.params.id);

    if (!news) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'News not found'
      });
    }

    const updateData = req.body;

    // Handle cover image upload
    if (req.file) {
      if (news.coverImage) {
        deleteCoverImageFile(news.coverImage);
      }
      updateData.coverImage = `/uploads/news/${req.file.filename}`;
      console.log('📸 News cover image updated:', updateData.coverImage);
    }

    // Check if trying to update slug to an existing one
    if (updateData.slug && updateData.slug !== news.slug) {
      const existingSlug = await News.findOne({ slug: updateData.slug });
      if (existingSlug) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({
          success: false,
          message: 'Slug already exists'
        });
      }
    }

    news = await News.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      message: 'News updated successfully',
      data: news
    });
  } catch (error) {
    console.error('❌ Error in updateNews:', error);

    if (req.file) {
      fs.unlinkSync(req.file.path);
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating news',
      error: error.message
    });
  }
};

// @desc    Delete news
// @route   DELETE /api/news/:id
// @access  Public
exports.deleteNews = async (req, res) => {
  try {
    const news = await News.findById(req.params.id);

    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News not found'
      });
    }

    // DELETE COVER IMAGE IF EXISTS
    if (news.coverImage) {
      console.log('🗑️ Deleting news cover image:', news.coverImage);
      deleteCoverImageFile(news.coverImage);
    }

    await News.findByIdAndDelete(req.params.id);

    console.log('✅ News deleted:', news.title);

    res.status(200).json({
      success: true,
      message: 'News and associated cover image deleted successfully',
      data: {}
    });
  } catch (error) {
    console.error('❌ Error in deleteNews:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting news',
      error: error.message
    });
  }
};

// @desc    Upload news cover image
// @route   POST /api/news/:id/cover
// @access  Public
exports.uploadCoverImage = async (req, res) => {
  try {
    const news = await News.findById(req.params.id);

    if (!news) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'News not found'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Delete old cover image if exists
    if (news.coverImage) {
      deleteCoverImageFile(news.coverImage);
    }

    // Update news with new cover image path
    const imageUrl = `/uploads/news/${req.file.filename}`;
    news.coverImage = imageUrl;
    await news.save();

    console.log('✅ News cover image uploaded:', imageUrl);

    res.status(200).json({
      success: true,
      message: 'Cover image uploaded successfully',
      data: news
    });
  } catch (error) {
    console.error('❌ Error uploading cover image:', error);
    
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Error uploading cover image',
      error: error.message
    });
  }
};

// @desc    Delete news cover image
// @route   DELETE /api/news/:id/cover
// @access  Public
exports.deleteCoverImage = async (req, res) => {
  try {
    const news = await News.findById(req.params.id);

    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News not found'
      });
    }

    if (!news.coverImage) {
      return res.status(400).json({
        success: false,
        message: 'News has no cover image'
      });
    }

    // Delete cover image file
    deleteCoverImageFile(news.coverImage);

    // Remove cover image from news
    news.coverImage = null;
    await news.save();

    res.status(200).json({
      success: true,
      message: 'Cover image deleted successfully',
      data: news
    });
  } catch (error) {
    console.error('❌ Error deleting cover image:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting cover image',
      error: error.message
    });
  }
};

// @desc    Increment news views
// @route   POST /api/news/:id/view
// @access  Public
exports.incrementViews = async (req, res) => {
  try {
    const news = await News.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News not found'
      });
    }

    res.status(200).json({
      success: true,
      data: news
    });
  } catch (error) {
    console.error('❌ Error incrementing views:', error);
    res.status(500).json({
      success: false,
      message: 'Error incrementing views',
      error: error.message
    });
  }
};

// @desc    Get news statistics
// @route   GET /api/news/stats
// @access  Public
exports.getNewsStats = async (req, res) => {
  try {
    const totalNews = await News.countDocuments();
    const draftNews = await News.countDocuments({ status: 'Draft' });
    const publishedNews = await News.countDocuments({ status: 'Published' });
    const archivedNews = await News.countDocuments({ status: 'Archived' });
    const featuredNews = await News.countDocuments({ featured: true });

    const byCategory = await News.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalViews = await News.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$views' }
        }
      }
    ]);

    const mostViewed = await News.find()
      .sort({ views: -1 })
      .limit(5)
      .select('title slug views');

    res.status(200).json({
      success: true,
      data: {
        total: totalNews,
        draft: draftNews,
        published: publishedNews,
        archived: archivedNews,
        featured: featuredNews,
        byCategory,
        totalViews: totalViews[0]?.total || 0,
        mostViewed
      }
    });
  } catch (error) {
    console.error('❌ Error in getNewsStats:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving statistics',
      error: error.message
    });
  }
};
