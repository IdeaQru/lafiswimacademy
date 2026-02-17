const cron = require('node-cron');
const Schedule = require('../models/Schedule');
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
  return `${start.getDate()}-${end.getDate()} ${months[end.getMonth()]}  ${end.getFullYear()}`;
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

/**
 * Transform 1 schedule document → object untuk pesan coach.
 * Berdasarkan struktur schema yang benar:
 *   - private:     coachName/coachPhone (root), studentName (root)
 *   - semiPrivate: coachName/coachPhone (root), students[] array
 *   - group:       coaches[] array, students[] array
 */
function getStudentLabel(sch) {
  if (sch.scheduleType === 'private') {
    return sch.studentName || '-';
  }
  // semiPrivate & group: ambil dari students[] array
  const names = (sch.students || []).map(s => s.fullName).filter(Boolean);
  return names.length > 0 ? names.join(', ') : (sch.groupName || '-');
}

function getCategory(sch) {
  if (sch.programCategory) return sch.programCategory;
  if (sch.scheduleType === 'private') return 'Private';
  if (sch.scheduleType === 'semiPrivate') return 'Semi Private';
  return 'Group Class';
}

/**
 * Build coach weekly recap data dari raw schedules.
 * 
 * Karena semiPrivate punya coachId/coachName di root (1 coach),
 * sedangkan group punya coaches[] (multiple coach),
 * kita harus flatten per coach.
 */
function buildCoachRecaps(schedules) {
  // coachMap: { coachKey -> { coachName, coachPhone, dayMap: { dateStr -> [schedules] } } }
  const coachMap = {};

  for (const sch of schedules) {
    const dateStr = new Date(sch.date).toISOString().split('T')[0];
    const studentLabel = getStudentLabel(sch);
    const category = getCategory(sch);
    const time = `${sch.startTime || '??:??'} - ${sch.endTime || '??:??'}`;

    const entry = { time, student: studentLabel, category, startTime: sch.startTime || '00:00' };

    if (sch.scheduleType === 'private' || sch.scheduleType === 'semiPrivate') {
      // Private & SemiPrivate: coach di root level
      const coachKey = sch.coachId?.toString() || sch.coachName || 'unknown';
      if (!coachMap[coachKey]) {
        coachMap[coachKey] = {
          coachName: sch.coachName || '-',
          coachPhone: sch.coachPhone || null,
          dayMap: {}
        };
      }
      // Update phone jika ketemu yang valid
      if (sch.coachPhone && !coachMap[coachKey].coachPhone) {
        coachMap[coachKey].coachPhone = sch.coachPhone;
      }
      if (!coachMap[coachKey].dayMap[dateStr]) coachMap[coachKey].dayMap[dateStr] = [];
      coachMap[coachKey].dayMap[dateStr].push(entry);

    } else if (sch.scheduleType === 'group') {
      // Group: coaches di coaches[] array
      const coachList = sch.coaches || [];
      if (coachList.length === 0) continue; // skip jika tidak ada coach

      for (const coach of coachList) {
        const coachKey = coach._id?.toString() || coach.fullName || 'unknown';
        if (!coachMap[coachKey]) {
          coachMap[coachKey] = {
            coachName: coach.fullName || '-',
            coachPhone: coach.phone || null,
            dayMap: {}
          };
        }
        if (coach.phone && !coachMap[coachKey].coachPhone) {
          coachMap[coachKey].coachPhone = coach.phone;
        }
        if (!coachMap[coachKey].dayMap[dateStr]) coachMap[coachKey].dayMap[dateStr] = [];
        coachMap[coachKey].dayMap[dateStr].push(entry);
      }
    }
  }

  // Convert to array format
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

      // Fetch semua jadwal minggu ini (plain objects, no aggregation)
      const schedules = await Schedule.find({
        date: { $gte: weekStart, $lte: weekEnd },
        status: 'scheduled'
      }).sort({ date: 1, startTime: 1 }).lean();

      if (!schedules || schedules.length === 0) {
        console.log('ℹ️ Tidak ada jadwal minggu ini. Job selesai.');
        return;
      }

      const coachRecaps = buildCoachRecaps(schedules);
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

        let message = `*JADWAL ANDA  MINGGU INI ${dateRange}*\n`;
        message += `Halo Coach *${recap.coachName}*, berikut jadwal Anda:\n\n`;

        for (const day of recap.schedulesByDay) {
          message += `*${day.dayName}*\n`;
          for (const sch of day.schedules) {
            message += `* ${sch.time} | ${sch.student} | ${sch.category}\n`;
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
