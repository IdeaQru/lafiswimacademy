// backend/src/jobs/dailyRecapJobs.js
const cron = require('node-cron');
const Schedule = require('../models/Schedule');
const Student = require('../models/Student'); // pastikan path & nama model sesuai
const whatsappService = require('../services/whatsappService');

function getDayName(date) {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[new Date(date).getDay()];
}

function getDateRangeText(start, end) {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${start.getDate()}-${end.getDate()} ${months[end.getMonth()]} ${end.getFullYear()}`;
}

function startOfWeekMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfWeekSaturday(d) {
  const startMon = startOfWeekMonday(d);
  const endSat = new Date(startMon);
  endSat.setDate(endSat.getDate() + 5);
  endSat.setHours(23, 59, 59, 999);
  return endSat;
}

// === Helpers pakai data hasil populate + shortName map ===
function getStudentLabel(sch, shortNameMap) {
  if (sch.scheduleType === 'private') {
    const sid =
      sch.studentId?._id?.toString() ||
      sch.studentId?.toString();
    const short = sid ? shortNameMap[sid] : null;

    if (short) return short;

    return (
      sch.studentId?.fullName ||
      sch.studentName ||
      '-'
    );
  }

  // semiPrivate & group
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

/**
 * Build coach weekly recap data dari raw schedules (sudah di-populate)
 */
function buildCoachRecaps(schedules, shortNameMap) {
  const coachMap = {};

  for (const sch of schedules) {
    const date = new Date(sch.date);
    const dateStr = date.toISOString().split('T')[0];
    const studentLabel = getStudentLabel(sch, shortNameMap);
    const category = getCategory(sch);
    const time = `${sch.startTime || '??:??'} - ${sch.endTime || '??:??'}`;

    const entry = {
      time,
      student: studentLabel,
      category,
      startTime: sch.startTime || '00:00'
    };

    if (sch.scheduleType === 'private') {
      // Coach dari coachId (populate)
      const coachName = sch.coachId?.fullName || sch.coachName || 'Coach';
      const coachPhone = sch.coachId?.phone || sch.coachPhone || null;
      const coachKey =
        sch.coachId?._id?.toString() ||
        sch.coachId?.toString() ||
        coachName;

      if (!coachMap[coachKey]) {
        coachMap[coachKey] = {
          coachName,
          coachPhone,
          dayMap: {}
        };
      }
      if (coachPhone && !coachMap[coachKey].coachPhone) {
        coachMap[coachKey].coachPhone = coachPhone;
      }
      if (!coachMap[coachKey].dayMap[dateStr]) coachMap[coachKey].dayMap[dateStr] = [];
      coachMap[coachKey].dayMap[dateStr].push(entry);

    

    } else if (sch.scheduleType === 'group'|| sch.scheduleType === 'semiPrivate') {
      // Group: multiple coach di coaches[]
      const coachList = sch.coaches || [];
      if (coachList.length === 0) continue;

      for (const coach of coachList) {
        const coachName = coach.fullName || 'Coach';
        const coachPhone = coach.phone || null;
        const coachKey = coach._id?.toString() || coachName;

        if (!coachMap[coachKey]) {
          coachMap[coachKey] = {
            coachName,
            coachPhone,
            dayMap: {}
          };
        }
        if (coachPhone && !coachMap[coachKey].coachPhone) {
          coachMap[coachKey].coachPhone = coachPhone;
        }
        if (!coachMap[coachKey].dayMap[dateStr]) coachMap[coachKey].dayMap[dateStr] = [];
        coachMap[coachKey].dayMap[dateStr].push(entry);
      }
    }
  }

  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  return Object.values(coachMap)
    .map(coach => ({
      coachName: coach.coachName,
      coachPhone: coach.coachPhone,
      schedulesByDay: Object.keys(coach.dayMap)
        .sort()
        .map(dateStr => ({
          dayName: dayNames[new Date(dateStr + 'T00:00:00').getDay()],
          schedules: coach.dayMap[dateStr].sort((a, b) => a.startTime.localeCompare(b.startTime))
        }))
    }))
    .sort((a, b) => (a.coachName || '').localeCompare(b.coachName || ''));
}

const initDailyRecapJob = () => {
  console.log('🕒 Daily Recap Job initialized (Schedule: Senin 06:00 AM)');

  // Kirim rekap mingguan ke masing-masing coach setiap Senin jam 06:00
  cron.schedule('0 6 * * 1', async () => {
    console.log('🔄 Running Weekly Coach Recap...');

    try {
      const now = new Date();
      const weekStart = startOfWeekMonday(now);
      const weekEnd = endOfWeekSaturday(now);

      // Fetch + populate
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

      // Kumpulkan semua studentId yang muncul (private & array)
      const studentIdsSet = new Set();
      for (const sch of schedules) {
        if (sch.scheduleType === 'private') {
          const sid =
            sch.studentId?._id?.toString() ||
            sch.studentId?.toString();
          if (sid) studentIdsSet.add(sid);
        }
        (sch.students || []).forEach(s => {
          const sid = s._id?.toString();
          if (sid) studentIdsSet.add(sid);
        });
      }

      const studentIds = Array.from(studentIdsSet);

      // Ambil shortName dari koleksi Student
      const students = await Student.find(
        { _id: { $in: studentIds } },
        { _id: 1, shortName: 1 }
      ).lean();

      const shortNameMap = {};
      for (const st of students) {
        if (st.shortName) {
          shortNameMap[st._id.toString()] = st.shortName;
        }
      }

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
            message += `* ${sch.time} | ${sch.student} \n`;
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
  }, { timezone: 'Asia/Jakarta' });
};

module.exports = initDailyRecapJob;
