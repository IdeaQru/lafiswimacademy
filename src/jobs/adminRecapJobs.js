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
 * Build pesan admin recap:
 * Per HARI → per jadwal: * JAM_AWAL | NAMA_SISWA | NAMA_COACH
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
      const studentLabel = (sch.studentNames || []).filter(Boolean).join(', ') || '-';
      const coachLabel = (sch.coachNames || []).filter(Boolean).join(', ') || '-';

      msg += `* ${time} | ${studentLabel} | ${coachLabel}\n`;
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

function initAdminRecapJob() {
  // DAILY ADMIN RECAP (skip Senin)
  cron.schedule('0 6 * * *', async () => {
    try {
      const now = new Date();
      if (now.getDay() === 1) return;

      const rawSchedules = await Schedule.getAdminRecapByRange(now, now);
      if (!rawSchedules || rawSchedules.length === 0) return;

      const schedulesByDate = {};
      for (const sch of rawSchedules) {
        const dateKey = new Date(sch.date).toISOString().split('T')[0];
        if (!schedulesByDate[dateKey]) schedulesByDate[dateKey] = [];
        schedulesByDate[dateKey].push(sch);
      }

      const dateText = getDateRangeText(now, now);
      const message = buildAdminRecapMessage(`📅 REKAP ${dateText} (HARI INI) SEMUA COACH`, schedulesByDate);

      for (const part of chunkText(message)) {
        await whatsappService.sendMessage(ADMIN_PHONE, part, 'info', null, { recipientName: 'ADMIN' });
        await new Promise(r => setTimeout(r, 1500));
      }
    } catch (error) {
      console.error('❌ Error sending daily admin recap:', error);
    }
  }, { timezone: 'Asia/Jakarta' });

  // WEEKLY ADMIN RECAP (Senin 06:00)
  cron.schedule('0 6 * * 1', async () => {
    console.log('🔄 Running Weekly Admin Recap...');
    try {
      const now = new Date();
      const start = startOfWeekMonday(now);
      const end = endOfWeekSunday(now);

      const rawSchedules = await Schedule.getAdminRecapByRange(start, end);
      if (!rawSchedules || rawSchedules.length === 0) {
        console.log('ℹ️ Weekly Admin Recap: Data kosong. Skip.');
        return;
      }

      const schedulesByDate = {};
      for (const sch of rawSchedules) {
        const dateKey = new Date(sch.date).toISOString().split('T')[0];
        if (!schedulesByDate[dateKey]) schedulesByDate[dateKey] = [];
        schedulesByDate[dateKey].push(sch);
      }

      const dateText = getDateRangeText(start, end);
      const message = buildAdminRecapMessage(`🗓️ REKAP ${dateText} (SENIN–MINGGU) SEMUA COACH`, schedulesByDate);

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
