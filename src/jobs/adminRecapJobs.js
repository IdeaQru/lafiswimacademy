const cron = require('node-cron');
const Schedule = require('../models/Schedule');
const whatsappService = require('../services/whatsappService');

const ADMIN_PHONE = '+62 821-4004-4677';

function startOfWeekMonday(d) {
  const date = new Date(d);
  const day = date.getDay(); // 0=Sun,1=Mon...
  const diff = (day === 0 ? -6 : 1 - day); // geser ke Monday
  date.setDate(date.getDate() + diff);
  date.setHours(0,0,0,0);
  return date;
}

function endOfWeekSunday(d) {
  const startMon = startOfWeekMonday(d);
  const endSun = new Date(startMon);
  endSun.setDate(endSun.getDate() + 6);
  endSun.setHours(23,59,59,999);
  return endSun;
}

function formatStudents(students, groupName) {
  // private -> students: [{fullName: 'DEMN2'}]
  // group  -> students: [{fullName:'A'},{fullName:'B'}]
  if (groupName) return `${groupName} (${(students?.length || 0)} siswa)`;
  return (students || []).map(s => s.fullName).filter(Boolean).join(', ') || '-';
}

function buildAdminMessage(title, coachRecaps) {
  let msg = `*${title}*\n\n`;
  // urutkan nama coach biar rapi
  coachRecaps.sort((a,b) => (a.coachName||'').localeCompare(b.coachName||''));

  for (const c of coachRecaps) {
    msg += `*Coach: ${c.coachName || '-'}*\n`;
    // urutkan jam (string HH:mm - HH:mm aman untuk sort lexicographic)
    const schedules = (c.schedules || []).slice().sort((x,y) => (x.time||'').localeCompare(y.time||''));
    for (const s of schedules) {
      msg += `- ${s.time} | ${s.location} | ${formatStudents(s.students, s.groupName)} | ${s.category}\n`;
    }
    msg += '\n';
  }

  return msg.trim();
}

// opsional: pecah kalau kepanjangan (WA kadang gagal kalau terlalu panjang)
function chunkText(text, maxLen = 55500) {
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
  // DAILY recap (skip Monday biar tidak double dengan weekly)
  cron.schedule('0 6 * * *', async () => {
    const now = new Date();
    if (now.getDay() === 1) return; // Senin skip

    const coachRecaps = await Schedule.getCoachRecapByRange(now, now);
    if (!coachRecaps.length) return;

    const message = buildAdminMessage('📅 REKAP HARI INI (SEMUA COACH)', coachRecaps);
    for (const part of chunkText(message)) {
      await whatsappService.sendMessage(ADMIN_PHONE, part, 'admin_daily', null, { recipientName: 'ADMIN' });
      await new Promise(r => setTimeout(r, 1500));
    }
  }, { timezone: 'Asia/Jakarta' });

  // WEEKLY recap setiap Senin 06:00 (Senin–Minggu minggu ini)
  cron.schedule('0 6 * * 1', async () => {
    const now = new Date();
    const start = startOfWeekMonday(now);
    const end = endOfWeekSunday(now);

    const coachRecaps = await Schedule.getCoachRecapByRange(start, end);
    if (!coachRecaps.length) return;

    const message = buildAdminMessage('🗓️ REKAP 1 MINGGU (SENIN–MINGGU) SEMUA COACH', coachRecaps);
    for (const part of chunkText(message)) {
      await whatsappService.sendMessage(ADMIN_PHONE, part, 'admin_weekly', null, { recipientName: 'ADMIN' });
      await new Promise(r => setTimeout(r, 1500));
    }
  }, { timezone: 'Asia/Jakarta' });
}

module.exports = initAdminRecapJob;
