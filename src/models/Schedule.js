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
    type: Number,
    default: 24,
    min: [1, 'Reminder must be at least 1 hour before'],
    max: [168, 'Reminder cannot be more than 1 week before']
  },
  reminderAttempts: { type: Number, default: 0, min: 0 },
  reminderLastAttempt: { type: Date, default: null },

  // ==================== ARCHIVE TRACKING ====================
  archivedAt: {
    type: Date,
    default: null,
    index: { expireAfterSeconds: 259200, sparse: true, name: 'archivedAt_ttl' }
  },

  archivedReason: {
    type: String,
    default: null,
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
    type: 'group',
    coaches: this.coaches,
    students: this.students,
    coachCount: this.coaches?.length || 0,
    studentCount: this.students?.length || 0
  };
});

scheduleSchema.virtual('isUpcoming').get(function() {
  const now = new Date();
  const scheduleDatetime = new Date(this.date);
  const [hours, minutes] = this.startTime.split(':');
  scheduleDatetime.setHours(parseInt(hours), parseInt(minutes), 0);
  return scheduleDatetime > now && this.status === 'scheduled';
});

scheduleSchema.virtual('hoursUntil').get(function() {
  const now = new Date();
  const scheduleDatetime = new Date(this.date);
  const [hours, minutes] = this.startTime.split(':');
  scheduleDatetime.setHours(parseInt(hours), parseInt(minutes), 0);
  return Math.floor((scheduleDatetime - now) / (1000 * 60 * 60));
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
  if (!this.reminderEnabled) throw new Error('Reminder is not enabled for this schedule');

  const scheduleDate = new Date(this.date);
  const [hours, minutes] = this.startTime.split(':');
  scheduleDate.setHours(parseInt(hours), parseInt(minutes), 0);

  const reminderTime = new Date(scheduleDate.getTime() - this.reminderBeforeHours * 60 * 60 * 1000);
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

  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  const queryDate = new Date(date);
  queryDate.setHours(0, 0, 0, 0);

  const query = { date: queryDate, status: 'scheduled' };
  if (excludeId) query._id = { $ne: excludeId };

  const existingSchedules = await this.find(query);

  for (const existing of existingSchedules) {
    const [exStartHour, exStartMin] = existing.startTime.split(':').map(Number);
    const [exEndHour, exEndMin] = existing.endTime.split(':').map(Number);
    const exStartMinutes = exStartHour * 60 + exStartMin;
    const exEndMinutes = exEndHour * 60 + exEndMin;

    const timeOverlap = startMinutes < exEndMinutes && endMinutes > exStartMinutes;
    if (!timeOverlap) continue;

    // Coach conflicts
    if (scheduleType === 'private' && existing.scheduleType === 'private') {
      if (existing.coachId?.toString() === coachId?.toString()) {
        conflicts.push({ existingSchedule: existing._id, conflictType: 'coach', details: `Coach conflict: ${existing.coachName} already scheduled` });
      }
    } else if (scheduleType === 'private' && existing.scheduleType === 'group') {
      if (existing.coaches.some(c => c._id?.toString() === coachId?.toString())) {
        conflicts.push({ existingSchedule: existing._id, conflictType: 'coach', details: `Coach conflict: already in group class` });
      }
    } else if (scheduleType === 'group' && existing.scheduleType === 'private') {
      if (coaches && coaches.some(c => c.toString() === existing.coachId?.toString())) {
        conflicts.push({ existingSchedule: existing._id, conflictType: 'coach', details: `Coach conflict with existing private schedule` });
      }
    } else if (scheduleType === 'group' && existing.scheduleType === 'group') {
      if (coaches && coaches.some(c => existing.coaches.some(ec => ec._id?.toString() === c.toString()))) {
        conflicts.push({ existingSchedule: existing._id, conflictType: 'coach', details: `Coach conflict with existing group class` });
      }
    }

    // Student conflicts
    if (scheduleType === 'private' && existing.scheduleType === 'private') {
      if (existing.studentId?.toString() === studentId?.toString()) {
        conflicts.push({ existingSchedule: existing._id, conflictType: 'student', details: `Student conflict: ${existing.studentName} already scheduled` });
      }
    } else if (scheduleType === 'private' && existing.scheduleType === 'group') {
      if (existing.students.some(s => s._id?.toString() === studentId?.toString())) {
        conflicts.push({ existingSchedule: existing._id, conflictType: 'student', details: `Student conflict: already in group class` });
      }
    }
  }

  return conflicts;
};

scheduleSchema.statics.getPendingReminders = async function(hoursBuffer = 24) {
  const now = new Date();
  const futureDate = new Date(now.getTime() + hoursBuffer * 60 * 60 * 1000);
  return await this.find({
    reminderEnabled: true, reminderSent: false, status: 'scheduled',
    date: { $gte: now, $lte: futureDate }
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
    scheduleType: 'group',
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
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  return await this.find({
    status: 'archived',
    archivedAt: { $exists: true, $lt: cutoffDate }
  }).lean();
};

scheduleSchema.statics.deleteOldArchivedSchedules = async function(days = 3) {
  console.log(`🗑️ Deleting archived schedules older than ${days} days...`);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const result = await this.deleteMany({
    status: 'archived',
    archivedAt: { $exists: true, $lt: cutoffDate }
  });
  console.log(`✅ Deleted ${result.deletedCount} old archived schedules`);
  return result;
};

scheduleSchema.statics.getArchiveStats = async function() {
  const total = await this.countDocuments({ status: 'archived' });
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 3);
  const willDelete = await this.countDocuments({
    status: 'archived',
    archivedAt: { $exists: true, $lt: cutoffDate }
  });
  const groupCount = await this.countDocuments({ scheduleType: 'group' });
  const individualCount = await this.countDocuments({ scheduleType: 'private' });
  return {
    totalArchived: total,
    willDeleteIn3Days: willDelete,
    percentage: total > 0 ? Math.round((willDelete / total) * 100) : 0,
    breakdown: { totalSchedules: total + groupCount + individualCount, group: groupCount, private: individualCount, archived: total }
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
// DAILY RECAP: Jadwal Mingguan Per Coach (untuk dailyRecapJobs)
// Output: [{ coachName, coachPhone, schedulesByDay: [{ dayName, schedules }] }]
// ============================================================
scheduleSchema.statics.getCoachWeeklyRecap = async function(startDate, endDate) {
  const start = new Date(startDate); start.setHours(0, 0, 0, 0);
  const end = new Date(endDate); end.setHours(23, 59, 59, 999);

  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  const results = await this.aggregate([
    {
      $match: {
        date: { $gte: start, $lte: end },
        status: 'scheduled'
      }
    },
    {
      $facet: {
        privateSchedules: [
          { $match: { scheduleType: 'private' } },
          {
            $project: {
              coachId: '$coachId',
              coachName: { $ifNull: ['$coachName', 'Unknown Coach'] },
              coachPhone: { $ifNull: ['$coachPhone', null] },
              date: 1,
              startTime: { $ifNull: ['$startTime', '??:??'] },
              endTime: { $ifNull: ['$endTime', '??:??'] },
              location: { $ifNull: ['$location', '-'] },
              studentLabel: { $ifNull: ['$studentName', '-'] },
              category: { $ifNull: ['$programCategory', 'Private'] }
            }
          }
        ],
        groupSchedules: [
          { $match: { scheduleType: { $in: ['group', 'semiPrivate'] } } },
          { $unwind: '$coaches' },
          {
            $project: {
              coachId: '$coaches._id',
              coachName: { $ifNull: ['$coaches.fullName', 'Unknown Coach'] },
              coachPhone: { $ifNull: ['$coaches.phone', null] },
              date: 1,
              startTime: { $ifNull: ['$startTime', '??:??'] },
              endTime: { $ifNull: ['$endTime', '??:??'] },
              location: { $ifNull: ['$location', '-'] },
              studentLabel: {
                $cond: {
                  if: { $gt: [{ $size: { $ifNull: ['$students', []] } }, 0] },
                  then: {
                    $reduce: {
                      input: { $ifNull: ['$students', []] },
                      initialValue: '',
                      in: {
                        $cond: {
                          if: { $eq: ['$$value', ''] },
                          then: { $ifNull: ['$$this.fullName', ''] },
                          else: { $concat: ['$$value', ', ', { $ifNull: ['$$this.fullName', ''] }] }
                        }
                      }
                    }
                  },
                  else: { $ifNull: ['$groupName', 'Group Class'] }
                }
              },
              category: {
                $ifNull: [
                  '$programCategory',
                  {
                    $cond: {
                      if: { $eq: ['$scheduleType', 'semiPrivate'] },
                      then: 'Semi Private',
                      else: 'Group Class'
                    }
                  }
                ]
              }
            }
          }
        ]
      }
    },
    { $project: { all: { $concatArrays: ['$privateSchedules', '$groupSchedules'] } } },
    { $unwind: '$all' },
    {
      $group: {
        _id: {
          coachId: '$all.coachId',
          dateStr: { $dateToString: { format: '%Y-%m-%d', date: '$all.date' } },
          dayOfWeek: { $dayOfWeek: '$all.date' }
        },
        coachName: { $first: '$all.coachName' },
        coachPhone: { $first: '$all.coachPhone' },
        schedules: {
          $push: {
            time: { $concat: ['$all.startTime', ' - ', '$all.endTime'] },
            student: '$all.studentLabel',
            category: '$all.category',
            location: '$all.location',
            startTime: '$all.startTime'
          }
        }
      }
    },
    { $sort: { '_id.dateStr': 1, 'schedules.startTime': 1 } },
    {
      $group: {
        _id: '$_id.coachId',
        coachName: { $first: '$coachName' },
        coachPhone: { $first: '$coachPhone' },
        days: {
          $push: {
            dayOfWeek: '$_id.dayOfWeek',
            dateStr: '$_id.dateStr',
            schedules: '$schedules'
          }
        }
      }
    },
    { $sort: { coachName: 1 } }
  ]);

  // Post-process: ubah dayOfWeek (1=Sun) jadi nama hari, sort schedules per hari
  return results.map(coach => {
    const schedulesByDay = coach.days
      .sort((a, b) => a.dateStr.localeCompare(b.dateStr))
      .map(day => ({
        dayName: dayNames[day.dayOfWeek - 1], // MongoDB $dayOfWeek: 1=Sunday
        dateStr: day.dateStr,
        schedules: day.schedules.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
      }));

    return {
      coachName: coach.coachName,
      coachPhone: coach.coachPhone,
      schedulesByDay
    };
  });
};

// ============================================================
// ADMIN RECAP: Semua jadwal per HARI (untuk adminRecapJobs)
// Output flat: [{ date, startTime, studentNames, coachNames, groupName }]
// ============================================================
scheduleSchema.statics.getAdminRecapByRange = async function(startDate, endDate) {
  const start = new Date(startDate); start.setHours(0, 0, 0, 0);
  const end = new Date(endDate); end.setHours(23, 59, 59, 999);

  return await this.aggregate([
    {
      $match: {
        date: { $gte: start, $lte: end },
        status: 'scheduled'
      }
    },
    {
      $facet: {
        privateSchedules: [
          { $match: { scheduleType: 'private' } },
          {
            $project: {
              date: 1,
              startTime: { $ifNull: ['$startTime', '??:??'] },
              studentNames: [{ $ifNull: ['$studentName', '-'] }],
              coachNames: [{ $ifNull: ['$coachName', '-'] }],
              groupName: null
            }
          }
        ],
        semiPrivateSchedules: [
          { $match: { scheduleType: 'semiPrivate' } },
          {
            $project: {
              date: 1,
              startTime: { $ifNull: ['$startTime', '??:??'] },
              studentNames: {
                $map: {
                  input: { $ifNull: ['$students', []] },
                  as: 's',
                  in: { $ifNull: ['$$s.fullName', '-'] }
                }
              },
              coachNames: {
                $map: {
                  input: { $ifNull: ['$coaches', []] },
                  as: 'c',
                  in: { $ifNull: ['$$c.fullName', '-'] }
                }
              },
              groupName: null
            }
          }
        ],
        groupSchedules: [
          { $match: { scheduleType: 'group' } },
          {
            $project: {
              date: 1,
              startTime: { $ifNull: ['$startTime', '??:??'] },
              studentNames: {
                $map: {
                  input: { $ifNull: ['$students', []] },
                  as: 's',
                  in: { $ifNull: ['$$s.fullName', '-'] }
                }
              },
              coachNames: {
                $map: {
                  input: { $ifNull: ['$coaches', []] },
                  as: 'c',
                  in: { $ifNull: ['$$c.fullName', '-'] }
                }
              },
              groupName: { $ifNull: ['$groupName', 'Group Class'] }
            }
          }
        ]
      }
    },
    {
      $project: {
        all: { $concatArrays: ['$privateSchedules', '$semiPrivateSchedules', '$groupSchedules'] }
      }
    },
    { $unwind: '$all' },
    { $replaceRoot: { newRoot: '$all' } },
    { $sort: { date: 1, startTime: 1 } }
  ]);
};

// ============================================================
// LEGACY: getDailyRecap (backward compatible, diperbaiki)
// ============================================================
scheduleSchema.statics.getDailyRecap = async function() {
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);

  return await this.aggregate([
    {
      $match: {
        date: { $gte: startOfDay, $lte: endOfDay },
        status: 'scheduled'
      }
    },
    {
      $facet: {
        privateSchedules: [
          { $match: { scheduleType: 'private' } },
          {
            $project: {
              coachId: '$coachId',
              coachName: { $ifNull: ['$coachName', 'Unknown Coach'] },
              coachPhone: { $ifNull: ['$coachPhone', null] },
              startTime: 1, endTime: 1,
              location: { $ifNull: ['$location', '-'] },
              studentName: { $ifNull: ['$studentName', '-'] },
              category: { $ifNull: ['$programCategory', 'Private'] }
            }
          }
        ],
        groupSchedules: [
          { $match: { scheduleType: { $in: ['group', 'semiPrivate'] } } },
          { $unwind: '$coaches' },
          {
            $project: {
              coachId: '$coaches._id',
              coachName: { $ifNull: ['$coaches.fullName', 'Unknown Coach'] },
              coachPhone: { $ifNull: ['$coaches.phone', null] },
              startTime: 1, endTime: 1,
              location: { $ifNull: ['$location', '-'] },
              studentName: { $ifNull: ['$groupName', 'Group Class'] },
              category: { $ifNull: ['$programCategory', 'Group Class'] }
            }
          }
        ]
      }
    },
    { $project: { allSchedules: { $concatArrays: ['$privateSchedules', '$groupSchedules'] } } },
    { $unwind: '$allSchedules' },
    {
      $group: {
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
      }
    },
    { $sort: { coachName: 1 } }
  ]);
};

// ============================================================
// LEGACY: getCoachRecapByRange (backward compatible, diperbaiki)
// ============================================================
scheduleSchema.statics.getCoachRecapByRange = async function(startDate, endDate) {
  const start = new Date(startDate); start.setHours(0, 0, 0, 0);
  const end = new Date(endDate); end.setHours(23, 59, 59, 999);

  return await this.aggregate([
    {
      $match: {
        date: { $gte: start, $lte: end },
        status: 'scheduled'
      }
    },
    {
      $facet: {
        privateSchedules: [
          { $match: { scheduleType: 'private' } },
          {
            $project: {
              coachId: '$coachId',
              coachName: { $ifNull: ['$coachName', 'Unknown Coach'] },
              coachPhone: { $ifNull: ['$coachPhone', null] },
              date: 1, startTime: 1, endTime: 1,
              location: { $ifNull: ['$location', '-'] },
              category: { $ifNull: ['$programCategory', 'Private Training'] },
              students: [{ fullName: { $ifNull: ['$studentName', '-'] } }]
            }
          }
        ],
        groupSchedules: [
          { $match: { scheduleType: { $in: ['group', 'semiPrivate'] } } },
          { $unwind: '$coaches' },
          {
            $project: {
              coachId: '$coaches._id',
              coachName: { $ifNull: ['$coaches.fullName', 'Unknown Coach'] },
              coachPhone: { $ifNull: ['$coaches.phone', null] },
              date: 1, startTime: 1, endTime: 1,
              location: { $ifNull: ['$location', '-'] },
              category: { $ifNull: ['$programCategory', 'Group Class'] },
              students: { $ifNull: ['$students', []] },
              groupName: { $ifNull: ['$groupName', 'Group Class'] }
            }
          }
        ]
      }
    },
    { $project: { all: { $concatArrays: ['$privateSchedules', '$groupSchedules'] } } },
    { $unwind: '$all' },
    {
      $group: {
        _id: '$all.coachId',
        coachName: { $first: '$all.coachName' },
        coachPhone: { $first: '$all.coachPhone' },
        schedules: {
          $push: {
            date: '$all.date',
            time: { $concat: [{ $ifNull: ['$all.startTime', '??'] }, ' - ', { $ifNull: ['$all.endTime', '??'] }] },
            location: '$all.location',
            category: '$all.category',
            groupName: '$all.groupName',
            students: '$all.students'
          }
        }
      }
    },
    { $sort: { coachName: 1 } }
  ]);
};

module.exports = mongoose.model('Schedule', scheduleSchema);
