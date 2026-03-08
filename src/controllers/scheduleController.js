// backend/src/controllers/scheduleController.js

const Schedule = require('../models/Schedule');
const whatsappService = require('../services/whatsappService');
const recapService = require('../services/recapService');

// ==================== DATE HELPERS ====================

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

const formatDateForMessage = (date) => {
  try {
    const d = new Date(date);
    return d.toLocaleDateString('id-ID', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  } catch (error) {
    console.warn('Error formatting date:', error);
    return date?.toString() || 'N/A';
  }
};

const getDateRange = (startDate, endDate) => {
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  if (!start || !end) throw new Error('Invalid date range');
  if (start > end) return { $gte: end, $lte: start };
  return { $gte: start, $lte: end };
};

// ==================== SHORT NAME HELPER ====================

/**
 * ✅ Resolve shortName konsisten di seluruh controller
 */
const resolveShortName = (shortName, fullName) => {
  if (shortName && shortName.trim()) return shortName.trim();
  if (fullName && fullName.trim()) return fullName.trim().split(' ')[0];
  return '-';
};

// ==================== MESSAGE FORMATTERS ====================

const formatPrivateReminderMessage = (schedule) => {
  const formattedDate = formatDateForMessage(schedule.date);
  const coachName =
    schedule.coachId?.fullName ||
    schedule.coachName ||
    schedule.coaches?.[0]?.fullName ||
    'Coach';
  const studentName =
    schedule.studentId?.fullName ||
    schedule.studentName ||
    schedule.students?.[0]?.fullName ||
    'Siswa';

  return `👨‍🏫 *Pengingat Jadwal Mengajar - Lafi Swimming Academy*

Halo Coach ${coachName}! 👋

Pengingat jadwal mengajar Anda:

📅 *Tanggal:* ${formattedDate}
⏰ *Waktu:* ${schedule.startTime} - ${schedule.endTime}
👨‍🎓 *Siswa:* ${studentName}
🏊 *Program:* ${schedule.program || 'Private Training'}
${schedule.programCategory ? `📂 *Kategori:* ${schedule.programCategory}\n` : ''}📍 *Lokasi:* ${schedule.location || 'Kolam Utama'}
⏱️ *Durasi:* ${schedule.duration || 60} menit
📝 *Tipe:* Private (1-on-1)

Mohon persiapkan materi dan peralatan yang diperlukan.

Terima kasih! 💪
*Lafi Swimming Academy*
📱 WA: 0821-4004-4677`;
};

const formatSemiPrivateReminderMessage = (schedule) => {
  const formattedDate = formatDateForMessage(schedule.date);
  const coachName =
    schedule.coachId?.fullName ||
    schedule.coachName ||
    schedule.coaches?.[0]?.fullName ||
    'Coach';
  const studentList = (schedule.students || [])
    .map(s => `• ${s.fullName || 'Siswa'}`)
    .join('\n') || '• (Siswa tidak tersedia)';
  const studentCount = schedule.students?.length || 0;

  return `👨‍🏫 *Pengingat Semi-Private Class - Lafi Swimming Academy*

Halo Coach ${coachName}! 👋

Pengingat semi-private class Anda:

📝 *Group:* ${schedule.groupName || 'Semi-Private'}
📅 *Tanggal:* ${formattedDate}
⏰ *Waktu:* ${schedule.startTime} - ${schedule.endTime}
👨‍🎓 *Siswa (${studentCount}):*
${studentList}
🏊 *Program:* ${schedule.program || 'Semi Private Training'}
${schedule.programCategory ? `📂 *Kategori:* ${schedule.programCategory}\n` : ''}📍 *Lokasi:* ${schedule.location || 'Kolam Utama'}
⏱️ *Durasi:* ${schedule.duration || 60} menit
📝 *Tipe:* Semi-Private (1:${studentCount})

Mohon persiapkan materi dan peralatan yang diperlukan.

Terima kasih! 💪
*Lafi Swimming Academy*
📱 WA: 0821-4004-4677`;
};

const formatGroupReminderMessage = (schedule) => {
  const formattedDate = formatDateForMessage(schedule.date);
  const studentList = (schedule.students || [])
    .map(s => `• ${s.fullName || 'Siswa'}`)
    .join('\n') || '• (Siswa tidak tersedia)';
  const studentCount = schedule.students?.length || 0;
  const coachList = (schedule.coaches || [])
    .map(c => c.fullName || 'Coach')
    .join(', ') || 'Coach';

  return `👨‍🏫 *Pengingat Group Class - Lafi Swimming Academy*

Halo Coach! 👋

Pengingat group class Anda:

📝 *Group:* ${schedule.groupName || 'Group'}
📅 *Tanggal:* ${formattedDate}
⏰ *Waktu:* ${schedule.startTime} - ${schedule.endTime}
👨‍🏫 *Pelatih:* ${coachList}
👨‍🎓 *Siswa (${studentCount}):*
${studentList}
🏊 *Program:* ${schedule.program || 'Group Training'}
${schedule.programCategory ? `📂 *Kategori:* ${schedule.programCategory}\n` : ''}📍 *Lokasi:* ${schedule.location || 'Kolam Utama'}
⏱️ *Durasi:* ${schedule.duration || 60} menit
📝 *Tipe:* Group Class

Mohon persiapkan materi dan peralatan yang diperlukan.

Terima kasih! 💪
*Lafi Swimming Academy*
📱 WA: 0821-4004-4677`;
};

// ==================== TRANSFORM HELPER ====================

/**
 * ✅ Transform schedule response — shortName included di semua tipe
 */
const transformSchedule = (schedule) => {
  const transformed = { ...schedule };

  if (schedule.scheduleType === 'private') {
    transformed.studentId = schedule.studentId?._id?.toString() || schedule.studentId;
    transformed.coachId = schedule.coachId?._id?.toString() || schedule.coachId;
    transformed.studentName = schedule.studentId?.fullName || schedule.studentName;
    transformed.coachName = schedule.coachId?.fullName || schedule.coachName;
    // ✅ shortName untuk private student
    transformed.shortName = resolveShortName(
      schedule.studentId?.shortName,
      schedule.studentId?.fullName || schedule.studentName
    );
  } else {
    // ✅ semiPrivate & group — shortName di tiap student
    transformed.coaches = (schedule.coaches || [])
      .filter(c => c._id)
      .map(c => ({
        _id: c._id.toString(),
        fullName: c.fullName,
        phone: c.phone
      }));

    transformed.students = (schedule.students || [])
      .filter(s => s._id)
      .map(s => ({
        _id: s._id.toString(),
        fullName: s.fullName,
        shortName: resolveShortName(s.shortName, s.fullName),  // ✅
        phone: s.phone
      }));
  }

  return transformed;
};

// ==================== SEND HELPER ====================

const sendMultipleMessages = async (recipients, message, label = 'Notifications') => {
  const results = { success: [], failed: [] };

  for (const recipient of recipients) {
    try {
      if (recipient.phone) {
        await whatsappService.sendMessage(
          recipient.phone,
          message,
          'reminder',
          null,
          { recipientName: recipient.name, recipientType: recipient.type }
        );
        results.success.push({ name: recipient.name, phone: recipient.phone });
        console.log(`✅ ${label} sent to ${recipient.name} (${recipient.phone})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      results.failed.push({ name: recipient.name, phone: recipient.phone, error: error.message });
      console.error(`❌ Failed to send to ${recipient.name}:`, error.message);
    }
  }

  return results;
};

// ==================== CRUD OPERATIONS ====================

/**
 * GET /schedules
 */
exports.getSchedules = async (req, res) => {
  try {
    console.log('📋 GET /schedules');

    const schedules = await Schedule.find()
      .populate('studentId', '_id fullName shortName')   // ✅
      .populate('coachId', '_id fullName phone')
      .populate('students', '_id fullName shortName')    // ✅
      .populate('coaches', '_id fullName phone')
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
 * GET /schedules/range
 */
exports.getSchedulesByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    console.log('📋 GET /schedules/range');

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const dateRange = getDateRange(startDate, endDate);

    const schedules = await Schedule.find({ date: dateRange })
      .sort({ date: 1, startTime: 1 })
      .populate('studentId', '_id fullName shortName')   // ✅
      .populate('coachId', '_id fullName phone')
      .populate('students', '_id fullName shortName')    // ✅
      .populate('coaches', '_id fullName phone')
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
 * GET /schedules/:id
 */
exports.getScheduleById = async (req, res) => {
  try {
    console.log('📋 GET /schedules/:id');

    const schedule = await Schedule.findById(req.params.id)
      .populate('studentId', '_id fullName shortName')   // ✅
      .populate('coachId', '_id fullName phone')
      .populate('students', '_id fullName shortName')    // ✅
      .populate('coaches', '_id fullName phone')
      .lean();

    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    const transformed = transformSchedule(schedule);

    res.json({ success: true, data: transformed });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * GET /schedules/coach/:coachId
 */
exports.getSchedulesByCoach = async (req, res) => {
  try {
    console.log('📋 GET /schedules/coach/:coachId');

    const schedules = await Schedule.find({
      $or: [
        { coachId: req.params.coachId, scheduleType: 'private' },
        { coachId: req.params.coachId, scheduleType: 'semiPrivate' },
        { 'coaches._id': req.params.coachId, scheduleType: 'group' }
      ]
    })
      .sort({ date: 1, startTime: 1 })
      .populate('studentId', '_id fullName shortName')   // ✅
      .populate('coachId', '_id fullName phone')
      .populate('students', '_id fullName shortName')    // ✅
      .populate('coaches', '_id fullName phone')
      .lean();

    const transformed = schedules.map(transformSchedule);

    console.log(`✅ Found ${transformed.length} schedules`);

    res.json({ success: true, count: transformed.length, data: transformed });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * GET /schedules/student/:studentId
 */
exports.getSchedulesByStudent = async (req, res) => {
  try {
    console.log('📋 GET /schedules/student/:studentId');

    const schedules = await Schedule.find({
      $or: [
        { studentId: req.params.studentId, scheduleType: 'private' },
        { 'students._id': req.params.studentId, scheduleType: 'semiPrivate' },
        { 'students._id': req.params.studentId, scheduleType: 'group' }
      ]
    })
      .sort({ date: 1, startTime: 1 })
      .populate('coachId', '_id fullName phone')
      .populate('studentId', '_id fullName shortName')   // ✅
      .populate('students', '_id fullName shortName')    // ✅
      .populate('coaches', '_id fullName phone')
      .lean();

    const transformed = schedules.map(transformSchedule);

    console.log(`✅ Found ${transformed.length} schedules`);

    res.json({ success: true, count: transformed.length, data: transformed });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * POST /schedules
 */
exports.createSchedule = async (req, res) => {
  try {
    console.log('📝 POST /schedules');
    console.log('   Data:', req.body);

    const normalizedDate = normalizeDate(req.body.date);
    if (!normalizedDate) {
      return res.status(400).json({ success: false, message: 'Invalid date format' });
    }

    const scheduleType = req.body.scheduleType || 'private';
    if (!['private', 'semiPrivate', 'group'].includes(scheduleType)) {
      return res.status(400).json({ success: false, message: 'Invalid schedule type' });
    }

    const scheduleData = { ...req.body, date: normalizedDate, scheduleType };

    const conflictData = {
      date: normalizedDate,
      startTime: scheduleData.startTime,
      endTime: scheduleData.endTime,
      scheduleType
    };

    if (scheduleType === 'private') {
      conflictData.coachId = scheduleData.coachId;
      conflictData.studentId = scheduleData.studentId;
    } else if (scheduleType === 'semiPrivate') {
      conflictData.coachId = scheduleData.coachId;
      conflictData.students = scheduleData.studentIds || scheduleData.students;
    } else if (scheduleType === 'group') {
      conflictData.coaches = scheduleData.coachIds || scheduleData.coaches;
      conflictData.students = scheduleData.studentIds || scheduleData.students;
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

    // ✅ Populate after save — shortName included
    if (scheduleType === 'private') {
      await schedule.populate('studentId', '_id fullName shortName');  // ✅
      await schedule.populate('coachId', '_id fullName phone');
    } else if (scheduleType === 'semiPrivate') {
      await schedule.populate('coachId', '_id fullName phone');
      await schedule.populate('students', '_id fullName shortName');   // ✅
    } else if (scheduleType === 'group') {
      await schedule.populate('coaches', '_id fullName phone');
      await schedule.populate('students', '_id fullName shortName');   // ✅
    }

    console.log('✅ Schedule created and populated');

    const transformed = transformSchedule(schedule.toObject());

    // Send WhatsApp notification
    if (schedule.reminderEnabled && whatsappService.isReady()) {
      try {
        const fullSchedule = await Schedule.findById(schedule._id)
          .populate('studentId', '_id fullName shortName')   // ✅
          .populate('coachId', '_id fullName phone')
          .populate('students', '_id fullName shortName')    // ✅
          .populate('coaches', '_id fullName phone')
          .lean();

        let recipients = [];
        let message = '';

        if (fullSchedule.scheduleType === 'private') {
          const coachPhone =
            fullSchedule.coachId?.phone ||
            fullSchedule.coachPhone ||
            fullSchedule.coaches?.[0]?.phone;
          const coachName =
            fullSchedule.coachId?.fullName ||
            fullSchedule.coachName ||
            fullSchedule.coaches?.[0]?.fullName ||
            'Coach';
          if (coachPhone) {
            recipients = [{ name: coachName, phone: coachPhone, type: 'coach' }];
          }
          message = formatPrivateReminderMessage(fullSchedule);
        } else if (fullSchedule.scheduleType === 'semiPrivate') {
          const coachPhone =
            fullSchedule.coachId?.phone ||
            fullSchedule.coachPhone ||
            fullSchedule.coaches?.[0]?.phone;
          const coachName =
            fullSchedule.coachId?.fullName ||
            fullSchedule.coachName ||
            fullSchedule.coaches?.[0]?.fullName ||
            'Coach';
          if (coachPhone) {
            recipients = [{ name: coachName, phone: coachPhone, type: 'coach' }];
          }
          message = formatSemiPrivateReminderMessage(fullSchedule);
        } else if (fullSchedule.scheduleType === 'group') {
          recipients = (fullSchedule.coaches || [])
            .filter(c => c.phone)
            .map(c => ({ name: c.fullName || 'Coach', phone: c.phone, type: 'coach' }));
          message = formatGroupReminderMessage(fullSchedule);
        }

        if (recipients.length > 0) {
          const results = await sendMultipleMessages(recipients, message, 'Confirmation');
          console.log(`📱 WhatsApp sent to ${results.success.length}/${recipients.length} coaches`);
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
    console.error('❌ Error creating schedule:', error);
    res.status(400).json({
      success: false,
      message: 'Gagal membuat jadwal',
      error: error.message
    });
  }
};

/**
 * PUT /schedules/:id
 */
exports.updateSchedule = async (req, res) => {
  try {
    console.log('🔄 PUT /schedules/:id');

    let updateData = { ...req.body };

    if (updateData.date) {
      const normalized = normalizeDate(updateData.date);
      if (!normalized) {
        return res.status(400).json({ success: false, message: 'Invalid date format' });
      }
      updateData.date = normalized;
    }

    updateData.updatedAt = Date.now();

    const schedule = await Schedule.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('studentId', '_id fullName shortName')   // ✅
      .populate('coachId', '_id fullName phone')
      .populate('students', '_id fullName shortName')    // ✅
      .populate('coaches', '_id fullName phone');

    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    const transformed = transformSchedule(schedule.toObject());

    res.json({ success: true, message: 'Jadwal berhasil diupdate', data: transformed });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(400).json({ success: false, message: 'Gagal update jadwal', error: error.message });
  }
};

/**
 * POST /schedules/trigger-recap
 */
exports.triggerManualRecap = async (req, res) => {
  const { type } = req.body;

  if (!type || !['daily', 'weekly'].includes(type)) {
    return res.status(400).json({
      success: false,
      message: 'Tipe rekap tidak valid. Gunakan "daily" atau "weekly".'
    });
  }

  console.log(`🔌 Manual Trigger received: ${type} recap`);

  try {
    const result = await recapService.sendRecap(type);

    return res.status(200).json({
      success: true,
      message: `Berhasil mengirim rekap ${type}.`,
      details: { sentCount: result.sentCount, type: result.type }
    });
  } catch (error) {
    console.error('❌ Manual trigger error:', error);

    if (error.message && error.message.includes('Tidak ada jadwal')) {
      return res.status(404).json({ success: false, message: error.message });
    }

    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengirim rekap.',
      error: error.message
    });
  }
};

/**
 * DELETE /schedules/:id
 */
exports.deleteSchedule = async (req, res) => {
  try {
    console.log('🗑️ DELETE /schedules/:id');

    const schedule = await Schedule.findByIdAndDelete(req.params.id);

    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    res.json({ success: true, message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ success: false, message: 'Gagal menghapus jadwal', error: error.message });
  }
};

/**
 * PATCH /schedules/:id/status
 */
exports.updateScheduleStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
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
      .populate('studentId', '_id fullName shortName')   // ✅
      .populate('coachId', '_id fullName phone')
      .populate('students', '_id fullName shortName')    // ✅
      .populate('coaches', '_id fullName phone');

    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    const transformed = transformSchedule(schedule.toObject());

    res.json({ success: true, message: 'Status berhasil diupdate', data: transformed });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(400).json({ success: false, message: 'Gagal update status', error: error.message });
  }
};

/**
 * PATCH /schedules/:id/reminder
 */
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
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    res.json({
      success: true,
      message: `Reminder ${reminderEnabled ? 'enabled' : 'disabled'}`,
      data: schedule
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(400).json({ success: false, message: 'Gagal toggle reminder', error: error.message });
  }
};

/**
 * POST /schedules/check-conflicts
 */
exports.checkConflicts = async (req, res) => {
  try {
    const {
      date, startTime, endTime, scheduleType,
      coachId, coachIds, studentId, studentIds, scheduleId
    } = req.body;

    if (!date || !startTime || !endTime || !scheduleType) {
      return res.status(400).json({
        success: false,
        message: 'date, startTime, endTime, dan scheduleType are required'
      });
    }

    const queryDate = normalizeDate(date);
    if (!queryDate) {
      return res.status(400).json({ success: false, message: 'Invalid date format' });
    }

    const conflictData = {
      date: queryDate, startTime, endTime, scheduleType, excludeId: scheduleId
    };

    if (scheduleType === 'private') {
      if (!coachId || !studentId) {
        return res.status(400).json({
          success: false,
          message: 'coachId dan studentId required'
        });
      }
      conflictData.coachId = coachId;
      conflictData.studentId = studentId;
    } else if (scheduleType === 'semiPrivate') {
      if (!coachId || !studentIds || studentIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'coachId dan studentIds required'
        });
      }
      conflictData.coachId = coachId;
      conflictData.students = studentIds;
    } else {
      if (!coachIds || !studentIds || coachIds.length === 0 || studentIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'coachIds dan studentIds required'
        });
      }
      conflictData.coaches = coachIds;
      conflictData.students = studentIds;
    }

    const conflicts = await Schedule.checkConflicts(conflictData);

    res.json({
      success: true,
      hasConflict: conflicts.length > 0,
      count: conflicts.length,
      conflicts
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * GET /schedules/archive-stats
 */
exports.getArchiveStats = async (req, res) => {
  try {
    const stats = await Schedule.getArchiveStats();
    res.json({ success: true, data: stats });
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
 * GET /schedules/statistics
 */
exports.getStatistics = async (req, res) => {
  try {
    const byStatus = await Schedule.getStatsByStatus();
    const byType = await Schedule.getStatsByType();
    const archiveStats = await Schedule.getArchiveStats();

    res.json({
      success: true,
      data: { byStatus, byType, archive: archiveStats }
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
