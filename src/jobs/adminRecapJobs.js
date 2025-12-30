const cron = require('node-cron');
const Schedule = require('../models/Schedule');
const whatsappService = require('../services/whatsappService');

const ADMIN_PHONE = '+62 821-4004-4677';

function startOfWeekMonday(d) {
  const date = new Date(d);
  const day = date.getDay(); 
  const diff = (day === 0 ? -6 : 1 - day);
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
  if (groupName) return `${groupName} (${(students?.length || 0)} siswa)`;
  return (students || []).map(s => s.fullName).filter(Boolean).join(', ') || '-';
}

function buildAdminMessage(title, coachRecaps) {
  let msg = `*${title}*\n\n`;
  coachRecaps.sort((a,b) => (a.coachName||'').localeCompare(b.coachName||''));

  for (const c of coachRecaps) {
    // SKIP DI MESSAGE JUGA: Jika coach ini tidak punya jadwal, jangan masukkan ke list pesan admin
    if (!c.schedules || c.schedules.length === 0) continue;

    msg += `*Coach: ${c.coachName || '-'}*\n`;
    const schedules = (c.schedules || []).slice().sort((x,y) => (x.time||'').localeCompare(y.time||''));
    for (const s of schedules) {
      msg += `- ${s.time} | ${s.location} | ${formatStudents(s.students, s.groupName)} | ${s.category}\n`;
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
  // DAILY recap (skip Monday biar tidak double dengan weekly, opsional)
  cron.schedule('0 6 * * *', async () => {
    const now = new Date();
    if (now.getDay() === 1) return; // Senin skip Daily Admin

    const coachRecaps = await Schedule.getCoachRecapByRange(now, now);
    
    // CEK DATA KOSONG
    if (!coachRecaps || coachRecaps.length === 0) return;

    // Filter coach aktif saja
    const activeCoaches = coachRecaps.filter(c => c.schedules && c.schedules.length > 0);
    if (activeCoaches.length === 0) return;

    const message = buildAdminMessage('📅 REKAP HARI INI (SEMUA COACH)', activeCoaches);
    for (const part of chunkText(message)) {
      // FIX ENUM: Pakai 'info'
      await whatsappService.sendMessage(ADMIN_PHONE, part, 'info', null, { recipientName: 'ADMIN' });
      await new Promise(r => setTimeout(r, 1500));
    }
  }, { timezone: 'Asia/Jakarta' });


  // WEEKLY recap setiap Senin 06:00
  cron.schedule('0 6 * * 1', async () => {
    console.log('🔄 Running Weekly Admin Recap...');
    const now = new Date();
    const start = startOfWeekMonday(now);
    const end = endOfWeekSunday(now);

    const coachRecaps = await Schedule.getCoachRecapByRange(start, end);
    
    // LOGIKA SENIN WEEKLY: Jika data kosong, STOP (Jangan kirim apa-apa).
    if (!coachRecaps || coachRecaps.length === 0) {
       console.log('ℹ️ Weekly Admin Recap: Data kosong. Skip.');
       return;
    }

    // Filter coach yang benar-benar punya jadwal minggu ini
    const activeCoaches = coachRecaps.filter(c => c.schedules && c.schedules.length > 0);
    
    // Jika setelah difilter ternyata kosong semua
    if (activeCoaches.length === 0) {
       console.log('ℹ️ Weekly Admin Recap: Tidak ada jadwal aktif minggu ini. Skip.');
       return;
    }

    const message = buildAdminMessage('🗓️ REKAP 1 MINGGU (SENIN–MINGGU)', activeCoaches);
    for (const part of chunkText(message)) {
      // FIX ENUM: Pakai 'info'
      await whatsappService.sendMessage(ADMIN_PHONE, part, 'info', null, { recipientName: 'ADMIN' });
      await new Promise(r => setTimeout(r, 1500));
    }
    console.log('✅ Weekly Admin Recap sent.');
  }, { timezone: 'Asia/Jakarta' });
}

module.exports = initAdminRecapJob;
