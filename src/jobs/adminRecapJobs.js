const cron = require('node-cron');
const Schedule = require('../models/Schedule');
const whatsappService = require('../services/whatsappService');

const ADMIN_PHONE = '+62 821-4004-4677';

// Helper: Senin awal minggu
function startOfWeekMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

// Helper: Minggu akhir minggu
function endOfWeekSunday(d) {
  const startMon = startOfWeekMonday(d);
  const endSun = new Date(startMon);
  endSun.setDate(endSun.getDate() + 6);
  endSun.setHours(23, 59, 59, 999);
  return endSun;
}

// Helper: Rentang tanggal (misal: "16-22 FEBRUARI 2026")
function getDateRangeText(start, end) {
  const months = [
    'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
    'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
  ];
  const startDay = start.getDate();
  const endDay = end.getDate();
  const month = months[end.getMonth()];
  const year = end.getFullYear();
  return `${startDay}-${endDay} ${month} ${year}`;
}

// Helper: Nama hari Indonesia
function getDayName(date) {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[new Date(date).getDay()];
}

// Helper: Format nama coach
function formatCoachNames(coaches) {
  if (!coaches || coaches.length === 0) return '-';
  return coaches.filter(Boolean).join(', ');
}

// Helper: Format nama siswa / group
function formatStudentLabel(students, groupName) {
  if (groupName) return groupName;
  if (!students || students.length === 0) return '-';
  return students.filter(Boolean).join(', ');
}

// Build pesan admin: dikelompokkan per HARI, tiap baris = waktu | siswa | coach
function buildAdminRecapMessage(title, schedulesByDate) {
  let msg = `*${title}*\n\n`;

  const sortedDates = Object.keys(schedulesByDate).sort((a, b) => new Date(a) - new Date(b));

  for (const dateStr of sortedDates) {
    const schedules = schedulesByDate[dateStr];
    if (!schedules || schedules.length === 0) continue;

    msg += `*${getDayName(dateStr)}*\n`;

    // Sort by startTime
    const sorted = schedules.slice().sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

    for (const sch of sorted) {
      const time = (sch.startTime || '??:??').substring(0, 5);
      const student = formatStudentLabel(sch.studentNames, sch.groupName);
      const coaches = formatCoachNames(sch.coachNames);
      msg += `* ${time} | ${student} | ${coaches}\n`;
    }

    msg += '\n';
  }

  return msg.trim();
}

// Chunk text agar tidak melebihi batas karakter WA
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
  // ============================
  // DAILY ADMIN RECAP
  // Setiap hari jam 06:00 (skip Senin, karena Senin = weekly)
  // ============================
  cron.schedule('0 6 * * *', async () => {
    try {
      const now = new Date();
      if (now.getDay() === 1) return; // Skip Senin

      const rawSchedules = await Schedule.getAdminRecapByRange(now, now);

      if (!rawSchedules || rawSchedules.length === 0) return;

      // Group by date
      const schedulesByDate = {};
      for (const sch of rawSchedules) {
        const dateKey = new Date(sch.date).toISOString().split('T')[0];
        if (!schedulesByDate[dateKey]) schedulesByDate[dateKey] = [];
        schedulesByDate[dateKey].push(sch);
      }

      const dateText = getDateRangeText(now, now);
      const title = `📅 REKAP ${dateText} (HARI INI) SEMUA COACH`;
      const message = buildAdminRecapMessage(title, schedulesByDate);

      for (const part of chunkText(message)) {
        await whatsappService.sendMessage(ADMIN_PHONE, part, 'info', null, { recipientName: 'ADMIN' });
        await new Promise(r => setTimeout(r, 1500));
      }
    } catch (error) {
      console.error('❌ Error sending daily admin recap:', error);
    }
  }, { timezone: 'Asia/Jakarta' });

  // ============================
  // WEEKLY ADMIN RECAP
  // Setiap Senin jam 06:00
  // ============================
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

      // Group by date
      const schedulesByDate = {};
      for (const sch of rawSchedules) {
        const dateKey = new Date(sch.date).toISOString().split('T')[0];
        if (!schedulesByDate[dateKey]) schedulesByDate[dateKey] = [];
        schedulesByDate[dateKey].push(sch);
      }

      const dateText = getDateRangeText(start, end);
      const title = `🗓️ REKAP ${dateText} (SENIN–MINGGU) SEMUA COACH`;
      const message = buildAdminRecapMessage(title, schedulesByDate);

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
