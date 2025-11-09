// backend/src/controllers/scheduleController.js

const Schedule = require('../models/Schedule');
const whatsappService = require('../services/whatsappService');

// ==================== DATE HELPERS ====================

/**
 * ✅ Normalize date ke local YYYY-MM-DD (00:00:00)
 */
const normalizeDate = (date) => {
  try {
    if (!date) return null;

    let d;

    if (typeof date === 'string') {
      if (date.includes('T')) {
        d = new Date(date);
      } else if (date.includes('-')) {
        d = new Date(date + 'T00:00:00');
      } else {
        d = new Date(date);
      }
    } else if (date instanceof Date) {
      d = new Date(date);
    } else {
      d = new Date(date);
    }

    if (isNaN(d.getTime())) {
      console.warn('Invalid date:', date);
      return null;
    }

    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
  } catch (error) {
    console.error('Error normalizing date:', error);
    return null;
  }
};

/**
 * ✅ Format date untuk WhatsApp
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

  if (start > end) {
    return { $gte: end, $lte: start };
  }

  return { $gte: start, $lte: end };
};

// ==================== MESSAGE FORMATTERS ====================

/**
 * ✅ Format reminder message untuk PRIVATE schedule (1:1)
 */
const formatPrivateReminderMessage = (schedule) => {
  const formattedDate = formatDateForMessage(schedule.date);

  return `👨‍🏫 *Pengingat Jadwal Mengajar - Lafi Swimming Academy*

Halo Coach ${schedule.coachName}! 👋

Pengingat jadwal mengajar Anda:

📅 *Tanggal:* ${formattedDate}
⏰ *Waktu:* ${schedule.startTime} - ${schedule.endTime}
👨‍🎓 *Siswa:* ${schedule.studentName}
🏊 *Program:* ${schedule.program}
${schedule.programCategory ? `📂 *Kategori:* ${schedule.programCategory}\n` : ''}📍 *Lokasi:* ${schedule.location}
⏱️ *Durasi:* ${schedule.duration} menit

Mohon persiapkan materi dan peralatan yang diperlukan.

Terima kasih! 💪
*Lafi Swimming Academy*
📱 WA: 0821-4004-4677`;
};

/**
 * ✅ Format reminder message untuk GROUP schedule
 */
const formatGroupReminderMessage = (schedule) => {
  const formattedDate = formatDateForMessage(schedule.date);
  const studentList = schedule.students
    ?.map(s => `• ${s.fullName}`)
    .join('\n') || '• (Siswa tidak tersedia)';

  return `👨‍🏫 *Pengingat Group Class - Lafi Swimming Academy*

Halo Coach ${schedule.coachName}! 👋

Pengingat group class Anda:

📝 *Group:* ${schedule.groupName}
📅 *Tanggal:* ${formattedDate}
⏰ *Waktu:* ${schedule.startTime} - ${schedule.endTime}
👨‍🎓 *Siswa (${schedule.students?.length || 0}):*
${studentList}
🏊 *Program:* ${schedule.program}
${schedule.programCategory ? `📂 *Kategori:* ${schedule.programCategory}\n` : ''}📍 *Lokasi:* ${schedule.location}
⏱️ *Durasi:* ${schedule.duration} menit

Mohon persiapkan materi dan peralatan yang diperlukan.

Terima kasih! 💪
*Lafi Swimming Academy*
📱 WA: 0821-4004-4677`;
};

/**
 * ✅ Format confirmation message untuk coach (support private & group)
 */
const formatConfirmationMessage = (schedule) => {
  const formattedDate = formatDateForMessage(schedule.date);

  if (schedule.scheduleType === 'private') {
    return `✅ *Jadwal Mengajar Baru - Lafi Swimming Academy*

Halo Coach ${schedule.coachName}! 👋

Anda dijadwalkan untuk mengajar:

📅 *Tanggal:* ${formattedDate}
⏰ *Waktu:* ${schedule.startTime} - ${schedule.endTime}
👨‍🎓 *Siswa:* ${schedule.studentName}
🏊 *Program:* ${schedule.program}
${schedule.programCategory ? `📂 *Kategori:* ${schedule.programCategory}\n` : ''}📍 *Lokasi:* ${schedule.location}

Anda akan menerima pengingat 24 jam sebelum jadwal.

Terima kasih! 💪
*Lafi Swimming Academy*
📱 WA: 0821-4004-4677`;
  } else {
    const studentList = schedule.students
      ?.map(s => `• ${s.fullName}`)
      .join('\n') || '• (Siswa tidak tersedia)';

    return `✅ *Group Class Baru - Lafi Swimming Academy*

Halo Coach ${schedule.coachName}! 👋

Anda ditambahkan ke group class baru:

📝 *Group:* ${schedule.groupName}
📅 *Tanggal:* ${formattedDate}
⏰ *Waktu:* ${schedule.startTime} - ${schedule.endTime}
👨‍🎓 *Siswa (${schedule.students?.length || 0}):*
${studentList}
🏊 *Program:* ${schedule.program}
${schedule.programCategory ? `📂 *Kategori:* ${schedule.programCategory}\n` : ''}📍 *Lokasi:* ${schedule.location}

Anda akan menerima pengingat 24 jam sebelum jadwal.

Terima kasih! 💪
*Lafi Swimming Academy*
📱 WA: 0821-4004-4677`;
  }
};

// ==================== HELPERS ====================

/**
 * ✅ Transform schedule response - support both private & group
 * PENTING: Handle coach info untuk BOTH type!
 */
const transformSchedule = (schedule) => {
  const transformed = { ...schedule };

  // ==================== PRIVATE SCHEDULE ====================
  if (schedule.scheduleType === 'private') {
    // ✅ Extract IDs untuk private
    transformed.studentId = schedule.studentId?._id?.toString() || schedule.studentId;
    transformed.coachId = schedule.coachId?._id?.toString() || schedule.coachId;
    transformed.studentName = schedule.studentId?.fullName || schedule.studentName;
    transformed.coachName = schedule.coachId?.fullName || schedule.coachName;
    transformed.studentPhone = schedule.studentId?.phone || schedule.studentPhone;
    transformed.coachPhone = schedule.coachId?.phone || schedule.coachPhone;

    console.log(`✅ Transformed PRIVATE schedule - Coach: ${transformed.coachName}`);
  }
  // ==================== GROUP SCHEDULE ====================
  else if (schedule.scheduleType === 'group') {
    // ✅ Group schedule - extract dari coaches array
    transformed.coachId = undefined; // coachId tetap undefined untuk group
    
    // ✅ Extract coach names dari coaches array
    transformed.coachName = schedule.coaches
      ?.map(c => c.fullName)
      .join(', ') || 'Unknown';
    
    // ✅ Extract coach phones
    transformed.coachPhone = schedule.coaches
      ?.map(c => c.phone)
      .join(', ') || null;

    // ✅ Ensure students array exists
    transformed.students = schedule.students || [];

    console.log(
      `✅ Transformed GROUP schedule - Coaches: ${transformed.coachName}, Students: ${transformed.students.length}`
    );
  }

  return transformed;
};

/**
 * ✅ Send WhatsApp to multiple recipients
 */
const sendMultipleMessages = async (recipients, message, label = 'Notifications') => {
  const results = {
    success: [],
    failed: []
  };

  for (const recipient of recipients) {
    try {
      if (recipient.phone) {
        await whatsappService.sendMessage(recipient.phone, message);
        results.success.push({
          name: recipient.name,
          phone: recipient.phone
        });
        console.log(`✅ ${label} sent to ${recipient.phone}`);
      }
    } catch (error) {
      results.failed.push({
        name: recipient.name,
        phone: recipient.phone,
        error: error.message
      });
      console.error(`❌ Failed to send to ${recipient.phone}:`, error.message);
    }
  }

  return results;
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
    console.log(
      '   Private:',
      transformed.filter(s => s.scheduleType === 'private').length
    );
    console.log(
      '   Group:',
      transformed.filter(s => s.scheduleType === 'group').length
    );

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

    console.log('✅ Schedule found - Type:', transformed.scheduleType);

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
 * ✅ Get schedules by coach (support both private & group)
 */
exports.getSchedulesByCoach = async (req, res) => {
  try {
    console.log('📋 GET /schedules/coach/:coachId');
    console.log('   Coach ID:', req.params.coachId);

    const coachId = req.params.coachId;

    // ✅ Query BOTH private schedules dan group schedules
    const schedules = await Schedule.find({
      $or: [
        { coachId: coachId, scheduleType: 'private' },
        { 'coaches._id': coachId, scheduleType: 'group' }
      ]
    })
      .sort({ date: 1, startTime: 1 })
      .populate('studentId', '_id fullName phone')
      .populate('coachId', '_id fullName phone')
      .lean();

    const transformed = schedules.map(transformSchedule);

    console.log(`✅ Found ${transformed.length} schedules`);
    console.log(
      '   Private:',
      transformed.filter(s => s.scheduleType === 'private').length
    );
    console.log(
      '   Group:',
      transformed.filter(s => s.scheduleType === 'group').length
    );

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
 * ✅ Get schedules by student (support both private & group)
 */
exports.getSchedulesByStudent = async (req, res) => {
  try {
    console.log('📋 GET /schedules/student/:studentId');
    console.log('   Student ID:', req.params.studentId);

    const studentId = req.params.studentId;

    // ✅ Query BOTH private schedules dan group schedules
    const schedules = await Schedule.find({
      $or: [
        { studentId: studentId, scheduleType: 'private' },
        { 'students._id': studentId, scheduleType: 'group' }
      ]
    })
      .sort({ date: 1, startTime: 1 })
      .populate('coachId', '_id fullName phone')
      .populate('studentId', '_id fullName phone')
      .lean();

    const transformed = schedules.map(transformSchedule);

    console.log(`✅ Found ${transformed.length} schedules`);
    console.log(
      '   Private:',
      transformed.filter(s => s.scheduleType === 'private').length
    );
    console.log(
      '   Group:',
      transformed.filter(s => s.scheduleType === 'group').length
    );

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
 * ✅ Create schedule (support private & group)
 */
exports.createSchedule = async (req, res) => {
  try {
    console.log('📝 POST /schedules');
    console.log('   Data:', req.body);

    const normalizedDate = normalizeDate(req.body.date);

    if (!normalizedDate) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    const scheduleType = req.body.scheduleType || 'private';

    if (!['private', 'group' ,'semiPrivate'].includes(scheduleType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid schedule type. Must be private or group'
      });
    }

    const scheduleData = {
      ...req.body,
      date: normalizedDate,
      scheduleType
    };

    const conflictData = {
      date: normalizedDate,
      startTime: scheduleData.startTime,
      endTime: scheduleData.endTime,
      scheduleType
    };

    if (scheduleType === 'private') {
      conflictData.coachId = scheduleData.coachId;
      conflictData.studentId = scheduleData.studentId;
    } else {
      conflictData.coaches = scheduleData.coachIds;
      conflictData.students = scheduleData.studentIds;
    }

    const conflicts = await Schedule.checkConflicts(conflictData);

    if (conflicts.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Schedule conflict detected',
        conflicts
      });
    }

    const schedule = new Schedule(scheduleData);
    await schedule.save();

    await schedule.populate('studentId', '_id fullName phone');
    await schedule.populate('coachId', '_id fullName phone');

    const transformed = transformSchedule(schedule);

    console.log('✅ Schedule created:', schedule._id);
    console.log('   Type:', transformed.scheduleType);

    // ✅ Send WhatsApp confirmation
    if (schedule.reminderEnabled && whatsappService.isReady()) {
      try {
        let recipients = [];

        if (schedule.scheduleType === 'private') {
          const coachPhone = schedule.coachId?.phone || schedule.coachPhone;
          const coachName = schedule.coachId?.fullName || schedule.coachName;

          if (coachPhone) {
            recipients.push({
              name: coachName,
              phone: coachPhone,
              type: 'coach'

            });
          }
        } else {
          // ✅ GROUP: Send ke semua coaches
          recipients = [
            ...schedule.coaches.map(c => ({
              name: c.fullName,
              phone: c.phone,
              type: 'coach'
              
            }))
          ];
        }

        const scheduleObj = schedule.toObject();
        const message = formatConfirmationMessage(scheduleObj);

        if (recipients.length > 0) {
          const results = await sendMultipleMessages(
            recipients,
            message,
            'Confirmation'
          );
          console.log(`📱 WhatsApp results:`, results);
        }
      } catch (waError) {
        console.error('⚠️ WhatsApp error:', waError.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Jadwal berhasil dibuat',
      data: transformed
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(400).json({
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

    const transformed = transformSchedule(schedule);

    console.log('✅ Schedule updated - Type:', transformed.scheduleType);

    res.json({
      success: true,
      message: 'Jadwal berhasil diupdate',
      data: transformed
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(400).json({
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

    const updateData = { status, updatedAt: Date.now() };

    if (['completed', 'cancelled'].includes(status)) {
      updateData.archivedAt = new Date();
      updateData.archivedReason = status;
    }

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

    const transformed = transformSchedule(schedule);

    console.log('✅ Status updated');

    res.json({
      success: true,
      message: 'Status berhasil diupdate',
      data: transformed
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(400).json({
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
    res.status(400).json({
      success: false,
      message: 'Gagal toggle reminder',
      error: error.message
    });
  }
};

/**
 * ✅ Send WhatsApp reminder manually (support both private & group)
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

    let recipients = [];
    let message = '';

    if (schedule.scheduleType === 'private') {
      const coachPhone = schedule.coachId?.phone || schedule.coachPhone;
      const coachName = schedule.coachId?.fullName || schedule.coachName;

      if (!coachPhone) {
        return res.status(400).json({
          success: false,
          message: 'Nomor HP coach tidak tersedia'
        });
      }

      recipients = [
        {
          name: coachName,
          phone: coachPhone,
          type: 'coach'
        }
      ];

      message = formatPrivateReminderMessage(schedule.toObject());
    } else {
      // ✅ GROUP: Send ke semua coaches
      recipients = schedule.coaches.map(c => ({
        name: c.fullName,
        phone: c.phone,
        type: 'coach'
      }));

      if (recipients.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Tidak ada coach yang tersedia'
        });
      }

      message = formatGroupReminderMessage(schedule.toObject());
    }

    // ✅ Send messages
    const results = await sendMultipleMessages(recipients, message, 'Reminders');

    // ✅ Update reminder tracking
    schedule.reminderSent = true;
    schedule.reminderSentAt = new Date();
    schedule.reminderAttempts = (schedule.reminderAttempts || 0) + 1;
    schedule.reminderLastAttempt = new Date();
    await schedule.save();

    console.log(`✅ Reminders sent to ${results.success.length} recipients`);

    res.json({
      success: true,
      message: `Pengingat WhatsApp berhasil dikirim ke ${results.success.length} penerima!`,
      data: {
        sent: results.success,
        failed: results.failed,
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
 * ✅ Check schedule conflicts (support both private & group)
 */
exports.checkConflicts = async (req, res) => {
  try {
    const {
      date,
      startTime,
      endTime,
      scheduleType,
      coachId,
      coachIds,
      studentId,
      studentIds,
      scheduleId
    } = req.body;

    console.log('⚠️ POST /schedules/check-conflicts');
    console.log('   Type:', scheduleType, 'Date:', date);

    if (!date || !startTime || !endTime || !scheduleType) {
      return res.status(400).json({
        success: false,
        message: 'date, startTime, endTime, dan scheduleType are required'
      });
    }

    const queryDate = normalizeDate(date);

    if (!queryDate) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    const conflictData = {
      date: queryDate,
      startTime,
      endTime,
      scheduleType,
      excludeId: scheduleId
    };

    if (scheduleType === 'private') {
      if (!coachId || !studentId) {
        return res.status(400).json({
          success: false,
          message: 'coachId dan studentId required untuk private schedule'
        });
      }
      conflictData.coachId = coachId;
      conflictData.studentId = studentId;
    } else {
      if (
        !coachIds ||
        !studentIds ||
        coachIds.length === 0 ||
        studentIds.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: 'coachIds dan studentIds diperlukan untuk group schedule'
        });
      }
      conflictData.coaches = coachIds;
      conflictData.students = studentIds;
    }

    const conflicts = await Schedule.checkConflicts(conflictData);

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

/**
 * ✅ Get archive statistics
 */
exports.getArchiveStats = async (req, res) => {
  try {
    console.log('📊 GET /schedules/stats/archive');

    const stats = await Schedule.getArchiveStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil statistik archive',
      error: error.message
    });
  }
};

/**
 * ✅ Get schedules statistics
 */
exports.getStatistics = async (req, res) => {
  try {
    console.log('📊 GET /schedules/stats');

    const byStatus = await Schedule.getStatsByStatus();
    const byType = await Schedule.getStatsByType();
    const archiveStats = await Schedule.getArchiveStats();

    res.json({
      success: true,
      data: {
        byStatus,
        byType,
        archive: archiveStats
      }
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil statistik',
      error: error.message
    });
  }
};
