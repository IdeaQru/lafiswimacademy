const Student = require('../models/Student');
const fs = require('fs');
const path = require('path');

// ==================== PHOTO MANAGEMENT ====================

// @desc    Upload student photo
// @route   POST /api/students/:id/photo
// @access  Public
exports.uploadStudentPhoto = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
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

    // Update student with new photo path (with leading slash)
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

// @desc    Delete student photo
// @route   DELETE /api/students/:id/photo
// @access  Public
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

    // Delete photo file
    deletePhotoFile(student.photo);

    // Remove photo from student
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

// Helper function to delete photo file
const deletePhotoFile = (photoPath) => {
  try {
    if (!photoPath) return;

    const fullPath = path.join(__dirname, '../../', photoPath);
    
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log('🗑️ Photo deleted:', photoPath);
    } else {
      console.log('⚠️ Photo file not found:', fullPath);
    }
  } catch (error) {
    console.error('❌ Error deleting photo file:', error);
  }
};

// ==================== CRUD OPERATIONS ====================

// @desc    Get all students
// @route   GET /api/students
// @access  Public
exports.getAllStudents = async (req, res) => {
  try {
    const { status, classLevel, search, page = 1, limit = 10 } = req.query;

    // Build query
    let query = {};

    if (status && status !== 'Semua') {
      query.status = status;
    }

    if (classLevel) {
      query.classLevel = classLevel;
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { parentName: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const students = await Student.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Student.countDocuments(query);

    res.status(200).json({
      success: true,
      count: students.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: students
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

// @desc    Get single student by ID
// @route   GET /api/students/:id
// @access  Public
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

// @desc    Create new student
// @route   POST /api/students
// @access  Public
exports.createStudent = async (req, res) => {
  try {
    const studentData = req.body;

    // Add photo URL if file uploaded
    if (req.file) {
      studentData.photo = `/uploads/students/${req.file.filename}`;
      console.log('📸 Photo attached to new student:', studentData.photo);
    }

    // Check if student ID already exists
    const existingStudent = await Student.findOne({ studentId: studentData.studentId });
    
    if (existingStudent) {
      // Delete uploaded file if student ID exists
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
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
    
    // Delete uploaded file on error
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
      message: 'Error creating student',
      error: error.message
    });
  }
};

// @desc    Update student
// @route   PUT /api/students/:id
// @access  Public
exports.updateStudent = async (req, res) => {
  try {
    let student = await Student.findById(req.params.id);

    if (!student) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const updateData = req.body;

    // Handle photo upload
    if (req.file) {
      // Delete old photo if exists
      if (student.photo) {
        deletePhotoFile(student.photo);
      }
      updateData.photo = `/uploads/students/${req.file.filename}`;
      console.log('📸 Photo updated:', updateData.photo);
    }

    // Check if trying to update studentId to an existing one
    if (updateData.studentId && updateData.studentId !== student.studentId) {
      const existingStudent = await Student.findOne({ studentId: updateData.studentId });
      if (existingStudent) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({
          success: false,
          message: 'Student ID already exists'
        });
      }
    }

    student = await Student.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      message: 'Student updated successfully',
      data: student
    });
  } catch (error) {
    console.error('❌ Error in updateStudent:', error);

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
      message: 'Error updating student',
      error: error.message
    });
  }
};

// @desc    Delete student
// @route   DELETE /api/students/:id
// @access  Public
exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // DELETE PHOTO FILE IF EXISTS
    if (student.photo) {
      console.log('🗑️ Deleting student photo:', student.photo);
      deletePhotoFile(student.photo);
    }

    // Delete student from database
    await Student.findByIdAndDelete(req.params.id);

    console.log('✅ Student deleted:', student.fullName);

    res.status(200).json({
      success: true,
      message: 'Student and associated photo deleted successfully',
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

// @desc    Get students statistics
// @route   GET /api/students/stats
// @access  Public
exports.getStudentStats = async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const activeStudents = await Student.countDocuments({ status: 'Aktif' });
    const inactiveStudents = await Student.countDocuments({ status: 'Non-Aktif' });
    const onLeaveStudents = await Student.countDocuments({ status: 'Cuti' });

    const byLevel = await Student.aggregate([
      {
        $group: {
          _id: '$classLevel',
          count: { $sum: 1 }
        }
      }
    ]);

    const byAbility = await Student.aggregate([
      {
        $group: {
          _id: '$swimmingAbility',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: totalStudents,
        active: activeStudents,
        inactive: inactiveStudents,
        onLeave: onLeaveStudents,
        byLevel,
        byAbility
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

// @desc    Search students
// @route   GET /api/students/search
// @access  Public
exports.searchStudents = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const students = await Student.find({
      $or: [
        { fullName: { $regex: q, $options: 'i' } },
        { studentId: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { parentName: { $regex: q, $options: 'i' } }
      ]
    }).limit(20);

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

// @desc    Filter students by status
// @route   GET /api/students/filter
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

    const students = await Student.find({ status });

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
// ==================== PAYMENT MANAGEMENT ====================

// @desc    Get students with overdue payments
// @route   GET /api/students/overdue-payments
// @access  Public
exports.getOverduePayments = async (req, res) => {
  try {
    console.log('📅 Getting students with overdue payments...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day

    // Find students where payment is overdue
    const overdueStudents = await Student.find({
      status: 'Aktif',
      monthlyFee: { $exists: true, $gt: 0 }, // Has monthly fee set
      $or: [
        { paymentStatus: 'Overdue' },
        {
          nextPaymentDue: { $lt: today },
          paymentStatus: { $ne: 'Paid' }
        }
      ]
    })
    .select('studentId fullName phone photo monthlyFee paymentDueDate lastPaymentDate nextPaymentDue paymentStatus monthsUnpaid totalUnpaid enableReminder')
    .sort({ nextPaymentDue: 1 });

    // Calculate months unpaid and total if not already set
    for (let student of overdueStudents) {
      if (student.lastPaymentDate) {
        const lastPaid = new Date(student.lastPaymentDate);
        const monthsDiff = (today.getFullYear() - lastPaid.getFullYear()) * 12 
          + (today.getMonth() - lastPaid.getMonth());
        
        if (monthsDiff > 0) {
          student.monthsUnpaid = monthsDiff;
          student.totalUnpaid = (student.monthlyFee || 0) * monthsDiff;
          await student.save();
        }
      } else if (!student.paymentStatus || student.paymentStatus === 'Pending') {
        // First time setup - calculate from registration date
        const registrationDate = new Date(student.registrationDate || student.createdAt);
        const monthsSinceReg = (today.getFullYear() - registrationDate.getFullYear()) * 12 
          + (today.getMonth() - registrationDate.getMonth());
        
        if (monthsSinceReg > 0) {
          student.monthsUnpaid = monthsSinceReg;
          student.totalUnpaid = (student.monthlyFee || 0) * monthsSinceReg;
          student.paymentStatus = 'Overdue';
          await student.save();
        }
      }
    }

    console.log(`✅ Found ${overdueStudents.length} students with overdue payments`);
    
    res.status(200).json({
      success: true,
      count: overdueStudents.length,
      data: overdueStudents
    });
  } catch (error) {
    console.error('❌ Error in getOverduePayments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching overdue payments',
      error: error.message
    });
  }
};

// @desc    Get students with upcoming payments (next 3 days)
// @route   GET /api/students/upcoming-payments
// @access  Public
exports.getUpcomingPayments = async (req, res) => {
  try {
    console.log('📅 Getting students with upcoming payments...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);
    threeDaysFromNow.setHours(23, 59, 59, 999);

    const upcomingStudents = await Student.find({
      status: 'Aktif',
      monthlyFee: { $exists: true, $gt: 0 }, // Has monthly fee set
      paymentStatus: { $in: ['Pending', null] },
      $or: [
        {
          nextPaymentDue: {
            $gte: today,
            $lte: threeDaysFromNow
          }
        },
        {
          // Calculate from paymentDueDate if nextPaymentDue not set
          paymentDueDate: { $exists: true },
          nextPaymentDue: { $exists: false }
        }
      ]
    })
    .select('studentId fullName phone photo monthlyFee paymentDueDate nextPaymentDue paymentStatus enableReminder')
    .sort({ nextPaymentDue: 1 });

    // Calculate nextPaymentDue if not set
    for (let student of upcomingStudents) {
      if (!student.nextPaymentDue && student.paymentDueDate) {
        const nextDue = new Date(today.getFullYear(), today.getMonth(), student.paymentDueDate);
        
        // If due date has passed this month, set to next month
        if (nextDue < today) {
          nextDue.setMonth(nextDue.getMonth() + 1);
        }
        
        student.nextPaymentDue = nextDue;
        student.paymentStatus = 'Pending';
        await student.save();
      }
    }

    // Filter again after setting nextPaymentDue
    const filteredStudents = upcomingStudents.filter(student => {
      if (!student.nextPaymentDue) return false;
      const dueDate = new Date(student.nextPaymentDue);
      return dueDate >= today && dueDate <= threeDaysFromNow;
    });

    console.log(`✅ Found ${filteredStudents.length} students with upcoming payments`);
    
    res.status(200).json({
      success: true,
      count: filteredStudents.length,
      data: filteredStudents
    });
  } catch (error) {
    console.error('❌ Error in getUpcomingPayments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching upcoming payments',
      error: error.message
    });
  }
};

// @desc    Update student payment status (helper function)
// @route   Internal use
// @access  Private
exports.updatePaymentStatus = async (studentId) => {
  try {
    const student = await Student.findById(studentId);
    if (!student) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate next payment due if not set
    if (!student.nextPaymentDue && student.paymentDueDate) {
      const nextDue = new Date(today.getFullYear(), today.getMonth(), student.paymentDueDate);
      
      if (nextDue < today) {
        nextDue.setMonth(nextDue.getMonth() + 1);
      }
      
      student.nextPaymentDue = nextDue;
    }

    // Update payment status based on nextPaymentDue
    if (student.nextPaymentDue) {
      const dueDate = new Date(student.nextPaymentDue);
      
      if (today > dueDate) {
        student.paymentStatus = 'Overdue';
        
        // Calculate months unpaid
        if (student.lastPaymentDate) {
          const lastPaid = new Date(student.lastPaymentDate);
          const monthsDiff = (today.getFullYear() - lastPaid.getFullYear()) * 12 
            + (today.getMonth() - lastPaid.getMonth());
          student.monthsUnpaid = monthsDiff > 0 ? monthsDiff : 0;
          student.totalUnpaid = (student.monthlyFee || 0) * student.monthsUnpaid;
        }
      } else {
        student.paymentStatus = 'Pending';
        student.monthsUnpaid = 0;
        student.totalUnpaid = 0;
      }
      
      await student.save();
      console.log(`✅ Payment status updated for ${student.fullName}: ${student.paymentStatus}`);
    }
  } catch (error) {
    console.error('❌ Error updating payment status:', error);
  }
};

// @desc    Send payment reminder to student
// @route   POST /api/students/:id/payment-reminder
// @access  Public
exports.sendPaymentReminder = async (req, res) => {
  try {
    const Student = require('../models/Student');
    const whatsappService = require('../services/whatsappService');
    const Message = require('../models/Message');

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

    // Format message
    const paymentReminderJob = require('../jobs/paymentReminderJob');
    let message;
    
    if (student.paymentStatus === 'Overdue') {
      message = paymentReminderJob.formatOverdueMessage(student);
    } else {
      message = paymentReminderJob.formatUpcomingMessage(student);
    }

    // Send WhatsApp
    await whatsappService.sendMessage(student.phone, message);

    // Save to database
    await Message.create({
      recipient: student.phone,
      recipientName: student.fullName,
      message: message,
      type: 'manual',
      status: 'sent',
      sentByName: 'Admin',
      metadata: {
        studentId: student._id,
        reminderType: student.paymentStatus === 'Overdue' ? 'payment_overdue' : 'payment_upcoming'
      },
      sentAt: new Date()
    });

    res.status(200).json({
      success: true,
      message: `Payment reminder sent to ${student.fullName}`,
      data: {
        studentName: student.fullName,
        phone: student.phone,
        paymentStatus: student.paymentStatus
      }
    });
  } catch (error) {
    console.error('❌ Error sending payment reminder:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending payment reminder',
      error: error.message
    });
  }
};

