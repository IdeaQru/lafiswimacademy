const Schedule = require('../models/Schedule');
const whatsappService = require('../services/whatsappService');

// Helper function untuk format pesan reminder COACH
const formatReminderMessage = (schedule) => {
  const date = new Date(schedule.date);
  const formattedDate = date.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

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

// Helper function untuk format pesan konfirmasi COACH
const formatConfirmationMessage = (schedule) => {
  const date = new Date(schedule.date);
  const formattedDate = date.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

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

// Get all schedules with filters
exports.getSchedules = async (req, res) => {
  try {
    const schedules = await Schedule.find()
      .populate('studentId', '_id fullName phone')
      .populate('coachId', '_id fullName phone')
      .sort({ date: -1 })
      .lean();

    // Transform to include IDs and flatten data
    const transformedSchedules = schedules.map(schedule => ({
      ...schedule,
      studentId: schedule.studentId?._id?.toString() || schedule.studentId,
      coachId: schedule.coachId?._id?.toString() || schedule.coachId,
      studentName: schedule.studentId?.fullName || schedule.studentName,
      coachName: schedule.coachId?.fullName || schedule.coachName,
      studentPhone: schedule.studentId?.phone || schedule.studentPhone,
      coachPhone: schedule.coachId?.phone || schedule.coachPhone
    }));

    res.status(200).json({
      success: true,
      count: transformedSchedules.length,
      data: transformedSchedules
    });
  } catch (error) {
    console.error('Error getting schedules:', error);
    res.status(500).json({ 
      success: false,
      message: 'Gagal mengambil data jadwal', 
      error: error.message 
    });
  }
};

// Get schedules by date range
exports.getSchedulesByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ 
        success: false,
        message: 'Start date and end date are required' 
      });
    }

    const schedules = await Schedule.find({
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    })
      .sort({ date: 1, startTime: 1 })
      .populate('studentId', '_id fullName phone')
      .populate('coachId', '_id fullName phone')
      .lean();

    // Transform data
    const transformedSchedules = schedules.map(schedule => ({
      ...schedule,
      studentId: schedule.studentId?._id?.toString() || schedule.studentId,
      coachId: schedule.coachId?._id?.toString() || schedule.coachId,
      studentName: schedule.studentId?.fullName || schedule.studentName,
      coachName: schedule.coachId?.fullName || schedule.coachName,
      studentPhone: schedule.studentId?.phone || schedule.studentPhone,
      coachPhone: schedule.coachId?.phone || schedule.coachPhone
    }));

    res.json({
      success: true,
      count: transformedSchedules.length,
      data: transformedSchedules
    });
  } catch (error) {
    console.error('Error getting schedules by date range:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Get schedule by ID
exports.getScheduleById = async (req, res) => {
  try {
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

    // Transform data
    const transformedSchedule = {
      ...schedule,
      studentId: schedule.studentId?._id?.toString() || schedule.studentId,
      coachId: schedule.coachId?._id?.toString() || schedule.coachId,
      studentName: schedule.studentId?.fullName || schedule.studentName,
      coachName: schedule.coachId?.fullName || schedule.coachName,
      studentPhone: schedule.studentId?.phone || schedule.studentPhone,
      coachPhone: schedule.coachId?.phone || schedule.coachPhone
    };

    res.json({
      success: true,
      data: transformedSchedule
    });
  } catch (error) {
    console.error('Error getting schedule:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Get schedules by coach
exports.getSchedulesByCoach = async (req, res) => {
  try {
    const schedules = await Schedule.find({ coachId: req.params.coachId })
      .sort({ date: 1, startTime: 1 })
      .populate('studentId', '_id fullName phone')
      .lean();

    // Transform data
    const transformedSchedules = schedules.map(schedule => ({
      ...schedule,
      studentId: schedule.studentId?._id?.toString() || schedule.studentId,
      studentName: schedule.studentId?.fullName || schedule.studentName,
      studentPhone: schedule.studentId?.phone || schedule.studentPhone
    }));

    res.json({
      success: true,
      count: transformedSchedules.length,
      data: transformedSchedules
    });
  } catch (error) {
    console.error('Error getting coach schedules:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Get schedules by student
exports.getSchedulesByStudent = async (req, res) => {
  try {
    const schedules = await Schedule.find({ studentId: req.params.studentId })
      .sort({ date: 1, startTime: 1 })
      .populate('coachId', '_id fullName phone')
      .lean();

    // Transform data
    const transformedSchedules = schedules.map(schedule => ({
      ...schedule,
      coachId: schedule.coachId?._id?.toString() || schedule.coachId,
      coachName: schedule.coachId?.fullName || schedule.coachName,
      coachPhone: schedule.coachId?.phone || schedule.coachPhone
    }));

    res.json({
      success: true,
      count: transformedSchedules.length,
      data: transformedSchedules
    });
  } catch (error) {
    console.error('Error getting student schedules:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Create new schedule
exports.createSchedule = async (req, res) => {
  try {
    const schedule = new Schedule(req.body);
    await schedule.save();

    // Populate untuk mendapatkan data lengkap
    await schedule.populate('studentId', 'fullName phone');
    await schedule.populate('coachId', 'fullName phone');

    // Send WhatsApp confirmation to COACH only
    if (schedule.reminderEnabled && whatsappService.isReady()) {
      try {
        const coachPhone = schedule.coachId?.phone || schedule.coachPhone;
        const coachName = schedule.coachId?.fullName || schedule.coachName;
        
        if (coachPhone) {
          // Prepare schedule data for message
          const scheduleData = {
            ...schedule.toObject(),
            coachName,
            coachPhone,
            studentName: schedule.studentId?.fullName || schedule.studentName,
            studentPhone: schedule.studentId?.phone || schedule.studentPhone
          };
          
          const message = formatConfirmationMessage(scheduleData);
          await whatsappService.sendMessage(coachPhone, message);
          console.log(`✅ Coach confirmation sent to ${coachPhone}`);
        } else {
          console.log('⚠️ Coach phone not available');
        }
      } catch (waError) {
        console.error('⚠️ Failed to send confirmation:', waError.message);
        // Don't fail the request if WhatsApp fails
      }
    }

    res.status(201).json({
      success: true,
      message: 'Jadwal berhasil dibuat',
      data: schedule
    });
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ 
      success: false,
      message: 'Gagal membuat jadwal', 
      error: error.message 
    });
  }
};

// Update schedule
exports.updateSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
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

    res.json({
      success: true,
      message: 'Jadwal berhasil diupdate',
      data: schedule
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ 
      success: false,
      message: 'Gagal update jadwal', 
      error: error.message 
    });
  }
};

// Delete schedule
exports.deleteSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndDelete(req.params.id);

    if (!schedule) {
      return res.status(404).json({ 
        success: false,
        message: 'Schedule not found' 
      });
    }

    res.json({ 
      success: true,
      message: 'Schedule deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ 
      success: false,
      message: 'Gagal menghapus jadwal', 
      error: error.message 
    });
  }
};

// Update schedule status
exports.updateScheduleStatus = async (req, res) => {
  try {
    const { status } = req.body;

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

    res.json({
      success: true,
      message: 'Status berhasil diupdate',
      data: schedule
    });
  } catch (error) {
    console.error('Error updating schedule status:', error);
    res.status(500).json({ 
      success: false,
      message: 'Gagal update status', 
      error: error.message 
    });
  }
};

// Toggle reminder
exports.toggleReminder = async (req, res) => {
  try {
    const { reminderEnabled } = req.body;

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

    res.json({
      success: true,
      message: `Reminder ${reminderEnabled ? 'enabled' : 'disabled'}`,
      data: schedule
    });
  } catch (error) {
    console.error('Error toggling reminder:', error);
    res.status(500).json({ 
      success: false,
      message: 'Gagal toggle reminder', 
      error: error.message 
    });
  }
};

// Send WhatsApp reminder manually (COACH only)
exports.sendWhatsAppReminder = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
      .populate('studentId', 'fullName phone')
      .populate('coachId', 'fullName phone');

    if (!schedule) {
      return res.status(404).json({ 
        success: false,
        message: 'Schedule not found' 
      });
    }

    // Check if WhatsApp is ready
    if (!whatsappService.isReady()) {
      return res.status(503).json({ 
        success: false, 
        message: 'WhatsApp service is not ready. Please check connection.' 
      });
    }

    // Get coach phone
    const coachPhone = schedule.coachId?.phone || schedule.coachPhone;
    const coachName = schedule.coachId?.fullName || schedule.coachName;

    // Check if coach phone exists
    if (!coachPhone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nomor HP coach tidak tersedia' 
      });
    }

    // Prepare schedule data for message
    const scheduleData = {
      ...schedule.toObject(),
      coachName,
      coachPhone,
      studentName: schedule.studentId?.fullName || schedule.studentName,
      studentPhone: schedule.studentId?.phone || schedule.studentPhone
    };

    // Send reminder to COACH
    const message = formatReminderMessage(scheduleData);
    await whatsappService.sendMessage(coachPhone, message);

    // Update reminder status
    schedule.reminderSent = true;
    schedule.reminderSentAt = new Date();
    await schedule.save();

    console.log(`✅ Coach reminder sent to ${coachPhone}`);

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
    console.error('Error sending WhatsApp reminder:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Gagal mengirim pengingat WhatsApp',
      error: error.message 
    });
  }
};

// Check schedule conflicts
exports.checkConflicts = async (req, res) => {
  try {
    const { coachId, date, startTime, endTime, scheduleId } = req.body;

    if (!coachId || !date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'coachId, date, startTime, and endTime are required'
      });
    }

    const queryDate = new Date(date);
    const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));

    // Build query
    const query = {
      coachId,
      date: { $gte: startOfDay, $lte: endOfDay },
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

    // Exclude current schedule when updating
    if (scheduleId) {
      query._id = { $ne: scheduleId };
    }

    const conflicts = await Schedule.find(query)
      .populate('studentId', 'fullName')
      .populate('coachId', 'fullName');

    res.json({
      success: true,
      hasConflict: conflicts.length > 0,
      count: conflicts.length,
      conflicts
    });
  } catch (error) {
    console.error('Error checking conflicts:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};
