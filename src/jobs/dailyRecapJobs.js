// backend/src/jobs/dailyRecapJobs.js
const cron = require('node-cron');
const Schedule = require('../models/Schedule');
const Student = require('../models/Student');
const whatsappService = require('../services/whatsappService');

const TZ = 'Asia/Jakarta';
const TZ_OFFSET = '+07:00';

// ======================== TIMEZONE HELPERS ========================

function getJakartaParts(d = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short'
  });
  const map = {};
  for (const { type, value } of formatter.formatToParts(d)) {
    map[type] = value;
  }
  return map;
}

function jakartaDate(dateStr, time = '00:00:00') {
  return new Date(`${dateStr}T${time}${TZ_OFFSET}`);
}

function toJakartaDateStr(d) {
  const p = getJakartaParts(d);
  return `${p.year}-${p.month}-${p.day}`;
}

function startOfWeekMondayJakarta(baseDate = new Date()) {
  const p = getJakartaParts(baseDate);
  const d = new Date(`${p.year}-${p.month}-${p.day}T12:00:00${TZ_OFFSET}`);
  const dow = d.getDay();
  const diff = (dow === 0 ? -6 : 1 - dow);
  d.setDate(d.getDate() + diff);
  return jakartaDate(toJakartaDateStr(d), '00:00:00');
}

function endOfWeekSaturdayJakarta(baseDate = new Date()) {
  const mon = startOfWeekMondayJakarta(baseDate);
  const sat = new Date(mon);
  sat.setDate(sat.getDate() + 5);
  return jakartaDate(toJakartaDateStr(sat), '23:59:59.999');
}

function getDayNameFromKey(dateKey) {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const d = jakartaDate(dateKey, '12:00:00');
  const p = getJakartaParts(d);
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return days[weekdayMap[p.weekday]] || '-';
}

function getDateRangeText(start, end) {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const sp = getJakartaParts(start);
  const ep = getJakartaParts(end);
  return `${parseInt(sp.day)}-${parseInt(ep.day)} ${months[parseInt(ep.month) - 1]} ${ep.year}`;
}

// ======================== LABEL HELPERS ========================

function getStudentLabel(sch, shortNameMap) {
  if (sch.scheduleType === 'private') {
    const sid = sch.studentId?._id?.toString() || sch.studentId?.toString();
    const short = sid ? shortNameMap[sid] : null;
    if (short) return short;
    return sch.studentId?.fullName || sch.studentName || '-';
  }

  const labels = (sch.students || []).map(s => {
    const id = s._id?.toString();
    const short = id ? shortNameMap[id] : null;
    return short || s.fullName || s.studentName;
  }).filter(Boolean);

  if (labels.length > 0) return labels.join(', ');
  return sch.groupName || '-';
}

function getCategory(sch) {
  if (sch.programCategory) return sch.programCategory;
  if (sch.scheduleType === 'private') return 'Private';
  if (sch.scheduleType === 'semiPrivate') return 'Semi Private';
  return 'Group Class';
}

// ======================== SHORTNAME MAP ========================

async function buildShortNameMap(schedules) {
  const studentIdsSet = new Set();
  for (const sch of schedules) {
    if (sch.scheduleType === 'private') {
      const sid = sch.studentId?._id?.toString() || sch.studentId?.toString();
      if (sid) studentIdsSet.add(sid);
    }
    (sch.students || []).forEach(s => {
      const sid = s._id?.toString();
      if (sid) studentIdsSet.add(sid);
    });
  }

  const students = await Student.find(
    { _id: { $in: Array.from(studentIdsSet) } },
    { _id: 1, shortName: 1 }
  ).lean();

  const shortNameMap = {};
  for (const st of students) {
    if (st.shortName) shortNameMap[st._id.toString()] = st.shortName;
  }
  return shortNameMap;
}

// ======================== COACH RECAP BUILDER ========================

function buildCoachRecaps(schedules, shortNameMap) {
  const coachMap = {};

  for (const sch of schedules) {
    const dateStr = toJakartaDateStr(new Date(sch.date));
    const studentLabel = getStudentLabel(sch, shortNameMap);
    const category = getCategory(sch);
    const time = `${sch.startTime || '??:??'} - ${sch.endTime || '??:??'}`;

    const entry = {
      time,
      student: studentLabel,
      category,
      startTime: sch.startTime || '00:00',
      dateStr
    };

    if (sch.scheduleType === 'private') {
      const coachName = sch.coachId?.fullName || sch.coachName || 'Coach';
      const coachPhone = sch.coachId?.phone || sch.coachPhone || null;
      const coachKey =
        sch.coachId?._id?.toString() ||
        sch.coachId?.toString() ||
        coachName;

      if (!coachMap[coachKey]) {
        coachMap[coachKey] = { coachName, coachPhone, dayMap: {} };
      }
      if (coachPhone && !coachMap[coachKey].coachPhone) {
        coachMap[coachKey].coachPhone = coachPhone;
      }
      if (!coachMap[coachKey].dayMap[dateStr]) coachMap[coachKey].dayMap[dateStr] = [];
      coachMap[coachKey].dayMap[dateStr].push(entry);

    } else if (sch.scheduleType === 'group' || sch.scheduleType === 'semiPrivate') {
      const coachList = sch.coaches || [];
      if (coachList.length === 0) continue;

      for (const coach of coachList) {
        const coachName = coach.fullName || 'Coach';
        const coachPhone = coach.phone || null;
        const coachKey = coach._id?.toString() || coachName;

        if (!coachMap[coachKey]) {
          coachMap[coachKey] = { coachName, coachPhone, dayMap: {} };
        }
        if (coachPhone && !coachMap[coachKey].coachPhone) {
          coachMap[coachKey].coachPhone = coachPhone;
        }
        if (!coachMap[coachKey].dayMap[dateStr]) coachMap[coachKey].dayMap[dateStr] = [];
        coachMap[coachKey].dayMap[dateStr].push(entry);
      }
    }
  }

  return Object.values(coachMap)
    .map(coach => ({
      coachName: coach.coachName,
      coachPhone: coach.coachPhone,
      schedulesByDay: Object.keys(coach.dayMap)
        .sort()
        .map(dateStr => ({
          dayName: getDayNameFromKey(dateStr),
          schedules: coach.dayMap[dateStr].sort((a, b) => a.startTime.localeCompare(b.startTime))
        }))
    }))
    .sort((a, b) => (a.coachName || '').localeCompare(b.coachName || ''));
}

// ======================== CRON JOB ========================

const initDailyRecapJob = () => {
  console.log('🕒 Daily Recap Job initialized (Schedule: Senin 06:00 AM)');

  // Kirim rekap mingguan ke masing-masing coach setiap Senin jam 06:00
  cron.schedule('0 6 * * 1', async () => {
    console.log('🔄 Running Weekly Coach Recap...');

    try {
      const now = new Date();
      const weekStart = startOfWeekMondayJakarta(now);
      const weekEnd   = endOfWeekSaturdayJakarta(now);

      const schedules = await Schedule.find({
        date: { $gte: weekStart, $lte: weekEnd },
        status: 'scheduled'
      })
        .sort({ date: 1, startTime: 1 })
        .populate('studentId', '_id fullName')
        .populate('coachId', '_id fullName phone')
        .populate('students', '_id fullName')
        .populate('coaches', '_id fullName phone')
        .lean();

      if (!schedules || schedules.length === 0) {
        console.log('ℹ️ Tidak ada jadwal minggu ini. Job selesai.');
        return;
      }

      const shortNameMap = await buildShortNameMap(schedules);
      const coachRecaps = buildCoachRecaps(schedules, shortNameMap);
      const dateRange = getDateRangeText(weekStart, weekEnd);

      console.log(`📨 Mengirim jadwal mingguan ke ${coachRecaps.length} pelatih...`);

      for (const recap of coachRecaps) {
        if (!recap.coachPhone) {
          console.warn(`⚠️ Skip Coach ${recap.coachName}: Tidak ada nomor HP`);
          continue;
        }

        if (!recap.schedulesByDay || recap.schedulesByDay.length === 0) {
          console.log(`⚠️ Skip Coach ${recap.coachName}: Jadwal kosong.`);
          continue;
        }

        let message = `*JADWAL ANDA MINGGU INI ${dateRange}*\n`;
        message += `Halo Coach *${recap.coachName}*, berikut jadwal Anda:\n\n`;

        for (const day of recap.schedulesByDay) {
          message += `*${day.dayName}*\n`;
          for (const sch of day.schedules) {
            message += `* ${sch.time} | ${sch.student}\n`;
          }
          message += '\n';
        }

        await whatsappService.sendMessage(
          recap.coachPhone,
          message.trim(),
          'reminder',
          null,
          { recipientName: recap.coachName }
        );

        await new Promise(r => setTimeout(r, 2000));
      }

      console.log('✅ Weekly Coach Recap selesai dikirim.');

    } catch (error) {
      console.error('❌ Error sending weekly coach recap:', error);
    }
  }, { timezone: TZ });
};

module.exports = initDailyRecapJob;
