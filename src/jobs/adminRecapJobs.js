const cron = require('node-cron');
const Schedule = require('../models/Schedule');
const whatsappService = require('../services/whatsappService');

const ADMIN_PHONE = '+62 821-4004-4677';

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

function getDateRangeText(start, end) {
  const months = [
    'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
    'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
  ];
  return `${start.getDate()}-${end.getDate()} ${months[end.getMonth()]} ${end.getFullYear()}`;
}

function getDayName(date) {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[new Date(date).getDay()];
}

/**
 * Format admin recap message.
 * Output per hari: * JAM_AWAL | NAMA_SISWA | NAMA_COACH
 * Tanpa kategori, tanpa jam akhir.
 */
function buildAdminRecapMessage(title, schedulesByDate) {
  let msg = `*${title}*\n\n`;

  const sortedDates = Object.keys(schedulesByDate).sort((a, b) => new Date(a) - new Date(b));

  for (const dateStr of sortedDates) {
    const schedules = schedulesByDate[dateStr];
    if (!schedules || schedules.length === 0) continue;

    msg += `*${getDayName(dateStr)}*\n`;

    const sorted = schedules.slice().sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

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

/**
 * Transform raw schedule document → flat admin recap item.
 * Handles private / semiPrivate / group correctly based on actual schema:
 *   - private:     coachName (root), studentName (root)
 *   - semiPrivate: coachName (root), students[] array
 *   - group:       coaches[] array, students[] array, groupName
 */
function transformForAdmin(sch) {
  let studentLabel = '-';
  let coachLabel = '-';

  if (sch.scheduleType === 'private') {
    // Private: nama siswa dan coach langsung di root
    studentLabel = sch.studentName || '-';
    coachLabel = sch.coachName || '-';

  } else if (sch.scheduleType === 'semiPrivate') {
    // Semi Private: coach di root, siswa di students[] array
    const names = (sch.students || [])
      .map(s => s.fullName)
      .filter(Boolean);
    studentLabel = names.length > 0 ? names.join(', ') : '-';
    coachLabel = sch.coachName || '-';

  } else if (sch.scheduleType === 'group') {
    // Group: coach di coaches[] array, siswa di students[] array
    const studentNames = (sch.students || [])
      .map(s => s.fullName)
      .filter(Boolean);
    studentLabel = studentNames.length > 0
      ? studentNames.join(', ')
      : (sch.groupName || '-');

    const coachNames = (sch.coaches || [])
      .map(c => c.fullName)
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

/**
 * Fetch schedules dan transform untuk admin recap
 */
async function getAdminRecapData(startDate, endDate) {
  const start = new Date(startDate); start.setHours(0, 0, 0, 0);
  const end = new Date(endDate); end.setHours(23, 59, 59, 999);

  const schedules = await Schedule.find({
    date: { $gte: start, $lte: end },
    status: 'scheduled'
  }).sort({ date: 1, startTime: 1 }).lean();

  if (!schedules || schedules.length === 0) return null;

  // Transform & group by date
  const schedulesByDate = {};
  for (const sch of schedules) {
    const item = transformForAdmin(sch);
    const dateKey = new Date(item.date).toISOString().split('T')[0];
    if (!schedulesByDate[dateKey]) schedulesByDate[dateKey] = [];
    schedulesByDate[dateKey].push(item);
  }

  return schedulesByDate;
}

function initAdminRecapJob() {
  // DAILY ADMIN RECAP — setiap hari jam 06:00 (skip Senin)
  cron.schedule('0 6 * * *', async () => {
    try {
      const now = new Date();
      if (now.getDay() === 1) return;

      const schedulesByDate = await getAdminRecapData(now, now);
      if (!schedulesByDate) return;

      const dateText = getDateRangeText(now, now);
      const message = buildAdminRecapMessage(
        `📅 REKAP ${dateText} (HARI INI) SEMUA COACH`,
        schedulesByDate
      );

      for (const part of chunkText(message)) {
        await whatsappService.sendMessage(ADMIN_PHONE, part, 'info', null, { recipientName: 'ADMIN' });
        await new Promise(r => setTimeout(r, 1500));
      }
    } catch (error) {
      console.error('❌ Error sending daily admin recap:', error);
    }
  }, { timezone: 'Asia/Jakarta' });

  // WEEKLY ADMIN RECAP — setiap Senin jam 06:00
  cron.schedule('0 6 * * 1', async () => {
    console.log('🔄 Running Weekly Admin Recap...');
    try {
      const now = new Date();
      const start = startOfWeekMonday(now);
      const end = endOfWeekSunday(now);

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
        await whatsappService.sendMessage(ADMIN_PHONE, part, 'info', null, { recipientName: 'ADMIN' });
        await new Promise(r => setTimeout(r, 1500));
      }
      console.log('✅ Weekly Admin Recap sent.');
    } catch (error) {
      console.error('❌ Error sending weekly admin recap:', error);
    }
  }, { timezone: 'Asia/Jakarta' });
}

module.exports = initAdminRecapJob;
