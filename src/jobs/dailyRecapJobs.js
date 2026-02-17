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

const initDailyRecapJob = () => {
  console.log('🕒 Daily Recap Job initialized (Schedule: Senin 06:00 AM)');

  // Kirim rekap mingguan ke masing-masing coach setiap Senin 06:00
  cron.schedule('0 6 * * 1', async () => {
    console.log('🔄 Running Weekly Coach Recap...');

    try {
      const now = new Date();
      const weekStart = startOfWeekMonday(now);
      const weekEnd = endOfWeekSaturday(now);

      const coachRecaps = await Schedule.getCoachWeeklyRecap(weekStart, weekEnd);

      if (!coachRecaps || coachRecaps.length === 0) {
        console.log('ℹ️ Tidak ada jadwal minggu ini. Job selesai.');
        return;
      }

      const dateRange = getDateRangeText(weekStart, weekEnd);
      console.log(`📨 Mengirim jadwal mingguan ke ${coachRecaps.length} pelatih...`);

      for (const recap of coachRecaps) {
        if (!recap.coachPhone) {
          console.warn(`⚠️ Skip Coach ${recap.coachName || 'Unknown'}: Tidak ada nomor HP`);
          continue;
        }

        if (!recap.schedulesByDay || recap.schedulesByDay.length === 0) {
          console.log(`⚠️ Skip Coach ${recap.coachName || 'Unknown'}: Jadwal kosong.`);
          continue;
        }

        let message = `*JADWAL ANDA  MINGGU INI ${dateRange}*\n`;
        message += `Halo Coach *${recap.coachName || '-'}*, berikut jadwal Anda:\n\n`;

        for (const day of recap.schedulesByDay) {
          message += `*${day.dayName}*\n`;
          for (const sch of day.schedules) {
            message += `* ${sch.time || '-'} | ${sch.student || '-'} | ${sch.category || '-'}\n`;
          }
          message += '\n';
        }

        await whatsappService.sendMessage(
          recap.coachPhone,
          message.trim(),
          'reminder',
          null,
          { recipientName: recap.coachName || 'Coach' }
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
