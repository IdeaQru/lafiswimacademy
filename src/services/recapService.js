// backend/src/services/recapService.js
const Schedule = require('../models/Schedule');
const Student = require('../models/Student');
const whatsappService = require('./whatsappService');

const ADMIN_PHONE = '+62 811-359-0718';
const TZ = 'Asia/Jakarta';
const TZ_OFFSET = '+07:00';

// ======================== TIMEZONE HELPERS ========================

/**
 * Ambil bagian tanggal (YYYY, MM, DD, dayOfWeek) di zona Asia/Jakarta
 */
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
  // map.year = "2026", map.month = "02", map.day = "18", map.weekday = "Wed"
  return map;
}

/**
 * Bikin Date object dari tanggal lokal Jakarta
 * dateStr format: "YYYY-MM-DD", jam: "HH:MM:SS" atau "HH:MM:SS.mmm"
 */
function jakartaDate(dateStr, time = '00:00:00') {
  return new Date(`${dateStr}T${time}${TZ_OFFSET}`);
}

/**
 * Konversi Date → string "YYYY-MM-DD" di zona Jakarta
 */
function toJakartaDateStr(d) {
  const p = getJakartaParts(d);
  return `${p.year}-${p.month}-${p.day}`;
}

/**
 * Ambil hari ini di Jakarta → { start: Date, end: Date }
 */
function getTodayRangeJakarta(baseDate = new Date()) {
  const ds = toJakartaDateStr(baseDate);
  return {
    start: jakartaDate(ds, '00:00:00'),
    end:   jakartaDate(ds, '23:59:59.999')
  };
}

/**
 * Ambil awal minggu (Senin) di Jakarta
 */
function startOfWeekMondayJakarta(baseDate = new Date()) {
  const p = getJakartaParts(baseDate);
  const d = new Date(`${p.year}-${p.month}-${p.day}T12:00:00${TZ_OFFSET}`);
  const dow = d.getDay(); // 0=Sun
  const diff = (dow === 0 ? -6 : 1 - dow);
  d.setDate(d.getDate() + diff);
  return jakartaDate(toJakartaDateStr(d), '00:00:00');
}

/**
 * Ambil akhir minggu (Minggu) di Jakarta
 */
function endOfWeekSundayJakarta(baseDate = new Date()) {
  const mon = startOfWeekMondayJakarta(baseDate);
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);
  return jakartaDate(toJakartaDateStr(sun), '23:59:59.999');
}

/**
 * Nama hari Indonesia dari Date object (di zona Jakarta)
 */
function getDayName(d) {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const p = getJakartaParts(new Date(d));
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return days[weekdayMap[p.weekday]] || '-';
}

/**
 * Nama hari Indonesia dari dateKey string "YYYY-MM-DD"
 * Penting: parse sebagai Jakarta, bukan UTC
 */
function getDayNameFromKey(dateKey) {
  const d = jakartaDate(dateKey, '12:00:00');
  return getDayName(d);
}

// ======================== LABEL HELPERS ========================

function getStudentLabel(schedule, shortNameMap) {
  if (schedule.scheduleType === 'private') {
    const sid =
      schedule.studentId?._id?.toString() ||
      schedule.studentId?.toString();
    const short = sid ? shortNameMap[sid] : null;
    if (short) return short;
    return schedule.studentId?.fullName || schedule.studentName || '-';
  }

  const names = (schedule.students || []).map(s => {
    const id = s._id?.toString();
    const short = id ? shortNameMap[id] : null;
    return short || s.fullName || s.studentName;
  }).filter(Boolean);

  if (names.length > 0) return names.join(', ');
  return schedule.groupName || '-';
}

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

// ======================== ADMIN RECAP ========================

function buildAdminMessage(title, schedules, shortNameMap) {
  let msg = `*${title}*\n\n`;

  // Group by date (pakai Jakarta dateKey)
  const byDate = {};
  for (const sch of schedules) {
    const dateKey = toJakartaDateStr(new Date(sch.date));
    if (!byDate[dateKey]) byDate[dateKey] = [];
    byDate[dateKey].push(sch);
  }

  const sortedDates = Object.keys(byDate).sort();

  for (const dateStr of sortedDates) {
    const list = byDate[dateStr];
    if (!list.length) continue;

    msg += `*${getDayNameFromKey(dateStr)}*\n`;

    list.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

    for (const sch of list) {
      const time = (sch.startTime || '??:??').substring(0, 5);
      const student = getStudentLabel(sch, shortNameMap);
      let coachLabel = '-';

      if (sch.scheduleType === 'private') {
        coachLabel = sch.coachId?.fullName || sch.coachName || '-';
      } else {
        const coachNames = (sch.coaches || [])
          .map(c => c.fullName || c.coachName)
          .filter(Boolean);
        coachLabel = coachNames.length ? coachNames.join(', ') : '-';
      }

      msg += `* ${time} | ${student} | ${coachLabel}\n`;
    }
    msg += '\n';
  }

  return msg.trim();
}

// ======================== COACH RECAP ========================

function buildCoachRecaps(schedules, shortNameMap) {
  const coachMap = {};

  for (const sch of schedules) {
    const dateStr = toJakartaDateStr(new Date(sch.date));
    const dayName = getDayNameFromKey(dateStr);
    const timeRange = `${sch.startTime || '??:??'} - ${sch.endTime || '??:??'}`;
    const student = getStudentLabel(sch, shortNameMap);
    const category = getCategoryLabel(sch);

    const entry = {
      dateStr,
      dayName,
      time: timeRange,
      student,
      category,
      startTime: sch.startTime || '00:00',
      location: sch.location || 'Kolam Utama'
    };

    if (sch.scheduleType === 'private') {
      const coachName = sch.coachId?.fullName || sch.coachName || 'Coach';
      const coachPhone = sch.coachId?.phone || sch.coachPhone || null;
      const coachKey =
        sch.coachId?._id?.toString() ||
        sch.coachId?.toString() ||
        coachName;

      if (!coachMap[coachKey]) {
        coachMap[coachKey] = { coachName, coachPhone, schedules: [] };
      }
      if (coachPhone && !coachMap[coachKey].coachPhone) {
        coachMap[coachKey].coachPhone = coachPhone;
      }
      coachMap[coachKey].schedules.push(entry);

    } else if (sch.scheduleType === 'group' || sch.scheduleType === 'semiPrivate') {
      const coaches = sch.coaches || [];
      if (!coaches.length) continue;

      for (const coach of coaches) {
        const coachName = coach.fullName || coach.coachName || 'Coach';
        const coachPhone = coach.phone || null;
        const coachKey = coach._id?.toString() || coachName;

        if (!coachMap[coachKey]) {
          coachMap[coachKey] = { coachName, coachPhone, schedules: [] };
        }
        if (coachPhone && !coachMap[coachKey].coachPhone) {
          coachMap[coachKey].coachPhone = coachPhone;
        }
        coachMap[coachKey].schedules.push(entry);
      }
    }
  }

  const result = Object.values(coachMap).map(coach => {
    coach.schedules.sort((a, b) => {
      if (a.dateStr !== b.dateStr) return a.dateStr.localeCompare(b.dateStr);
      return a.startTime.localeCompare(b.startTime);
    });
    return coach;
  });

  result.sort((a, b) => (a.coachName || '').localeCompare(b.coachName || ''));
  return result;
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

  const studentIds = Array.from(studentIdsSet);
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
  return shortNameMap;
}

// ======================== FUNGSI UTAMA ========================

const sendRecap = async (type) => {
  console.log(`🔄 Running ${type.toUpperCase()} Recap Logic...`);
  const now = new Date();

  let start, end, adminTitle, coachTitle, isWeekly;

  if (type === 'weekly') {
    start = startOfWeekMondayJakarta(now);
    end = endOfWeekSundayJakarta(now);
    adminTitle = '🗓️ REKAP 1 MINGGU (SENIN–MINGGU) SEMUA COACH';
    coachTitle = '🗓️ JADWAL ANDA MINGGU INI';
    isWeekly = true;
  } else {
    const range = getTodayRangeJakarta(now);
    start = range.start;
    end = range.end;

    // Tampilkan tanggal lokal di judul supaya jelas
    const localDateText = new Intl.DateTimeFormat('id-ID', {
      timeZone: TZ,
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(now);

    adminTitle = `📅 REKAP HARIAN ${localDateText} (SEMUA COACH)`;
    coachTitle = `📅 JADWAL MENGAJAR HARI INI (${localDateText})`;
    isWeekly = false;
  }

  // Debug log
  console.log(`📆 Range: ${start.toISOString()} → ${end.toISOString()}`);

  try {
    const schedules = await Schedule.find({
      date: { $gte: start, $lte: end },
      status: 'scheduled'
    })
      .sort({ date: 1, startTime: 1 })
      .populate('studentId', '_id fullName')
      .populate('coachId', '_id fullName phone')
      .populate('students', '_id fullName')
      .populate('coaches', '_id fullName phone')
      .lean();

    if (!schedules || schedules.length === 0) {
      console.log(`ℹ️ Tidak ada jadwal untuk periode ${type}.`);
      return { status: 'no_data', message: `Tidak ada jadwal ${type}.` };
    }

    const shortNameMap = await buildShortNameMap(schedules);

    // ===== ADMIN =====
    const adminMsg = buildAdminMessage(adminTitle, schedules, shortNameMap);
    for (const part of chunkText(adminMsg)) {
      await whatsappService.sendMessage(
        ADMIN_PHONE, part, 'manual', null, { recipientName: 'ADMIN' }
      );
      await new Promise(r => setTimeout(r, 1500));
    }
    console.log(`✅ ${type} recap sent to ADMIN.`);

    // ===== COACH =====
    const coachRecaps = buildCoachRecaps(schedules, shortNameMap);
    let coachSentCount = 0;

    for (const recap of coachRecaps) {
      if (!recap.coachPhone) {
        console.warn(`⚠️ Skip Coach ${recap.coachName}: Tidak ada nomor HP`);
        continue;
      }

      let msg = `*${coachTitle}*\n`;
      if (isWeekly) {
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
        recap.coachPhone, msg, 'manual', null, { recipientName: recap.coachName }
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

module.exports = { sendRecap };
