// backend/src/services/recapService.js
const Schedule = require('../models/Schedule');
const whatsappService = require('./whatsappService');

const ADMIN_PHONE = '+62 821-4004-4677';

// === HELPER FUNCTIONS ===
function startOfWeekMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfWeekSunday(d) {
  const startMon = startOfWeekMonday(d);
  const endSun = new Date(startMon);
  endSun.setDate(endSun.getDate() + 6);
  endSun.setHours(23, 59, 59, 999);
  return endSun;
}

// Nama hari Indonesia
function getDayName(date) {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[new Date(date).getDay()];
}

// Ambil label siswa sesuai scheduleType
function getStudentLabel(schedule) {
  if (schedule.scheduleType === 'private') {
    return schedule.studentName || '-';
  }

  const names = (schedule.students || [])
    .map(s => s.fullName)
    .filter(Boolean);

  if (names.length > 0) return names.join(', ');
  return schedule.groupName || '-';
}

// Ambil label kategori (fallback simple)
function getCategoryLabel(schedule) {
  if (schedule.programCategory) return schedule.programCategory;
  if (schedule.scheduleType === 'private') return 'Private';
  if (schedule.scheduleType === 'semiPrivate') return 'Semi Private';
  return 'Group Class';
}

function chunkText(text, maxLen = 55000) {
  const chunks = [];
  let buf = '';
  for (const line of text.split('\n')) {
    if ((buf + '\n' + line).length > maxLen) {
      chunks.push(buf);
      buf = line;
    } else {
      buf = buf ? (buf + '\n' + line) : line;
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

// ===================== ADMIN RECAP =====================
// Format admin message: per hari, per jam awal, siswa, coach
function buildAdminMessage(title, schedules) {
  let msg = `*${title}*\n\n`;

  // Group by date
  const byDate = {};
  for (const sch of schedules) {
    const dateKey = new Date(sch.date).toISOString().split('T')[0];
    if (!byDate[dateKey]) byDate[dateKey] = [];
    byDate[dateKey].push(sch);
  }

  const sortedDates = Object.keys(byDate).sort((a, b) => new Date(a) - new Date(b));

  for (const dateStr of sortedDates) {
    const list = byDate[dateStr];
    if (!list.length) continue;

    msg += `*${getDayName(dateStr)}*\n`;

    // sort by startTime
    list.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

    for (const sch of list) {
      const time = (sch.startTime || '??:??').substring(0, 5);
      const student = getStudentLabel(sch);
      let coachLabel = '-';

      if (sch.scheduleType === 'private' || sch.scheduleType === 'semiPrivate') {
        coachLabel = sch.coachName || '-';
      } else {
        const coachNames = (sch.coaches || [])
          .map(c => c.fullName)
          .filter(Boolean);
        coachLabel = coachNames.length ? coachNames.join(', ') : '-';
      }

      msg += `* ${time} | ${student} | ${coachLabel}\n`;
    }
    msg += '\n';
  }

  return msg.trim();
}

// ===================== COACH RECAP =====================
// Flatten jadwal → per coach, per hari
function buildCoachRecaps(schedules) {
  const coachMap = {};

  for (const sch of schedules) {
    const date = new Date(sch.date);
    const dateStr = date.toISOString().split('T')[0];
    const dayName = getDayName(date);
    const timeRange = `${sch.startTime || '??:??'} - ${sch.endTime || '??:??'}`;
    const student = getStudentLabel(sch);
    const category = getCategoryLabel(sch);

    const entry = {
      date,
      dateStr,
      dayName,
      time: timeRange,
      student,
      category,
      startTime: sch.startTime || '00:00',
      location: sch.location || 'Kolam Utama'
    };

    if (sch.scheduleType === 'private' || sch.scheduleType === 'semiPrivate') {
      // single coach di root
      const coachKey = sch.coachId?.toString() || sch.coachName || 'unknown';
      if (!coachMap[coachKey]) {
        coachMap[coachKey] = {
          coachName: sch.coachName || '-',
          coachPhone: sch.coachPhone || null,
          schedules: []
        };
      }
      if (sch.coachPhone && !coachMap[coachKey].coachPhone) {
        coachMap[coachKey].coachPhone = sch.coachPhone;
      }
      coachMap[coachKey].schedules.push(entry);
    } else if (sch.scheduleType === 'group') {
      // multiple coach di array
      const coaches = sch.coaches || [];
      if (!coaches.length) continue;

      for (const coach of coaches) {
        const coachKey = coach._id?.toString() || coach.fullName || 'unknown';
        if (!coachMap[coachKey]) {
          coachMap[coachKey] = {
            coachName: coach.fullName || '-',
            coachPhone: coach.phone || null,
            schedules: []
          };
        }
        if (coach.phone && !coachMap[coachKey].coachPhone) {
          coachMap[coachKey].coachPhone = coach.phone;
        }
        coachMap[coachKey].schedules.push(entry);
      }
    }
  }

  // sort schedules per coach
  const result = Object.values(coachMap).map(coach => {
    coach.schedules.sort((a, b) => {
      if (a.dateStr !== b.dateStr) return a.dateStr.localeCompare(b.dateStr);
      return a.startTime.localeCompare(b.startTime);
    });
    return coach;
  });

  // sort by coach name
  result.sort((a, b) => (a.coachName || '').localeCompare(b.coachName || ''));
  return result;
}

// ===================== FUNGSI UTAMA =====================
/**
 * Kirim Rekap (Daily / Weekly) ke Admin & Coach
 * @param {string} type - 'daily' atau 'weekly'
 */
const sendRecap = async (type) => {
  console.log(`🔄 Running ${type.toUpperCase()} Recap Logic...`);
  const now = new Date();

  let start, end, adminTitle, coachTitle, isWeekly;
  if (type === 'weekly') {
    start = startOfWeekMonday(now);
    end = endOfWeekSunday(now);
    adminTitle = '🗓️ REKAP 1 MINGGU (SENIN–MINGGU) SEMUA COACH';
    coachTitle = '🗓️ JADWAL ANDA MINGGU INI';
    isWeekly = true;
  } else {
    start = new Date(now); start.setHours(0,0,0,0);
    end = new Date(now);   end.setHours(23,59,59,999);
    adminTitle = '📅 REKAP HARIAN (SEMUA COACH)';
    coachTitle = '📅 JADWAL MENGAJAR HARI INI';
    isWeekly = false;
  }

  try {
    // Ambil data raw langsung dari Schedule (tanpa aggregate lama)
    const schedules = await Schedule.find({
      date: { $gte: start, $lte: end },
      status: 'scheduled'
    }).sort({ date: 1, startTime: 1 }).lean();

    if (!schedules || schedules.length === 0) {
      console.log(`ℹ️ Tidak ada jadwal untuk periode ${type}.`);
      return { status: 'no_data', message: `Tidak ada jadwal ${type}.` };
    }

    // ===== ADMIN =====
    const adminMsg = buildAdminMessage(adminTitle, schedules);
    for (const part of chunkText(adminMsg)) {
      await whatsappService.sendMessage(
        ADMIN_PHONE,
        part,
        'manual',
        null,
        { recipientName: 'ADMIN' }
      );
      await new Promise(r => setTimeout(r, 1500));
    }
    console.log(`✅ ${type} recap sent to ADMIN.`);

    // ===== COACH =====
    const coachRecaps = buildCoachRecaps(schedules);
    let coachSentCount = 0;

    for (const recap of coachRecaps) {
      if (!recap.coachPhone) {
        console.warn(`⚠️ Skip Coach ${recap.coachName}: Tidak ada nomor HP`);
        continue;
      }

      let msg = `*${coachTitle}*\n`;
      if (isWeekly) {
        const rangeText = `${start.getDate()}-${end.getDate()}`;
        msg = `*🗓️ JADWAL ANDA MINGGU INI*\n`;
        msg += `Halo Coach *${recap.coachName}*, berikut jadwal Anda:\n\n`;
      } else {
        msg += `Halo Coach *${recap.coachName}*, berikut jadwal Anda:\n\n`;
      }

      recap.schedules.forEach((sch, index) => {
        const dayLabel = isWeekly ? ` (${sch.dayName})` : '';
        msg += `${index + 1}. *${sch.time}*${dayLabel}\n`;
        msg += `   👤 Siswa: ${sch.student}\n`;
        msg += `   🏷️ Kategori: ${sch.category}\n`;
        msg += `   📍 Lokasi: ${sch.location}\n\n`;
      });

      msg += `Total: ${recap.schedules.length} Sesi. Semangat! 💪`;

      await whatsappService.sendMessage(
        recap.coachPhone,
        msg,
        'manual',
        null,
        { recipientName: recap.coachName }
      );

      coachSentCount++;
      await new Promise(r => setTimeout(r, 2000));
    }

    console.log(`✅ ${type} recap sent to ${coachSentCount} Coaches.`);
    return { status: 'success', sentCount: coachSentCount, type };

  } catch (error) {
    console.error(`❌ Error sending ${type} recap:`, error);
    throw error;
  }
};

module.exports = {
  sendRecap
};
