// backend/src/controllers/scheduleController.js

const Schedule = require('../models/Schedule');
const whatsappService = require('../services/whatsappService');

// ==================== DATE HELPER FUNCTIONS ====================

/**
 * ✅ Normalize date ke local YYYY-MM-DD (00:00:00)
 */
const normalizeDate = (date) => {
  try {
    if (!date) return null;

    let d;
    
    if (typeof date === 'string') {
      // Handle various string formats
      if (date.includes('T')) {
        // ISO format: 2025-11-04T00:00:00.000Z
        d = new Date(date);
      } else if (date.includes('-')) {
        // YYYY-MM-DD format
        d = new Date(date + 'T00:00:00');
      } else if (date.includes('/')) {
        // DD/MM/YYYY or MM/DD/YYYY
        d = new Date(date);
      } else {
        d = new Date(date);
      }
    } else if (date instanceof Date) {
      d = new Date(date);
    } else {
      d = new Date(date);
    }

    // Validate
    if (isNaN(d.getTime())) {
      console.warn('Invalid date:', date);
      return null;
    }

    // ✅ Strip to local midnight
    const normalized = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
    return normalized;
  } catch (error) {
    console.error('Error normalizing date:', error);
    return null;
  }
};

/**
 * ✅ Format date untuk WhatsApp message
 */
const formatDateForMessage = (date) => {
  try {
    const d = new Date(date);
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.warn('Error formatting date:', error);
    return date?.toString() || 'N/A';
  }
};

/**
 * ✅ Get date range untuk query
 */
const getDateRange = (startDate, endDate) => {
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);

  if (!start || !end) {
    throw new Error('Invalid date range');
  }

  // Ensure start <= end
  if (start > end) {
    return { $gte: end, $lte: start };
  }

  return { $gte: start, $lte: end };
};

// ==================== MESSAGE FORMATTERS ====================

const formatReminderMessage = (schedule) => {
  const formattedDate = formatDateForMessage(schedule.date);

  return `👨‍🏫 *Pengingat Jadwal Mengajar - Lafi Swimming Academy*


Halo Coach ${schedule.coachName}! 👋


Pengingat jadwal mengajar Anda:


📅 *Tanggal:* ${formattedDate}
⏰ *Waktu:* ${schedule.startTime} - ${schedule.endTime}
👨‍🎓 *Siswa:* ${schedule.studentName}
📱 *HP Siswa:* ${schedule.studentPhone}
🏊 *Program:* ${schedule.program}
📍 *Lokasi:* ${schedule.location}


Mohon persiapkan materi dan peralatan yang diperlukan.


Terima kasih! 💪
*Lafi Swimming Academy*
📱 WA: 0821-4004-4677`;
};

const formatConfirmationMessage = (schedule) => {
  const formattedDate = formatDateForMessage(schedule.date);

  return `✅ *Jadwal Mengajar Baru - Lafi Swimming Academy*


Halo Coach ${schedule.coachName}! 👋


Anda dijadwalkan untuk mengajar:


📅 *Tanggal:* ${formattedDate}
⏰ *Waktu:* ${schedule.startTime} - ${schedule.endTime}
👨‍🎓 *Siswa:* ${schedule.studentName}
📱 *HP Siswa:* ${schedule.studentPhone}
🏊 *Program:* ${schedule.program}
📍 *Lokasi:* ${schedule.location}


Anda akan menerima pengingat 24 jam sebelum jadwal.


Terima kasih! 💪
*Lafi Swimming Academy*
📱 WA: 0821-4004-4677`;
};

// ==================== HELPERS ====================

const transformSchedule = (schedule) => {
  return {
    ...schedule,
    studentId: schedule.studentId?._id?.toString() || schedule.studentId,
    coachId: schedule.coachId?._id?.toString() || schedule.coachId,
    studentName: schedule.studentId?.fullName || schedule.studentName,
    coachName: schedule.coachId?.fullName || schedule.coachName,
    studentPhone: schedule.studentId?.phone || schedule.studentPhone,
    coachPhone: schedule.coachId?.phone || schedule.coachPhone
  };
};

// ==================== CRUD OPERATIONS ====================

/**
 * ✅ Get all schedules
 */
exports.getSchedules = async (req, res) => {
  try {
    console.log('📋 GET /schedules');

    const schedules = await Schedule.find()
      .populate('studentId', '_id fullName phone')
      .populate('coachId', '_id fullName phone')
      .sort({ date: -1 })
      .lean();

    const transformed = schedules.map(transformSchedule);

    console.log(`✅ Found ${transformed.length} schedules`);

    res.status(200).json({
      success: true,
      count: transformed.length,
      data: transformed
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data jadwal',
      error: error.message
    });
  }
};

/**
 * ✅ Get schedules by date range
 */
exports.getSchedulesByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    console.log('📋 GET /schedules/range');
    console.log('   Input startDate:', startDate);
    console.log('   Input endDate:', endDate);

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    // ✅ Normalize dates
    const dateRange = getDateRange(startDate, endDate);

    console.log('   Query range:', {
      $gte: dateRange.$gte.toISOString(),
      $lte: dateRange.$lte.toISOString()
    });

    const schedules = await Schedule.find({
      date: dateRange
    })
      .sort({ date: 1, startTime: 1 })
      .populate('studentId', '_id fullName phone')
      .populate('coachId', '_id fullName phone')
      .lean();

    const transformed = schedules.map(transformSchedule);

    console.log(`✅ Found ${transformed.length} schedules`);

    res.json({
      success: true,
      count: transformed.length,
      data: transformed
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * ✅ Get schedule by ID
 */
exports.getScheduleById = async (req, res) => {
  try {
    console.log('📋 GET /schedules/:id');
    console.log('   ID:', req.params.id);

    const schedule = await Schedule.findById(req.params.id)
      .populate('studentId', '_id fullName phone')
      .populate('coachId', '_id fullName phone')
      .lean();

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    const transformed = transformSchedule(schedule);

    console.log('✅ Schedule found');

    res.json({
      success: true,
      data: transformed
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * ✅ Get schedules by coach
 */
exports.getSchedulesByCoach = async (req, res) => {
  try {
    console.log('📋 GET /schedules/coach/:coachId');
    console.log('   Coach ID:', req.params.coachId);

    const schedules = await Schedule.find({
      coachId: req.params.coachId
    })
      .sort({ date: 1, startTime: 1 })
      .populate('studentId', '_id fullName phone')
      .populate('coachId', '_id fullName phone')
      .lean();

    const transformed = schedules.map(transformSchedule);

    console.log(`✅ Found ${transformed.length} schedules`);

    res.json({
      success: true,
      count: transformed.length,
      data: transformed
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * ✅ Get schedules by student
 */
exports.getSchedulesByStudent = async (req, res) => {
  try {
    console.log('📋 GET /schedules/student/:studentId');
    console.log('   Student ID:', req.params.studentId);

    const schedules = await Schedule.find({
      studentId: req.params.studentId
    })
      .sort({ date: 1, startTime: 1 })
      .populate('coachId', '_id fullName phone')
      .populate('studentId', '_id fullName phone')
      .lean();

    const transformed = schedules.map(transformSchedule);

    console.log(`✅ Found ${transformed.length} schedules`);

    res.json({
      success: true,
      count: transformed.length,
      data: transformed
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * ✅ Create schedule
 */
exports.createSchedule = async (req, res) => {
  try {
    console.log('📝 POST /schedules');
    console.log('   Data:', req.body);

    // ✅ Normalize date
    const normalizedDate = normalizeDate(req.body.date);

    if (!normalizedDate) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    const scheduleData = {
      ...req.body,
      date: normalizedDate
    };

    const schedule = new Schedule(scheduleData);
    await schedule.save();

    await schedule.populate('studentId', '_id fullName phone');
    await schedule.populate('coachId', '_id fullName phone');

    console.log('✅ Schedule created:', schedule._id);

    // Send WhatsApp confirmation to COACH
    if (schedule.reminderEnabled && whatsappService.isReady()) {
      try {
        const coachPhone = schedule.coachId?.phone || schedule.coachPhone;
        const coachName = schedule.coachId?.fullName || schedule.coachName;

        if (coachPhone) {
          const scheduleData = {
            ...schedule.toObject(),
            coachName,
            coachPhone,
            studentName: schedule.studentId?.fullName || schedule.studentName,
            studentPhone: schedule.studentId?.phone || schedule.studentPhone
          };

          const message = formatConfirmationMessage(scheduleData);
          await whatsappService.sendMessage(coachPhone, message);
          console.log(`✅ Confirmation sent to ${coachPhone}`);
        }
      } catch (waError) {
        console.error('⚠️ WhatsApp error:', waError.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Jadwal berhasil dibuat',
      data: schedule
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal membuat jadwal',
      error: error.message
    });
  }
};

/**
 * ✅ Update schedule
 */
exports.updateSchedule = async (req, res) => {
  try {
    console.log('🔄 PUT /schedules/:id');
    console.log('   ID:', req.params.id);

    let updateData = { ...req.body };

    // ✅ Normalize date if present
    if (updateData.date) {
      const normalized = normalizeDate(updateData.date);
      if (!normalized) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format'
        });
      }
      updateData.date = normalized;
      console.log('   Normalized date:', normalized.toISOString());
    }

    updateData.updatedAt = Date.now();

    const schedule = await Schedule.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('studentId', '_id fullName phone')
      .populate('coachId', '_id fullName phone');

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    console.log('✅ Schedule updated');

    res.json({
      success: true,
      message: 'Jadwal berhasil diupdate',
      data: schedule
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal update jadwal',
      error: error.message
    });
  }
};

/**
 * ✅ Delete schedule
 */
exports.deleteSchedule = async (req, res) => {
  try {
    console.log('🗑️ DELETE /schedules/:id');
    console.log('   ID:', req.params.id);

    const schedule = await Schedule.findByIdAndDelete(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    console.log('✅ Schedule deleted');

    res.json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus jadwal',
      error: error.message
    });
  }
};

/**
 * ✅ Update schedule status
 */
exports.updateScheduleStatus = async (req, res) => {
  try {
    const { status } = req.body;

    console.log('📊 PATCH /schedules/:id/status');
    console.log('   Status:', status);

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const schedule = await Schedule.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: Date.now() },
      { new: true, runValidators: true }
    )
      .populate('studentId', '_id fullName phone')
      .populate('coachId', '_id fullName phone');

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    console.log('✅ Status updated');

    res.json({
      success: true,
      message: 'Status berhasil diupdate',
      data: schedule
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal update status',
      error: error.message
    });
  }
};

/**
 * ✅ Toggle reminder
 */
exports.toggleReminder = async (req, res) => {
  try {
    const { reminderEnabled } = req.body;

    console.log('🔔 PATCH /schedules/:id/reminder');
    console.log('   Enabled:', reminderEnabled);

    if (typeof reminderEnabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'reminderEnabled must be a boolean'
      });
    }

    const schedule = await Schedule.findByIdAndUpdate(
      req.params.id,
      { reminderEnabled, updatedAt: Date.now() },
      { new: true }
    );

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    console.log('✅ Reminder toggled');

    res.json({
      success: true,
      message: `Reminder ${reminderEnabled ? 'enabled' : 'disabled'}`,
      data: schedule
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal toggle reminder',
      error: error.message
    });
  }
};

/**
 * ✅ Send WhatsApp reminder manually
 */
exports.sendWhatsAppReminder = async (req, res) => {
  try {
    console.log('📱 POST /schedules/:id/send-whatsapp-reminder');
    console.log('   ID:', req.params.id);

    const schedule = await Schedule.findById(req.params.id)
      .populate('studentId', 'fullName phone')
      .populate('coachId', 'fullName phone');

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    if (!whatsappService.isReady()) {
      return res.status(503).json({
        success: false,
        message: 'WhatsApp service is not ready'
      });
    }

    const coachPhone = schedule.coachId?.phone || schedule.coachPhone;
    const coachName = schedule.coachId?.fullName || schedule.coachName;

    if (!coachPhone) {
      return res.status(400).json({
        success: false,
        message: 'Nomor HP coach tidak tersedia'
      });
    }

    const scheduleData = {
      ...schedule.toObject(),
      coachName,
      coachPhone,
      studentName: schedule.studentId?.fullName || schedule.studentName,
      studentPhone: schedule.studentId?.phone || schedule.studentPhone
    };

    const message = formatReminderMessage(scheduleData);
    await whatsappService.sendMessage(coachPhone, message);

    schedule.reminderSent = true;
    schedule.reminderSentAt = new Date();
    await schedule.save();

    console.log(`✅ Reminder sent to ${coachPhone}`);

    res.json({
      success: true,
      message: `Pengingat WhatsApp berhasil dikirim ke Coach ${coachName}!`,
      data: {
        recipient: coachPhone,
        recipientName: coachName,
        sentAt: new Date()
      }
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengirim pengingat WhatsApp',
      error: error.message
    });
  }
};

/**
 * ✅ Check schedule conflicts
 */
exports.checkConflicts = async (req, res) => {
  try {
    const { coachId, date, startTime, endTime, scheduleId } = req.body;

    console.log('⚠️ POST /schedules/check-conflicts');
    console.log('   Coach:', coachId, 'Date:', date);

    if (!coachId || !date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'coachId, date, startTime, and endTime are required'
      });
    }

    // ✅ Normalize date
    const queryDate = normalizeDate(date);

    if (!queryDate) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    const query = {
      coachId,
      date: queryDate,
      status: { $ne: 'cancelled' },
      $or: [
        {
          $and: [
            { startTime: { $lte: startTime } },
            { endTime: { $gt: startTime } }
          ]
        },
        {
          $and: [
            { startTime: { $lt: endTime } },
            { endTime: { $gte: endTime } }
          ]
        },
        {
          $and: [
            { startTime: { $gte: startTime } },
            { endTime: { $lte: endTime } }
          ]
        }
      ]
    };

    if (scheduleId) {
      query._id = { $ne: scheduleId };
    }

    const conflicts = await Schedule.find(query)
      .populate('studentId', 'fullName')
      .populate('coachId', 'fullName');

    console.log(`✅ Found ${conflicts.length} conflicts`);

    res.json({
      success: true,
      hasConflict: conflicts.length > 0,
      count: conflicts.length,
      conflicts
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
