// backend/src/models/Schedule.js

const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  // ==================== SCHEDULE TYPE ====================
  /**
   * ✅ Type: 'private' (1 coach + 1 student) atau 'group' (multiple)
   */
  scheduleType: {
    type: String,
    enum: ['semiPrivate', 'group' ,'private'],
    default: 'private',
    required: [true, 'Schedule type is required'],
    index: true
  },

  // ==================== INDIVIDUAL SCHEDULE ====================
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    index: true,
    // ✅ Required hanya untuk private schedule
    validate: {
      validator: function() {
        if (this.scheduleType === 'private') {
          return !!this.studentId;
        }
        return true;
      },
      message: 'Student ID is required for private schedule'
    }
  },

  studentName: {
    type: String,
    // ✅ Required hanya untuk private schedule
    validate: {
      validator: function() {
        if (this.scheduleType === 'private') {
          return !!this.studentName;
        }
        return true;
      },
      message: 'Student name is required for private schedule'
    }
  },

  studentPhone: {
    type: String,
    // ✅ Required hanya untuk private schedule
    validate: {
      validator: function() {
        if (this.scheduleType === 'private') {
          return !!this.studentPhone;
        }
        return true;
      },
      message: 'Student phone is required for private schedule'
    }
  },

  coachId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coach',
    index: true,
    // ✅ Required hanya untuk private schedule
    validate: {
      validator: function() {
        if (this.scheduleType === 'private') {
          return !!this.coachId;
        }
        return true;
      },
      message: 'Coach ID is required for private schedule'
    }
  },

  coachName: {
    type: String,
    // ✅ Required hanya untuk private schedule
    validate: {
      validator: function() {
        if (this.scheduleType === 'private') {
          return !!this.coachName;
        }
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
  /**
   * ✅ Nama group class (untuk group schedule)
   */
  groupName: {
    type: String,
    default: null,
    // ✅ Required hanya untuk group schedule
    validate: {
      validator: function() {
        if (this.scheduleType === 'group') {
          return !!this.groupName;
        }
        return true;
      },
      message: 'Group name is required for group schedule'
    }
  },

  /**
   * ✅ Array pelatih untuk group class
   */
  coaches: [
    {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coach'
      },
      fullName: String,
      phone: String
    }
  ],

  /**
   * ✅ Array siswa untuk group class
   */
  students: [
    {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student'
      },
      fullName: String,
      phone: String
    }
  ],

  // ==================== PROGRAM ====================
  program: {
    type: String,
    required: [true, 'Program is required'],
    enum: [
       'Private Training',
      'Semi Private Training',
      'Group Class'
    ],
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
      // ✅ Normalize date to local midnight (00:00:00)
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
  reminderEnabled: {
    type: Boolean,
    default: true,
    index: true
  },

  reminderSent: {
    type: Boolean,
    default: false
  },

  reminderSentAt: {
    type: Date,
    default: null
  },

  reminderBeforeHours: {
    type: Number,
    default: 24,
    min: [1, 'Reminder must be at least 1 hour before'],
    max: [168, 'Reminder cannot be more than 1 week before']
  },

  reminderAttempts: {
    type: Number,
    default: 0,
    min: 0
  },

  reminderLastAttempt: {
    type: Date,
    default: null
  },

  // ==================== ARCHIVE TRACKING ====================
  archivedAt: {
    type: Date,
    default: null,
    // ✅ TTL Index: Auto-delete 3 days (259200 seconds) after archived
    index: {
      expireAfterSeconds: 259200,
      sparse: true, // Hanya berlaku untuk documents yang punya archivedAt
      name: 'archivedAt_ttl'
    }
  },

  archivedReason: {
    type: String,
    default: null,
    enum: [null, 'completed', 'cancelled', 'manual', 'system']
  },

  // ==================== AUDIT ====================
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
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

// ✅ Compound index untuk query archived
scheduleSchema.index({ status: 1, archivedAt: 1 }, { name: 'status_archived_index' });

// ✅ Index untuk reminder queries
scheduleSchema.index({ reminderEnabled: 1, reminderSent: 0, date: 1 }, { name: 'reminder_pending_index' });

// ✅ Index untuk group schedules
scheduleSchema.index({ 'coaches._id': 1 });
scheduleSchema.index({ 'students._id': 1 });

// ==================== VIRTUALS ====================

/**
 * ✅ Virtual: Display name (untuk private maupun group)
 */
scheduleSchema.virtual('displayName').get(function() {
  if (this.scheduleType === 'private') {
    return this.studentName || 'private Schedule';
  }
  return this.groupName || 'Group Class';
});

/**
 * ✅ Virtual: Participants info
 */
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

/**
 * ✅ Virtual: Is upcoming schedule
 */
scheduleSchema.virtual('isUpcoming').get(function() {
  const now = new Date();
  const scheduleDate = new Date(this.date);
  const scheduleDatetime = new Date(scheduleDate);
  const [hours, minutes] = this.startTime.split(':');
  scheduleDatetime.setHours(parseInt(hours), parseInt(minutes), 0);
  
  return scheduleDatetime > now && this.status === 'scheduled';
});

/**
 * ✅ Virtual: Hours until schedule
 */
scheduleSchema.virtual('hoursUntil').get(function() {
  const now = new Date();
  const scheduleDate = new Date(this.date);
  const scheduleDatetime = new Date(scheduleDate);
  const [hours, minutes] = this.startTime.split(':');
  scheduleDatetime.setHours(parseInt(hours), parseInt(minutes), 0);
  
  const diff = scheduleDatetime - now;
  return Math.floor(diff / (1000 * 60 * 60));
});

// ==================== METHODS ====================

/**
 * ✅ Archive schedule dengan reason
 */
scheduleSchema.methods.archive = async function(reason = 'manual') {
  this.status = 'archived';
  this.archivedAt = new Date();
  this.archivedReason = reason;
  return await this.save();
};

/**
 * ✅ Restore archived schedule
 */
scheduleSchema.methods.restore = async function() {
  if (this.status !== 'archived') {
    throw new Error('Can only restore archived schedules');
  }
  
  this.status = 'scheduled';
  this.archivedAt = null;
  this.archivedReason = null;
  return await this.save();
};

/**
 * ✅ Send reminder
 */
scheduleSchema.methods.sendReminder = async function() {
  if (!this.reminderEnabled) {
    throw new Error('Reminder is not enabled for this schedule');
  }

  // ✅ Hitung waktu reminder
  const scheduleDate = new Date(this.date);
  const [hours, minutes] = this.startTime.split(':');
  scheduleDate.setHours(parseInt(hours), parseInt(minutes), 0);

  const reminderTime = new Date(scheduleDate.getTime() - this.reminderBeforeHours * 60 * 60 * 1000);
  const now = new Date();

  if (now < reminderTime) {
    throw new Error('Too early to send reminder');
  }

  // ✅ TODO: Integrate dengan WhatsApp gateway
  // Kirim ke semua coach & student
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

  // Update reminder tracking
  this.reminderSent = true;
  this.reminderSentAt = now;
  this.reminderAttempts = (this.reminderAttempts || 0) + 1;
  this.reminderLastAttempt = now;

  await this.save();

  return {
    success: true,
    sentTo: recipients.length,
    recipients
  };
};

/**
 * ✅ Get all participants (untuk notification)
 */
scheduleSchema.methods.getAllParticipants = function() {
  if (this.scheduleType === 'private') {
    return [
      {
        id: this.coachId,
        name: this.coachName,
        phone: this.coachPhone,
        type: 'coach'
      },
      {
        id: this.studentId,
        name: this.studentName,
        phone: this.studentPhone,
        type: 'student'
      }
    ];
  }

  return [
    ...this.coaches.map(c => ({
      id: c._id,
      name: c.fullName,
      phone: c.phone,
      type: 'coach'
    })),
    ...this.students.map(s => ({
      id: s._id,
      name: s.fullName,
      phone: s.phone,
      type: 'student'
    }))
  ];
};

/**
 * ✅ Validate schedule conflicts
 */
scheduleSchema.statics.checkConflicts = async function(scheduleData) {
  const { date, startTime, endTime, scheduleType, coachId, coaches, studentId, students, excludeId } = scheduleData;

  const conflicts = [];

  // ✅ Parse times
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  // ✅ Normalize date
  const queryDate = new Date(date);
  queryDate.setHours(0, 0, 0, 0);

  let query = {
    date: queryDate,
    status: 'scheduled'
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const existingSchedules = await this.find(query);

  for (const existing of existingSchedules) {
    const [exStartHour, exStartMin] = existing.startTime.split(':').map(Number);
    const [exEndHour, exEndMin] = existing.endTime.split(':').map(Number);
    const exStartMinutes = exStartHour * 60 + exStartMin;
    const exEndMinutes = exEndHour * 60 + exEndMin;

    // ✅ Check time overlap
    const timeOverlap = startMinutes < exEndMinutes && endMinutes > exStartMinutes;

    if (!timeOverlap) continue;

    // ✅ Check coach conflicts
    if (scheduleType === 'private' && existing.scheduleType === 'private') {
      if (existing.coachId?.toString() === coachId?.toString()) {
        conflicts.push({
          existingSchedule: existing._id,
          conflictType: 'coach',
          details: `Coach conflict: ${existing.coachName} already scheduled`
        });
      }
    } else if (scheduleType === 'private' && existing.scheduleType === 'group') {
      const hasCoach = existing.coaches.some(c => c._id?.toString() === coachId?.toString());
      if (hasCoach) {
        conflicts.push({
          existingSchedule: existing._id,
          conflictType: 'coach',
          details: `Coach conflict: ${existing.coachName} already in group class`
        });
      }
    } else if (scheduleType === 'group' && existing.scheduleType === 'private') {
      const hasCoach = coaches.some(c => c.toString() === existing.coachId?.toString());
      if (hasCoach) {
        conflicts.push({
          existingSchedule: existing._id,
          conflictType: 'coach',
          details: `Coach conflict with existing private schedule`
        });
      }
    } else if (scheduleType === 'group' && existing.scheduleType === 'group') {
      const coachConflict = coaches.some(c => 
        existing.coaches.some(ec => ec._id?.toString() === c.toString())
      );
      if (coachConflict) {
        conflicts.push({
          existingSchedule: existing._id,
          conflictType: 'coach',
          details: `Coach conflict with existing group class`
        });
      }
    }

    // ✅ Check student conflicts (private only)
    if (scheduleType === 'private' && existing.scheduleType === 'private') {
      if (existing.studentId?.toString() === studentId?.toString()) {
        conflicts.push({
          existingSchedule: existing._id,
          conflictType: 'student',
          details: `Student conflict: ${existing.studentName} already scheduled`
        });
      }
    } else if (scheduleType === 'private' && existing.scheduleType === 'group') {
      const hasStudent = existing.students.some(s => s._id?.toString() === studentId?.toString());
      if (hasStudent) {
        conflicts.push({
          existingSchedule: existing._id,
          conflictType: 'student',
          details: `Student conflict: ${existing.displayName} already in group class`
        });
      }
    }
  }

  return conflicts;
};

// ==================== STATICS ====================

/**
 * ✅ Get pending reminders (untuk background job)
 */
scheduleSchema.statics.getPendingReminders = async function(hoursBuffer = 24) {
  const now = new Date();
  const futureDate = new Date(now.getTime() + hoursBuffer * 60 * 60 * 1000);

  return await this.find({
    reminderEnabled: true,
    reminderSent: false,
    status: 'scheduled',
    date: {
      $gte: now,
      $lte: futureDate
    }
  }).sort({ date: 1, startTime: 1 });
};

/**
 * ✅ Get schedules by coach
 */
scheduleSchema.statics.getByCoach = async function(coachId, startDate, endDate) {
  return await this.find({
    $or: [
      { coachId: coachId, scheduleType: 'private' },
      { 'coaches._id': coachId, scheduleType: 'group' }
    ],
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  });
};

/**
 * ✅ Get schedules by student
 */
scheduleSchema.statics.getByStudent = async function(studentId, startDate, endDate) {
  return await this.find({
    $or: [
      { studentId: studentId, scheduleType: 'private' },
      { 'students._id': studentId, scheduleType: 'group' }
    ],
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  });
};

/**
 * ✅ Get group schedules
 */
scheduleSchema.statics.getGroupSchedules = async function(startDate, endDate) {
  return await this.find({
    scheduleType: 'group',
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  });
};

/**
 * ✅ Get private schedules
 */
scheduleSchema.statics.getIndividualSchedules = async function(startDate, endDate) {
  return await this.find({
    scheduleType: 'private',
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  });
};

/**
 * ✅ Get archived schedules older than specified days
 */
scheduleSchema.statics.getOldArchivedSchedules = async function(days = 3) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return await this.find({
    status: 'archived',
    archivedAt: { $exists: true, $lt: cutoffDate }
  }).lean();
};

/**
 * ✅ Manually delete old archived schedules
 */
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

/**
 * ✅ Get archive statistics
 */
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
    breakdown: {
      totalSchedules: total + groupCount + individualCount,
      group: groupCount,
      private: individualCount,
      archived: total
    }
  };
};

/**
 * ✅ Get schedule statistics by status
 */
scheduleSchema.statics.getStatsByStatus = async function() {
  return await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

/**
 * ✅ Get statistics by schedule type
 */
scheduleSchema.statics.getStatsByType = async function() {
  return await this.aggregate([
    {
      $group: {
        _id: '$scheduleType',
        count: { $sum: 1 },
        totalDuration: { $sum: '$duration' }
      }
    }
  ]);
};

module.exports = mongoose.model('Schedule', scheduleSchema);
