const Coach = require('../models/Coach');
const fs = require('fs');
const path = require('path');

// Helper function to delete photo file
const deletePhotoFile = (photoPath) => {
  try {
    if (!photoPath) return;

    const fullPath = path.join(__dirname, '../../', photoPath);
    
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log('🗑️ Coach photo deleted:', photoPath);
    } else {
      console.log('⚠️ Coach photo file not found:', fullPath);
    }
  } catch (error) {
    console.error('❌ Error deleting coach photo file:', error);
  }
};

// @desc    Get all coaches
// @route   GET /api/coaches
// @access  Public
exports.getAllCoaches = async (req, res) => {
  try {
    const { status, experience, search, page = 1, limit = 10 } = req.query;

    // Build query
    let query = {};

    if (status && status !== 'Semua') {
      query.status = status;
    }

    if (experience) {
      query.experience = { $gte: parseInt(experience) };
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { coachId: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const coaches = await Coach.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Coach.countDocuments(query);

    res.status(200).json({
      success: true,
      count: coaches.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: coaches
    });
  } catch (error) {
    console.error('❌ Error in getAllCoaches:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving coaches',
      error: error.message
    });
  }
};

// @desc    Get single coach by ID
// @route   GET /api/coaches/:id
// @access  Public
exports.getCoachById = async (req, res) => {
  try {
    const coach = await Coach.findById(req.params.id);

    if (!coach) {
      return res.status(404).json({
        success: false,
        message: 'Coach not found'
      });
    }

    res.status(200).json({
      success: true,
      data: coach
    });
  } catch (error) {
    console.error('❌ Error in getCoachById:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving coach',
      error: error.message
    });
  }
};

// @desc    Create new coach
// @route   POST /api/coaches
// @access  Public
exports.createCoach = async (req, res) => {
  try {
    const coachData = req.body;

    // Add photo URL if file uploaded
    if (req.file) {
      coachData.photo = `/uploads/coaches/${req.file.filename}`;
      console.log('📸 Photo attached to new coach:', coachData.photo);
    }

    // Check if coach ID already exists
    const existingCoach = await Coach.findOne({ coachId: coachData.coachId });
    
    if (existingCoach) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Coach ID already exists'
      });
    }

    // Check if email already exists
    const existingEmail = await Coach.findOne({ email: coachData.email });
    
    if (existingEmail) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    const coach = await Coach.create(coachData);

    res.status(201).json({
      success: true,
      message: 'Coach created successfully',
      data: coach
    });
  } catch (error) {
    console.error('❌ Error in createCoach:', error);
    
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
      message: 'Error creating coach',
      error: error.message
    });
  }
};

// @desc    Update coach
// @route   PUT /api/coaches/:id
// @access  Public
exports.updateCoach = async (req, res) => {
  try {
    let coach = await Coach.findById(req.params.id);

    if (!coach) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'Coach not found'
      });
    }

    const updateData = req.body;

    // Handle photo upload
    if (req.file) {
      if (coach.photo) {
        deletePhotoFile(coach.photo);
      }
      updateData.photo = `/uploads/coaches/${req.file.filename}`;
      console.log('📸 Coach photo updated:', updateData.photo);
    }

    // Check if trying to update coachId to an existing one
    if (updateData.coachId && updateData.coachId !== coach.coachId) {
      const existingCoach = await Coach.findOne({ coachId: updateData.coachId });
      if (existingCoach) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({
          success: false,
          message: 'Coach ID already exists'
        });
      }
    }

    // Check if trying to update email to an existing one
    if (updateData.email && updateData.email !== coach.email) {
      const existingEmail = await Coach.findOne({ email: updateData.email });
      if (existingEmail) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    coach = await Coach.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      message: 'Coach updated successfully',
      data: coach
    });
  } catch (error) {
    console.error('❌ Error in updateCoach:', error);

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
      message: 'Error updating coach',
      error: error.message
    });
  }
};

// @desc    Delete coach
// @route   DELETE /api/coaches/:id
// @access  Public
exports.deleteCoach = async (req, res) => {
  try {
    const coach = await Coach.findById(req.params.id);

    if (!coach) {
      return res.status(404).json({
        success: false,
        message: 'Coach not found'
      });
    }

    // DELETE PHOTO FILE IF EXISTS
    if (coach.photo) {
      console.log('🗑️ Deleting coach photo:', coach.photo);
      deletePhotoFile(coach.photo);
    }

    await Coach.findByIdAndDelete(req.params.id);

    console.log('✅ Coach deleted:', coach.fullName);

    res.status(200).json({
      success: true,
      message: 'Coach and associated photo deleted successfully',
      data: {}
    });
  } catch (error) {
    console.error('❌ Error in deleteCoach:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting coach',
      error: error.message
    });
  }
};

// @desc    Upload coach photo
// @route   POST /api/coaches/:id/photo
// @access  Public
exports.uploadCoachPhoto = async (req, res) => {
  try {
    const coach = await Coach.findById(req.params.id);

    if (!coach) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'Coach not found'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Delete old photo if exists
    if (coach.photo) {
      deletePhotoFile(coach.photo);
    }

    // Update coach with new photo path
    const photoUrl = `/uploads/coaches/${req.file.filename}`;
    coach.photo = photoUrl;
    await coach.save();

    console.log('✅ Coach photo uploaded:', photoUrl);

    res.status(200).json({
      success: true,
      message: 'Photo uploaded successfully',
      data: coach
    });
  } catch (error) {
    console.error('❌ Error uploading coach photo:', error);
    
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Error uploading photo',
      error: error.message
    });
  }
};

// @desc    Delete coach photo
// @route   DELETE /api/coaches/:id/photo
// @access  Public
exports.deleteCoachPhoto = async (req, res) => {
  try {
    const coach = await Coach.findById(req.params.id);

    if (!coach) {
      return res.status(404).json({
        success: false,
        message: 'Coach not found'
      });
    }

    if (!coach.photo) {
      return res.status(400).json({
        success: false,
        message: 'Coach has no photo'
      });
    }

    // Delete photo file
    deletePhotoFile(coach.photo);

    // Remove photo from coach
    coach.photo = null;
    await coach.save();

    res.status(200).json({
      success: true,
      message: 'Photo deleted successfully',
      data: coach
    });
  } catch (error) {
    console.error('❌ Error deleting coach photo:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting photo',
      error: error.message
    });
  }
};

// @desc    Get coaches statistics
// @route   GET /api/coaches/stats
// @access  Public
exports.getCoachStats = async (req, res) => {
  try {
    const totalCoaches = await Coach.countDocuments();
    const activeCoaches = await Coach.countDocuments({ status: 'Aktif' });
    const inactiveCoaches = await Coach.countDocuments({ status: 'Non-Aktif' });
    const onLeaveCoaches = await Coach.countDocuments({ status: 'Cuti' });

    const byExperience = await Coach.aggregate([
      {
        $bucket: {
          groupBy: '$experience',
          boundaries: [0, 2, 5, 10, 100],
          default: 'Other',
          output: {
            count: { $sum: 1 },
            coaches: { $push: '$fullName' }
          }
        }
      }
    ]);

    const avgExperience = await Coach.aggregate([
      {
        $group: {
          _id: null,
          avgExp: { $avg: '$experience' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: totalCoaches,
        active: activeCoaches,
        inactive: inactiveCoaches,
        onLeave: onLeaveCoaches,
        byExperience,
        avgExperience: avgExperience[0]?.avgExp || 0
      }
    });
  } catch (error) {
    console.error('❌ Error in getCoachStats:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving statistics',
      error: error.message
    });
  }
};

// @desc    Search coaches
// @route   GET /api/coaches/search
// @access  Public
exports.searchCoaches = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const coaches = await Coach.find({
      $or: [
        { fullName: { $regex: q, $options: 'i' } },
        { coachId: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ]
    }).limit(20);

    res.status(200).json({
      success: true,
      count: coaches.length,
      data: coaches
    });
  } catch (error) {
    console.error('❌ Error in searchCoaches:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching coaches',
      error: error.message
    });
  }
};

// @desc    Filter coaches by status
// @route   GET /api/coaches/filter
// @access  Public
exports.filterByStatus = async (req, res) => {
  try {
    const { status } = req.query;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status parameter is required'
      });
    }

    const coaches = await Coach.find({ status });

    res.status(200).json({
      success: true,
      count: coaches.length,
      data: coaches
    });
  } catch (error) {
    console.error('❌ Error in filterByStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Error filtering coaches',
      error: error.message
    });
  }
};
