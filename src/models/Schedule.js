// backend/src/models/Schedule.js

const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  // ==================== SCHEDULE TYPE ====================
  scheduleType: {
    type: String,
    enum: ['semiPrivate', 'group', 'private'],
    default: 'private',
    required: [true, 'Schedule type is required'],
    index: true
  },

  // ==================== INDIVIDUAL SCHEDULE ====================
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    index: true,
    validate: {
      validator: function() {
        if (this.scheduleType === 'private') return !!this.studentId;
        return true;
      },
      message: 'Student ID is required for private schedule'
    }
  },

  studentName: {
    type: String,
    validate: {
      validator: function() {
        if (this.scheduleType === 'private') return !!this.studentName;
        return true;
      },
      message: 'Student name is required for private schedule'
    }
  },

  studentPhone: {
    type: String,
    validate: {
      validator: function() {
        if (this.scheduleType === 'private') return !!this.studentPhone;
        return true;
      },
      message: 'Student phone is required for private schedule'
    }
  },

  coachId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coach',
    index: true,
    validate: {
      validator: function() {
        if (this.scheduleType === 'private') return !!this.coachId;
        return true;
      },
      message: 'Coach ID is required for private schedule'
    }
  },

  coachName: {
    type: String,
    validate: {
      validator: function() {
        if (this.scheduleType === 'private') return !!this.coachName;
        return true;
      },
      message: 'Coach name is required for private schedule'
    }
  },

  coachPhone: {
    type: String,
    default: null
  },

  // ==================== GROUP CLASS ====================
  groupName: {
    type: String,
    default: null,
    validate: {
      validator: function() {
        if (this.scheduleType === 'group') return !!this.groupName;
        return true;
      },
      message: 'Group name is required for group schedule'
    }
  },

  coaches: [
    {
      _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Coach' },
      fullName: String,
      phone: String
    }
  ],

  students: [
    {
      _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
      fullName: String,
      phone: String
    }
  ],

  // ==================== PROGRAM ====================
  program: {
    type: String,
    required: [true, 'Program is required'],
    enum: ['Private Training', 'Semi Private Training', 'Group Class'],
    index: true
  },

  programCategory: {
    type: String,
    default: null
  },

  // ==================== SCHEDULE DETAILS ====================
  date: {
    type: Date,
    required: [true, 'Date is required'],
    index: true,
    set: function(value) {
      if (!value) return null;
      const d = new Date(value);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
    }
  },

  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)']
  },

  endTime: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)']
  },

  duration: {
    type: Number,
    required: true,
    default: 60,
    min: [15, 'Duration must be at least 15 minutes'],
    max: [300, 'Duration cannot exceed 5 hours']
  },

  location: {
    type: String,
    required: [true, 'Location is required'],
    default: 'Kolam Utama'
  },

  // ==================== STATUS ====================
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled', 'rescheduled', 'archived'],
    default: 'scheduled',
    index: true
  },

  notes: {
    type: String,
    default: null,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },

  // ==================== REMINDER ====================
  reminderEnabled: { type: Boolean, default: true, index: true },
  reminderSent: { type: Boolean, default: false },
  reminderSentAt: { type: Date, default: null },
  reminderBeforeHours: {
    type: Number, default: 24,
    min: [1, 'Reminder must be at least 1 hour before'],
    max: [168, 'Reminder cannot be more than 1 week before']
  },
  reminderAttempts: { type: Number, default: 0, min: 0 },
  reminderLastAttempt: { type: Date, default: null },

  // ==================== ARCHIVE TRACKING ====================
  archivedAt: {
    type: Date, default: null,
    index: { expireAfterSeconds: 259200, sparse: true, name: 'archivedAt_ttl' }
  },

  archivedReason: {
    type: String, default: null,
    enum: [null, 'completed', 'cancelled', 'manual', 'system']
  },

  // ==================== AUDIT ====================
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ==================== INDEXES ====================
scheduleSchema.index({ studentId: 1, date: -1 });
scheduleSchema.index({ coachId: 1, date: -1 });
scheduleSchema.index({ date: 1, status: 1 });
scheduleSchema.index({ status: 1 });
scheduleSchema.index({ scheduleType: 1 });
scheduleSchema.index({ status: 1, archivedAt: 1 }, { name: 'status_archived_index' });
scheduleSchema.index({ reminderEnabled: 1, reminderSent: 0, date: 1 }, { name: 'reminder_pending_index' });
scheduleSchema.index({ 'coaches._id': 1 });
scheduleSchema.index({ 'students._id': 1 });

// ==================== VIRTUALS ====================

scheduleSchema.virtual('displayName').get(function() {
  if (this.scheduleType === 'private') return this.studentName || 'Private Schedule';
  return this.groupName || 'Group Class';
});

scheduleSchema.virtual('participantsInfo').get(function() {
  if (this.scheduleType === 'private') {
    return {
      type: 'private',
      coach: { name: this.coachName, phone: this.coachPhone },
      student: { name: this.studentName, phone: this.studentPhone }
    };
  }
  return {
    type: 'group', coaches: this.coaches, students: this.students,
    coachCount: this.coaches?.length || 0, studentCount: this.students?.length || 0
  };
});

scheduleSchema.virtual('isUpcoming').get(function() {
  const now = new Date();
  const dt = new Date(this.date);
  const [h, m] = this.startTime.split(':');
  dt.setHours(parseInt(h), parseInt(m), 0);
  return dt > now && this.status === 'scheduled';
});

scheduleSchema.virtual('hoursUntil').get(function() {
  const now = new Date();
  const dt = new Date(this.date);
  const [h, m] = this.startTime.split(':');
  dt.setHours(parseInt(h), parseInt(m), 0);
  return Math.floor((dt - now) / (1000 * 60 * 60));
});

// ==================== METHODS ====================

scheduleSchema.methods.archive = async function(reason = 'manual') {
  this.status = 'archived';
  this.archivedAt = new Date();
  this.archivedReason = reason;
  return await this.save();
};

scheduleSchema.methods.restore = async function() {
  if (this.status !== 'archived') throw new Error('Can only restore archived schedules');
  this.status = 'scheduled';
  this.archivedAt = null;
  this.archivedReason = null;
  return await this.save();
};

scheduleSchema.methods.sendReminder = async function() {
  if (!this.reminderEnabled) throw new Error('Reminder is not enabled');

  const dt = new Date(this.date);
  const [h, m] = this.startTime.split(':');
  dt.setHours(parseInt(h), parseInt(m), 0);

  const reminderTime = new Date(dt.getTime() - this.reminderBeforeHours * 3600000);
  const now = new Date();
  if (now < reminderTime) throw new Error('Too early to send reminder');

  let recipients = [];
  if (this.scheduleType === 'private') {
    recipients = [
      { name: this.studentName, phone: this.studentPhone },
      { name: this.coachName, phone: this.coachPhone }
    ];
  } else {
    recipients = [
      ...this.coaches.map(c => ({ name: c.fullName, phone: c.phone })),
      ...this.students.map(s => ({ name: s.fullName, phone: s.phone }))
    ];
  }

  this.reminderSent = true;
  this.reminderSentAt = now;
  this.reminderAttempts = (this.reminderAttempts || 0) + 1;
  this.reminderLastAttempt = now;
  await this.save();
  return { success: true, sentTo: recipients.length, recipients };
};

scheduleSchema.methods.getAllParticipants = function() {
  if (this.scheduleType === 'private') {
    return [
      { id: this.coachId, name: this.coachName, phone: this.coachPhone, type: 'coach' },
      { id: this.studentId, name: this.studentName, phone: this.studentPhone, type: 'student' }
    ];
  }
  return [
    ...this.coaches.map(c => ({ id: c._id, name: c.fullName, phone: c.phone, type: 'coach' })),
    ...this.students.map(s => ({ id: s._id, name: s.fullName, phone: s.phone, type: 'student' }))
  ];
};

// ==================== STATICS ====================

scheduleSchema.statics.checkConflicts = async function(scheduleData) {
  const { date, startTime, endTime, scheduleType, coachId, coaches, studentId, excludeId } = scheduleData;
  const conflicts = [];
  const [sH, sM] = startTime.split(':').map(Number);
  const [eH, eM] = endTime.split(':').map(Number);
  const startMin = sH * 60 + sM;
  const endMin = eH * 60 + eM;

  const qDate = new Date(date); qDate.setHours(0, 0, 0, 0);
  const query = { date: qDate, status: 'scheduled' };
  if (excludeId) query._id = { $ne: excludeId };

  const existing = await this.find(query);
  for (const ex of existing) {
    const [exSH, exSM] = ex.startTime.split(':').map(Number);
    const [exEH, exEM] = ex.endTime.split(':').map(Number);
    const exStart = exSH * 60 + exSM;
    const exEnd = exEH * 60 + exEM;
    if (!(startMin < exEnd && endMin > exStart)) continue;

    if (scheduleType === 'private' && ex.scheduleType === 'private') {
      if (ex.coachId?.toString() === coachId?.toString())
        conflicts.push({ existingSchedule: ex._id, conflictType: 'coach', details: `Coach conflict: ${ex.coachName}` });
      if (ex.studentId?.toString() === studentId?.toString())
        conflicts.push({ existingSchedule: ex._id, conflictType: 'student', details: `Student conflict: ${ex.studentName}` });
    } else if (scheduleType === 'private' && (ex.scheduleType === 'group' || ex.scheduleType === 'semiPrivate')) {
      if (ex.coaches.some(c => c._id?.toString() === coachId?.toString()))
        conflicts.push({ existingSchedule: ex._id, conflictType: 'coach', details: 'Coach conflict with group class' });
      if (ex.students.some(s => s._id?.toString() === studentId?.toString()))
        conflicts.push({ existingSchedule: ex._id, conflictType: 'student', details: 'Student conflict with group class' });
    } else if ((scheduleType === 'group' || scheduleType === 'semiPrivate') && ex.scheduleType === 'private') {
      if (coaches && coaches.some(c => c.toString() === ex.coachId?.toString()))
        conflicts.push({ existingSchedule: ex._id, conflictType: 'coach', details: 'Coach conflict with private schedule' });
    } else if ((scheduleType === 'group' || scheduleType === 'semiPrivate') && (ex.scheduleType === 'group' || ex.scheduleType === 'semiPrivate')) {
      if (coaches && coaches.some(c => ex.coaches.some(ec => ec._id?.toString() === c.toString())))
        conflicts.push({ existingSchedule: ex._id, conflictType: 'coach', details: 'Coach conflict with group class' });
    }
  }
  return conflicts;
};

scheduleSchema.statics.getPendingReminders = async function(hoursBuffer = 24) {
  const now = new Date();
  const future = new Date(now.getTime() + hoursBuffer * 3600000);
  return await this.find({
    reminderEnabled: true, reminderSent: false, status: 'scheduled',
    date: { $gte: now, $lte: future }
  }).sort({ date: 1, startTime: 1 });
};

scheduleSchema.statics.getByCoach = async function(coachId, startDate, endDate) {
  return await this.find({
    $or: [
      { coachId, scheduleType: 'private' },
      { 'coaches._id': coachId, scheduleType: { $in: ['group', 'semiPrivate'] } }
    ],
    date: { $gte: new Date(startDate), $lte: new Date(endDate) }
  });
};

scheduleSchema.statics.getByStudent = async function(studentId, startDate, endDate) {
  return await this.find({
    $or: [
      { studentId, scheduleType: 'private' },
      { 'students._id': studentId, scheduleType: { $in: ['group', 'semiPrivate'] } }
    ],
    date: { $gte: new Date(startDate), $lte: new Date(endDate) }
  });
};

scheduleSchema.statics.getGroupSchedules = async function(startDate, endDate) {
  return await this.find({
    scheduleType: { $in: ['group', 'semiPrivate'] },
    date: { $gte: new Date(startDate), $lte: new Date(endDate) }
  });
};

scheduleSchema.statics.getIndividualSchedules = async function(startDate, endDate) {
  return await this.find({
    scheduleType: 'private',
    date: { $gte: new Date(startDate), $lte: new Date(endDate) }
  });
};

scheduleSchema.statics.getOldArchivedSchedules = async function(days = 3) {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
  return await this.find({ status: 'archived', archivedAt: { $exists: true, $lt: cutoff } }).lean();
};

scheduleSchema.statics.deleteOldArchivedSchedules = async function(days = 3) {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
  const result = await this.deleteMany({ status: 'archived', archivedAt: { $exists: true, $lt: cutoff } });
  console.log(`✅ Deleted ${result.deletedCount} old archived schedules`);
  return result;
};

scheduleSchema.statics.getArchiveStats = async function() {
  const total = await this.countDocuments({ status: 'archived' });
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 3);
  const willDelete = await this.countDocuments({ status: 'archived', archivedAt: { $exists: true, $lt: cutoff } });
  const groupCount = await this.countDocuments({ scheduleType: { $in: ['group', 'semiPrivate'] } });
  const privateCount = await this.countDocuments({ scheduleType: 'private' });
  return {
    totalArchived: total, willDeleteIn3Days: willDelete,
    percentage: total > 0 ? Math.round((willDelete / total) * 100) : 0,
    breakdown: { totalSchedules: total + groupCount + privateCount, group: groupCount, private: privateCount, archived: total }
  };
};

scheduleSchema.statics.getStatsByStatus = async function() {
  return await this.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
};

scheduleSchema.statics.getStatsByType = async function() {
  return await this.aggregate([
    { $group: { _id: '$scheduleType', count: { $sum: 1 }, totalDuration: { $sum: '$duration' } } }
  ]);
};

// ============================================================
// ADMIN RECAP: getAdminRecapByRange
// Output flat per jadwal: { date, startTime, studentNames[], coachNames[] }
// TIDAK di-unwind per coach, tapi per SCHEDULE (1 row = 1 jadwal)
// Nama siswa selalu tampil (bukan groupName)
// ============================================================
scheduleSchema.statics.getAdminRecapByRange = async function(startDate, endDate) {
  const start = new Date(startDate); start.setHours(0, 0, 0, 0);
  const end = new Date(endDate); end.setHours(23, 59, 59, 999);

  // Pakai find + lean supaya bisa post-process dengan JavaScript
  // Ini lebih reliable daripada aggregation yang rentan null
  const schedules = await this.find({
    date: { $gte: start, $lte: end },
    status: 'scheduled'
  }).sort({ date: 1, startTime: 1 }).lean();

  return schedules.map(sch => {
    let studentNames = [];
    let coachNames = [];

    if (sch.scheduleType === 'private') {
      studentNames = [sch.studentName || '-'];
      coachNames = [sch.coachName || '-'];
    } else {
      // group atau semiPrivate: ambil nama dari array students[] dan coaches[]
      studentNames = (sch.students || [])
        .map(s => s.fullName || null)
        .filter(Boolean);
      coachNames = (sch.coaches || [])
        .map(c => c.fullName || null)
        .filter(Boolean);

      // Fallback jika array kosong
      if (studentNames.length === 0) studentNames = [sch.groupName || '-'];
      if (coachNames.length === 0) coachNames = [sch.coachName || '-'];
    }

    return {
      date: sch.date,
      startTime: sch.startTime || '??:??',
      studentNames,
      coachNames,
      groupName: null // Tidak pakai groupName di output admin
    };
  });
};

// ============================================================
// COACH WEEKLY RECAP: getCoachWeeklyRecap
// Output per coach → per hari → list jadwal
// Nama siswa selalu ditampilkan (bukan groupName)
// ============================================================
scheduleSchema.statics.getCoachWeeklyRecap = async function(startDate, endDate) {
  const start = new Date(startDate); start.setHours(0, 0, 0, 0);
  const end = new Date(endDate); end.setHours(23, 59, 59, 999);

  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  const schedules = await this.find({
    date: { $gte: start, $lte: end },
    status: 'scheduled'
  }).sort({ date: 1, startTime: 1 }).lean();

  // Step 1: Flatten → setiap coach dapat entry sendiri
  const coachEntries = []; // { coachId, coachName, coachPhone, date, startTime, endTime, studentLabel, category }

  for (const sch of schedules) {
    if (sch.scheduleType === 'private') {
      coachEntries.push({
        coachId: sch.coachId?.toString() || 'unknown',
        coachName: sch.coachName || '-',
        coachPhone: sch.coachPhone || null,
        date: sch.date,
        startTime: sch.startTime || '??:??',
        endTime: sch.endTime || '??:??',
        studentLabel: sch.studentName || '-',
        category: sch.programCategory || 'Private'
      });
    } else {
      // group / semiPrivate
      const studentLabel = (sch.students || [])
        .map(s => s.fullName || null)
        .filter(Boolean)
        .join(', ') || sch.groupName || '-';

      const category = sch.programCategory || 
        (sch.scheduleType === 'semiPrivate' ? 'Semi Private' : 'Group Class');

      // Setiap coach dalam group mendapat jadwal ini
      const coachList = sch.coaches || [];
      if (coachList.length === 0) {
        // Fallback: pakai coachName dari root jika coaches[] kosong
        coachEntries.push({
          coachId: sch.coachId?.toString() || 'unknown',
          coachName: sch.coachName || '-',
          coachPhone: sch.coachPhone || null,
          date: sch.date,
          startTime: sch.startTime || '??:??',
          endTime: sch.endTime || '??:??',
          studentLabel,
          category
        });
      } else {
        for (const coach of coachList) {
          coachEntries.push({
            coachId: coach._id?.toString() || 'unknown',
            coachName: coach.fullName || '-',
            coachPhone: coach.phone || null,
            date: sch.date,
            startTime: sch.startTime || '??:??',
            endTime: sch.endTime || '??:??',
            studentLabel,
            category
          });
        }
      }
    }
  }

  // Step 2: Group by coachId
  const coachMap = {};
  for (const entry of coachEntries) {
    if (!coachMap[entry.coachId]) {
      coachMap[entry.coachId] = {
        coachName: entry.coachName,
        coachPhone: entry.coachPhone,
        dayMap: {} // dateStr → schedules[]
      };
    }

    // Update phone jika ditemukan (mungkin null di entry lain tapi ada di entry ini)
    if (entry.coachPhone && !coachMap[entry.coachId].coachPhone) {
      coachMap[entry.coachId].coachPhone = entry.coachPhone;
    }

    const dateStr = new Date(entry.date).toISOString().split('T')[0];
    if (!coachMap[entry.coachId].dayMap[dateStr]) {
      coachMap[entry.coachId].dayMap[dateStr] = [];
    }

    coachMap[entry.coachId].dayMap[dateStr].push({
      time: `${entry.startTime} - ${entry.endTime}`,
      student: entry.studentLabel,
      category: entry.category,
      startTime: entry.startTime
    });
  }

  // Step 3: Convert to output format
  const result = Object.values(coachMap).map(coach => {
    const schedulesByDay = Object.keys(coach.dayMap)
      .sort()
      .map(dateStr => {
        const d = new Date(dateStr + 'T00:00:00');
        return {
          dayName: dayNames[d.getDay()],
          dateStr,
          schedules: coach.dayMap[dateStr].sort((a, b) => a.startTime.localeCompare(b.startTime))
        };
      });

    return {
      coachName: coach.coachName,
      coachPhone: coach.coachPhone,
      schedulesByDay
    };
  });

  // Sort by coach name
  result.sort((a, b) => (a.coachName || '').localeCompare(b.coachName || ''));

  return result;
};

// ============================================================
// LEGACY METHODS (backward compatible, diperbaiki $ifNull)
// ============================================================

scheduleSchema.statics.getDailyRecap = async function() {
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);

  return await this.aggregate([
    { $match: { date: { $gte: startOfDay, $lte: endOfDay }, status: 'scheduled' } },
    {
      $facet: {
        privateSchedules: [
          { $match: { scheduleType: 'private' } },
          { $project: {
            coachId: '$coachId',
            coachName: { $ifNull: ['$coachName', '-'] },
            coachPhone: { $ifNull: ['$coachPhone', null] },
            startTime: 1, endTime: 1,
            location: { $ifNull: ['$location', '-'] },
            studentName: { $ifNull: ['$studentName', '-'] },
            category: { $ifNull: ['$programCategory', 'Private'] }
          }}
        ],
        groupSchedules: [
          { $match: { scheduleType: { $in: ['group', 'semiPrivate'] } } },
          { $unwind: '$coaches' },
          { $project: {
            coachId: '$coaches._id',
            coachName: { $ifNull: ['$coaches.fullName', '-'] },
            coachPhone: { $ifNull: ['$coaches.phone', null] },
            startTime: 1, endTime: 1,
            location: { $ifNull: ['$location', '-'] },
            studentName: { $ifNull: ['$groupName', 'Group Class'] },
            category: { $ifNull: ['$programCategory', 'Group Class'] }
          }}
        ]
      }
    },
    { $project: { allSchedules: { $concatArrays: ['$privateSchedules', '$groupSchedules'] } } },
    { $unwind: '$allSchedules' },
    { $group: {
      _id: '$allSchedules.coachId',
      coachName: { $first: '$allSchedules.coachName' },
      coachPhone: { $first: '$allSchedules.coachPhone' },
      schedules: {
        $push: {
          time: { $concat: [{ $ifNull: ['$allSchedules.startTime', '??'] }, ' - ', { $ifNull: ['$allSchedules.endTime', '??'] }] },
          student: '$allSchedules.studentName',
          location: '$allSchedules.location',
          category: '$allSchedules.category'
        }
      },
      totalClasses: { $sum: 1 }
    }},
    { $sort: { coachName: 1 } }
  ]);
};

scheduleSchema.statics.getCoachRecapByRange = async function(startDate, endDate) {
  const start = new Date(startDate); start.setHours(0, 0, 0, 0);
  const end = new Date(endDate); end.setHours(23, 59, 59, 999);

  return await this.aggregate([
    { $match: { date: { $gte: start, $lte: end }, status: 'scheduled' } },
    {
      $facet: {
        privateSchedules: [
          { $match: { scheduleType: 'private' } },
          { $project: {
            coachId: '$coachId',
            coachName: { $ifNull: ['$coachName', '-'] },
            coachPhone: { $ifNull: ['$coachPhone', null] },
            date: 1, startTime: 1, endTime: 1,
            location: { $ifNull: ['$location', '-'] },
            category: { $ifNull: ['$programCategory', 'Private Training'] },
            students: [{ fullName: { $ifNull: ['$studentName', '-'] } }]
          }}
        ],
        groupSchedules: [
          { $match: { scheduleType: { $in: ['group', 'semiPrivate'] } } },
          { $unwind: '$coaches' },
          { $project: {
            coachId: '$coaches._id',
            coachName: { $ifNull: ['$coaches.fullName', '-'] },
            coachPhone: { $ifNull: ['$coaches.phone', null] },
            date: 1, startTime: 1, endTime: 1,
            location: { $ifNull: ['$location', '-'] },
            category: { $ifNull: ['$programCategory', 'Group Class'] },
            students: { $ifNull: ['$students', []] },
            groupName: { $ifNull: ['$groupName', 'Group Class'] }
          }}
        ]
      }
    },
    { $project: { all: { $concatArrays: ['$privateSchedules', '$groupSchedules'] } } },
    { $unwind: '$all' },
    { $group: {
      _id: '$all.coachId',
      coachName: { $first: '$all.coachName' },
      coachPhone: { $first: '$all.coachPhone' },
      schedules: {
        $push: {
          date: '$all.date',
          time: { $concat: [{ $ifNull: ['$all.startTime', '??'] }, ' - ', { $ifNull: ['$all.endTime', '??'] }] },
          location: '$all.location', category: '$all.category',
          groupName: '$all.groupName', students: '$all.students'
        }
      }
    }},
    { $sort: { coachName: 1 } }
  ]);
};

module.exports = mongoose.model('Schedule', scheduleSchema);
