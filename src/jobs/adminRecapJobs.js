// backend/src/jobs/adminRecapJobs.js
const cron = require('node-cron');
const Schedule = require('../models/Schedule');
const Student = require('../models/Student');
const whatsappService = require('../services/whatsappService');

const ADMIN_PHONE = '+62 811-359-0718';
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

function getTodayRangeJakarta(baseDate = new Date()) {
  const ds = toJakartaDateStr(baseDate);
  return {
    start: jakartaDate(ds, '00:00:00'),
    end:   jakartaDate(ds, '23:59:59.999')
  };
}

function startOfWeekMondayJakarta(baseDate = new Date()) {
  const p = getJakartaParts(baseDate);
  const d = new Date(`${p.year}-${p.month}-${p.day}T12:00:00${TZ_OFFSET}`);
  const dow = d.getDay();
  const diff = (dow === 0 ? -6 : 1 - dow);
  d.setDate(d.getDate() + diff);
  return jakartaDate(toJakartaDateStr(d), '00:00:00');
}

function endOfWeekSundayJakarta(baseDate = new Date()) {
  const mon = startOfWeekMondayJakarta(baseDate);
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);
  return jakartaDate(toJakartaDateStr(sun), '23:59:59.999');
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
    'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
    'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
  ];
  const sp = getJakartaParts(start);
  const ep = getJakartaParts(end);
  return `${parseInt(sp.day)}-${parseInt(ep.day)} ${months[parseInt(ep.month) - 1]} ${ep.year}`;
}

// ======================== MESSAGE BUILDERS ========================

function buildAdminRecapMessage(title, schedulesByDate) {
  let msg = `*${title}*\n\n`;

  const sortedDates = Object.keys(schedulesByDate).sort();

  for (const dateStr of sortedDates) {
    const schedules = schedulesByDate[dateStr];
    if (!schedules || schedules.length === 0) continue;

    msg += `*${getDayNameFromKey(dateStr)}*\n`;

    const sorted = schedules
      .slice()
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

    for (const sch of sorted) {
      const time = (sch.startTime || '??:??').substring(0, 5);
      msg += `* ${time} | ${sch.studentLabel} | ${sch.coachLabel}\n`;
    }

    msg += '\n';
  }

  return msg.trim();
}

function chunkText(text, maxLen = 50000) {
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

// ======================== TRANSFORM ========================

function transformForAdmin(sch, shortNameMap) {
  let studentLabel = '-';
  let coachLabel = '-';

  if (sch.scheduleType === 'private') {
    const sid = sch.studentId?._id?.toString() || sch.studentId?.toString();
    const short = sid ? shortNameMap[sid] : null;
    studentLabel = short || sch.studentId?.fullName || sch.studentName || '-';
    coachLabel = sch.coachId?.fullName || sch.coachName || '-';

  } else if (sch.scheduleType === 'group' || sch.scheduleType === 'semiPrivate') {
    const studentNames = (sch.students || [])
      .map(s => {
        const id = s._id?.toString();
        const short = id ? shortNameMap[id] : null;
        return short || s.fullName || s.studentName;
      })
      .filter(Boolean);
    studentLabel = studentNames.length > 0 ? studentNames.join(', ') : (sch.groupName || '-');

    const coachNames = (sch.coaches || [])
      .map(c => c.fullName || c.coachName)
      .filter(Boolean);
    coachLabel = coachNames.length > 0 ? coachNames.join(', ') : '-';
  }

  return {
    date: sch.date,
    startTime: sch.startTime || '??:??',
    studentLabel,
    coachLabel
  };
}

// ======================== DATA FETCHER ========================

async function getAdminRecapData(startDate, endDate) {
  const start = new Date(startDate);
  const end   = new Date(endDate);

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

  if (!schedules || schedules.length === 0) return null;

  // shortName map
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

  // Group by Jakarta dateKey
  const schedulesByDate = {};
  for (const sch of schedules) {
    const item = transformForAdmin(sch, shortNameMap);
    const dateKey = toJakartaDateStr(new Date(item.date));
    if (!schedulesByDate[dateKey]) schedulesByDate[dateKey] = [];
    schedulesByDate[dateKey].push(item);
  }

  return schedulesByDate;
}

// ======================== CRON JOBS ========================

function initAdminRecapJob() {
  // DAILY ADMIN RECAP — setiap hari jam 06:00 (skip Senin)
  cron.schedule('0 6 * * *', async () => {
    try {
      const now = new Date();
      const p = getJakartaParts(now);
      const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      if (weekdayMap[p.weekday] === 1) return; // skip Senin

      const { start, end } = getTodayRangeJakarta(now);

      const schedulesByDate = await getAdminRecapData(start, end);
      if (!schedulesByDate) return;

      const dateText = getDateRangeText(start, end);
      const message = buildAdminRecapMessage(
        `📅 REKAP ${dateText} (HARI INI) SEMUA COACH`,
        schedulesByDate
      );

      for (const part of chunkText(message)) {
        await whatsappService.sendMessage(
          ADMIN_PHONE, part, 'info', null, { recipientName: 'ADMIN' }
        );
        await new Promise(r => setTimeout(r, 1500));
      }
    } catch (error) {
      console.error('❌ Error sending daily admin recap:', error);
    }
  }, { timezone: TZ });

  // WEEKLY ADMIN RECAP — setiap Senin jam 06:00
  cron.schedule('0 6 * * 1', async () => {
    console.log('🔄 Running Weekly Admin Recap...');
    try {
      const now = new Date();
      const start = startOfWeekMondayJakarta(now);
      const end   = endOfWeekSundayJakarta(now);

      const schedulesByDate = await getAdminRecapData(start, end);
      if (!schedulesByDate) {
        console.log('ℹ️ Weekly Admin Recap: Data kosong. Skip.');
        return;
      }

      const dateText = getDateRangeText(start, end);
      const message = buildAdminRecapMessage(
        `🗓️ REKAP ${dateText} (SENIN–MINGGU) SEMUA COACH`,
        schedulesByDate
      );

      for (const part of chunkText(message)) {
        await whatsappService.sendMessage(
          ADMIN_PHONE, part, 'info', null, { recipientName: 'ADMIN' }
        );
        await new Promise(r => setTimeout(r, 1500));
      }
      console.log('✅ Weekly Admin Recap sent.');
    } catch (error) {
      console.error('❌ Error sending weekly admin recap:', error);
    }
  }, { timezone: TZ });
}

module.exports = initAdminRecapJob;
