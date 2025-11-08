// backend/src/controllers/studentController.js - CLEANED & OPTIMIZED WITH PAGINATION

const Student = require('../models/Student');
const TrainingEvaluation = require('../models/TrainingEvaluation');
const fs = require('fs');
const path = require('path');
const whatsappService = require('../services/whatsappService');

// ==================== PHOTO MANAGEMENT ====================

/**
 * @desc    Upload student photo
 * @route   POST /api/students/:id/photo
 * @access  Private
 */
exports.uploadStudentPhoto = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Delete old photo if exists
    if (student.photo) {
      deletePhotoFile(student.photo);
    }

    const photoUrl = `/uploads/students/${req.file.filename}`;
    student.photo = photoUrl;
    await student.save();

    console.log('✅ Photo uploaded:', photoUrl);

    res.status(200).json({
      success: true,
      message: 'Photo uploaded successfully',
      data: student
    });
  } catch (error) {
    console.error('❌ Error uploading photo:', error);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({
      success: false,
      message: 'Error uploading photo',
      error: error.message
    });
  }
};

/**
 * @desc    Delete student photo
 * @route   DELETE /api/students/:id/photo
 * @access  Private
 */
exports.deleteStudentPhoto = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    if (!student.photo) {
      return res.status(400).json({
        success: false,
        message: 'Student has no photo'
      });
    }

    deletePhotoFile(student.photo);
    student.photo = null;
    await student.save();

    res.status(200).json({
      success: true,
      message: 'Photo deleted successfully',
      data: student
    });
  } catch (error) {
    console.error('❌ Error deleting photo:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting photo',
      error: error.message
    });
  }
};

/**
 * Helper: Delete photo file from disk
 */
const deletePhotoFile = (photoPath) => {
  try {
    if (!photoPath) return;
    const fullPath = path.join(__dirname, '../../', photoPath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log('🗑️ Photo deleted:', photoPath);
    }
  } catch (error) {
    console.error('❌ Error deleting photo file:', error);
  }
};

// ==================== CRUD OPERATIONS ====================

/**
 * ✅ @desc    Get all students WITH pagination & training count
 * @route   GET /api/students
 * @access  Public
 * 
 * Query params:
 * - status: 'Aktif' | 'Non-Aktif' | 'Cuti' | 'Semua'
 * - search: search query
 * - page: page number (default: 1)
 * - limit: items per page (default: 10)
 * - sortBy: field to sort by (default: 'createdAt')
 * - order: 'asc' | 'desc' (default: 'desc')
 */
exports.getAllStudents = async (req, res) => {
  try {
    const { 
      status, 
      search, 
      page = 1, 
      limit = 10,
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    console.log('📋 Getting all students with pagination');
    console.log('   Params:', { status, search, page, limit, sortBy, order });

    // ✅ Build query filter
    let query = {};

    if (status && status !== 'Semua') {
      query.status = status;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { fullName: searchRegex },
        { studentId: searchRegex },
        { phone: searchRegex },
        { parentName: searchRegex }
      ];
    }

    // ✅ Parse pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    // ✅ Get total count
    const totalCount = await Student.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limitNum);

    // ✅ Build sort object
    const sortOrder = order === 'desc' ? -1 : 1;
    const sortObj = { [sortBy]: sortOrder };

    // ✅ Get students with pagination
    const students = await Student.find(query)
      .select('-__v')
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean();

    console.log(`✅ Found ${students.length} students (page ${pageNum}/${totalPages})`);

    // ✅ Get training count untuk setiap student
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const studentsWithCounts = await Promise.all(
      students.map(async (student) => {
        try {
          const trainingCountThisMonth = await TrainingEvaluation.getMonthCount(
            student._id,
            currentYear,
            currentMonth
          );

          return {
            ...student,
            trainingCountThisMonth
          };
        } catch (error) {
          console.error(`❌ Error getting count for ${student._id}:`, error);
          return {
            ...student,
            trainingCountThisMonth: 0
          };
        }
      })
    );

    res.status(200).json({
      success: true,
      data: studentsWithCounts,
      pagination: {
        currentPage: pageNum,
        totalPages: totalPages,
        totalItems: totalCount,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      },
      meta: {
        sortBy,
        order,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Error in getAllStudents:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving students',
      error: error.message
    });
  }
};

/**
 * @desc    Get single student by ID
 * @route   GET /api/students/:id
 * @access  Public
 */
exports.getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error('❌ Error in getStudentById:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving student',
      error: error.message
    });
  }
};

/**
 * @desc    Create new student
 * @route   POST /api/students
 * @access  Private
 */
exports.createStudent = async (req, res) => {
  try {
    const studentData = req.body;

    if (req.file) {
      studentData.photo = `/uploads/students/${req.file.filename}`;
      console.log('📸 Photo attached:', studentData.photo);
    }

    const existingStudent = await Student.findOne({ studentId: studentData.studentId });
    
    if (existingStudent) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Student ID already exists'
      });
    }

    const student = await Student.create(studentData);

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: student
    });
  } catch (error) {
    console.error('❌ Error in createStudent:', error);
    
    if (req.file) fs.unlinkSync(req.file.path);
    
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
      message: 'Error creating student',
      error: error.message
    });
  }
};

/**
 * @desc    Update student
 * @route   PUT /api/students/:id
 * @access  Private
 */
exports.updateStudent = async (req, res) => {
  try {
    let student = await Student.findById(req.params.id);

    if (!student) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const updateData = req.body;

    if (req.file) {
      if (student.photo) deletePhotoFile(student.photo);
      updateData.photo = `/uploads/students/${req.file.filename}`;
      console.log('📸 Photo updated:', updateData.photo);
    }

    if (updateData.studentId && updateData.studentId !== student.studentId) {
      const existingStudent = await Student.findOne({ studentId: updateData.studentId });
      if (existingStudent) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({
          success: false,
          message: 'Student ID already exists'
        });
      }
    }

    student = await Student.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Student updated successfully',
      data: student
    });
  } catch (error) {
    console.error('❌ Error in updateStudent:', error);

    if (req.file) fs.unlinkSync(req.file.path);

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
      message: 'Error updating student',
      error: error.message
    });
  }
};

/**
 * @desc    Delete student
 * @route   DELETE /api/students/:id
 * @access  Private
 */
exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    if (student.photo) {
      console.log('🗑️ Deleting photo:', student.photo);
      deletePhotoFile(student.photo);
    }

    await Student.findByIdAndDelete(req.params.id);

    console.log('✅ Student deleted:', student.fullName);

    res.status(200).json({
      success: true,
      message: 'Student deleted successfully',
      data: {}
    });
  } catch (error) {
    console.error('❌ Error in deleteStudent:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting student',
      error: error.message
    });
  }
};

// ==================== STATISTICS ====================

/**
 * @desc    Get students statistics
 * @route   GET /api/students/stats
 * @access  Public
 */
exports.getStudentStats = async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const activeStudents = await Student.countDocuments({ status: 'Aktif' });
    const inactiveStudents = await Student.countDocuments({ status: 'Non-Aktif' });
    const onLeaveStudents = await Student.countDocuments({ status: 'Cuti' });

    res.status(200).json({
      success: true,
      data: {
        total: totalStudents,
        active: activeStudents,
        inactive: inactiveStudents,
        onLeave: onLeaveStudents
      }
    });
  } catch (error) {
    console.error('❌ Error in getStudentStats:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving statistics',
      error: error.message
    });
  }
};

// ==================== SEARCH & FILTER ====================

/**
 * @desc    Search students (quick search - max 20 results)
 * @route   GET /api/students/search
 * @access  Public
 */
exports.searchStudents = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const searchRegex = new RegExp(q.trim(), 'i');
    const students = await Student.find({
      $or: [
        { fullName: searchRegex },
        { studentId: searchRegex },
        { phone: searchRegex },
        { parentName: searchRegex }
      ]
    })
    .select('_id studentId fullName phone status photo')
    .limit(20)
    .lean();

    res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    console.error('❌ Error in searchStudents:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching students',
      error: error.message
    });
  }
};

/**
 * @desc    Filter students by status
 * @route   GET /api/students/filter
 * @access  Public
 */
exports.filterByStatus = async (req, res) => {
  try {
    const { status } = req.query;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status parameter is required'
      });
    }

    const students = await Student.find({ status })
      .select('-__v')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    console.error('❌ Error in filterByStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Error filtering students',
      error: error.message
    });
  }
};

// ==================== PAYMENT REMINDER ====================

/**
 * @desc    Send payment reminder via WhatsApp (MANUAL ONLY)
 * @route   POST /api/students/:id/send-reminder
 * @access  Private
 */
exports.sendPaymentReminder = async (req, res) => {
  try {
    console.log('💬 Manual reminder request for student:', req.params.id);

    const student = await Student.findById(req.params.id);
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    if (!student.phone) {
      return res.status(400).json({
        success: false,
        message: 'Student has no phone number'
      });
    }

    const { phone, message, studentName, lastPaymentDate, trainingCount } = req.body;

    console.log('📱 Sending reminder to:', phone);
    console.log('👤 Student:', studentName);
    console.log('💳 Last payment:', lastPaymentDate);
    console.log('🏊 Training count:', trainingCount);

    // ✅ CHECK WHATSAPP STATUS
    const waStatus = whatsappService.getStatus();
    console.log('🔌 WhatsApp status:', waStatus.status);

    let sendResult = {
      success: false,
      messageId: null,
      status: 'pending',
      timestamp: new Date(),
      method: 'gateway'
    };

    // ✅ SEND VIA WHATSAPP jika CONNECTED
    if (waStatus.status === 'connected') {
      try {
        const whatsappResult = await whatsappService.sendMessage(
          phone,
          message,
          'reminder',
          req.user?.id,
          {
            studentId: student._id,
            studentName: student.fullName,
            lastPaymentDate: lastPaymentDate,
            trainingCount: trainingCount,
          }
        );

        sendResult = {
          success: true,
          messageId: whatsappResult?.messageId,
          status: 'sent',
          timestamp: new Date(),
          method: 'whatsapp'
        };

        console.log('✅ Message sent via WhatsApp:', whatsappResult);
      } catch (whatsappError) {
        console.warn('⚠️ WhatsApp send failed:', whatsappError.message);
        sendResult.status = 'failed';
        sendResult.error = whatsappError.message;
        sendResult.method = 'failed';
      }
    } else {
      console.warn('⚠️ WhatsApp not connected');
      sendResult.status = 'not_connected';
    }

    // ✅ LOG
    console.log('📋 Reminder Log:', {
      studentId: student._id,
      studentName: student.fullName,
      phone: phone,
      status: sendResult.status,
      timestamp: new Date().toISOString()
    });

    // ✅ RESPONSE
    res.status(200).json({
      success: true,
      message: `Reminder ${sendResult.status === 'sent' ? 'sent' : 'processed'} successfully`,
      data: {
        studentId: student._id,
        studentName: student.fullName,
        phone: student.phone,
        lastPaymentDate,
        trainingCount,
        messageSent: sendResult.success,
        status: sendResult.status,
        messageId: sendResult.messageId,
        method: sendResult.method,
        timestamp: new Date(),
        waStatus: waStatus.status
      }
    });

    console.log('✅ Reminder processed for:', student.fullName);

  } catch (error) {
    console.error('❌ Error in sendPaymentReminder:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending reminder',
      error: error.message
    });
  }
};

module.exports = exports;
