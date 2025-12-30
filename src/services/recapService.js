const Schedule = require('../models/Schedule');
const whatsappService = require('./whatsappService');

const ADMIN_PHONE = '+62 821-4004-4677'; // Ganti dengan nomor Admin Anda

// === HELPER FUNCTIONS ===
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

function buildAdminMessage(title, coachRecaps) {
  let msg = `*${title}*\n\n`;
  coachRecaps.sort((a,b) => (a.coachName||'').localeCompare(b.coachName||''));

  for (const c of coachRecaps) {
    msg += `*Coach: ${c.coachName || '-'}*\n`;
    const schedules = (c.schedules || []).slice().sort((x,y) => (x.time||'').localeCompare(y.time||''));
    for (const s of schedules) {
      // Tambahkan Hari agar Admin tau hari apa jadwalnya (khusus weekly)
      const dayName = s.date ? new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(new Date(s.date)) : '';
      const timeStr = dayName ? `${dayName}, ${s.time}` : s.time;
      
      msg += `- ${timeStr} | ${s.location} | ${formatStudents(s.students, s.groupName)} | ${s.category}\n`;
    }
    msg += '\n';
  }
  return msg.trim();
}

/**
 * FUNGSI UTAMA: Kirim Rekap (Daily / Weekly) ke Coach & Admin
 * @param {string} type - 'daily' atau 'weekly'
 */
const sendRecap = async (type) => {
  console.log(`🔄 Running ${type.toUpperCase()} Recap Logic...`);
  const now = new Date();
  
  // 1. Tentukan Range Waktu Berdasarkan Tipe
  let start, end, adminTitle, coachTitle;
  
  if (type === 'weekly') {
    start = startOfWeekMonday(now);
    end = endOfWeekSunday(now);
    adminTitle = '🗓️ REKAP 1 MINGGU (SENIN–MINGGU) SEMUA COACH';
    coachTitle = '🗓️ JADWAL ANDA MINGGU INI';
  } else {
    // Default: Daily
    start = now; // Hari ini
    end = now;
    adminTitle = '📅 REKAP HARIAN (SEMUA COACH)';
    coachTitle = '📅 JADWAL MENGAJAR HARI INI';
  }

  try {
    // 2. Ambil Data (Gunakan fungsi range agar fleksibel untuk daily/weekly)
    const coachRecaps = await Schedule.getCoachRecapByRange(start, end);

    if (!coachRecaps || coachRecaps.length === 0) {
      console.log(`ℹ️ Tidak ada jadwal untuk periode ${type}.`);
      return { status: 'no_data', message: `Tidak ada jadwal ${type}.` };
    }

    console.log(`📨 Mengirim rekap ke ${coachRecaps.length} pelatih & 1 Admin...`);

    // ==========================================
    // STEP A: KIRIM KE ADMIN (Rekap Semua)
    // ==========================================
    const adminMsg = buildAdminMessage(adminTitle, coachRecaps);
    const adminChunks = chunkText(adminMsg);
    
    for (const part of adminChunks) {
      await whatsappService.sendMessage(ADMIN_PHONE, part, `manual`, null, { recipientName: 'ADMIN' });
      await new Promise(r => setTimeout(r, 1500)); // Jeda
    }
    console.log(`✅ ${type} recap sent to ADMIN.`);

    // ==========================================
    // STEP B: KIRIM KE MASING-MASING COACH
    // ==========================================
    let coachSentCount = 0;
    
    for (const recap of coachRecaps) {
      if (!recap.coachPhone) {
        console.warn(`⚠️ Skip Coach ${recap.coachName}: Tidak ada nomor HP`);
        continue;
      }

      let msg = `*${coachTitle}*\n`;
      msg += `Halo Coach *${recap.coachName}*, berikut jadwal Anda:\n\n`;

      // Sort jadwal per coach
      const sortedSchedules = (recap.schedules || []).sort((a,b) => {
         // Sort by date then time
         if(a.date !== b.date) return new Date(a.date) - new Date(b.date);
         return (a.time||'').localeCompare(b.time||'');
      });

      sortedSchedules.forEach((sch, index) => {
        // Tampilkan hari jika Weekly
        const dayLabel = type === 'weekly' 
          ? ` (${new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(new Date(sch.date))})` 
          : '';

        msg += `${index + 1}. *${sch.time}*${dayLabel}\n`;
        msg += `   👤 Siswa: ${formatStudents(sch.students, sch.groupName)}\n`; // Gunakan helper yang sama
        msg += `   🏷️ Kategori: ${sch.category}\n`;
        msg += `   📍 Lokasi: ${sch.location}\n\n`;
      });

      msg += `Total: ${sortedSchedules.length} Sesi. Semangat! 💪`;

      await whatsappService.sendMessage(
        recap.coachPhone,
        msg,
        `manual`,
        null,
        { recipientName: recap.coachName }
      );
      
      coachSentCount++;
      await new Promise(r => setTimeout(r, 2000)); // Jeda antar coach
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
