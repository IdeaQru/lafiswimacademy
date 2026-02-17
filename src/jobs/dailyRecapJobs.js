const cron = require('node-cron');
const Schedule = require('../models/Schedule');
const whatsappService = require('../services/whatsappService');

const initDailyRecapJob = () => {
  console.log('🕒 Daily Recap Job initialized (Schedule: 06:00 AM)');

  cron.schedule('0 6 * * *', async () => {
    console.log('🔄 Running Daily Schedule Recap...');

    try {
      const coachRecaps = await Schedule.getDailyRecap();

      if (!coachRecaps || coachRecaps.length === 0) {
        console.log('ℹ️ Tidak ada jadwal untuk hari ini. Job selesai.');
        return;
      }

      console.log(`📨 Mengirim jadwal ke ${coachRecaps.length} pelatih...`);

      for (const recap of coachRecaps) {
        // ✅ FIX: Validasi nomor HP — log warning tapi jangan crash
        if (!recap.coachPhone) {
          console.warn(`⚠️ Skip Coach ${recap.coachName || 'Unknown'}: Tidak ada nomor HP`);
          continue;
        }

        if (!recap.schedules || recap.schedules.length === 0) {
          console.log(`⚠️ Skip Coach ${recap.coachName || 'Unknown'}: Jadwal kosong.`);
          continue;
        }

        // ✅ FIX: Null guard di semua field pesan
        let message = `*📅 JADWAL MENGAJAR HARI INI*\n`;
        message += `Halo Coach *${recap.coachName || '-'}*, berikut jadwal Anda:\n\n`;

        recap.schedules.forEach((sch, index) => {
          message += `${index + 1}. *${sch.time || '-'}*\n`;
          message += `   👤 Siswa: ${sch.student || '-'}\n`;
          message += `   🏷️ Kategori: ${sch.category || '-'}\n`;
          message += `   📍 Lokasi: ${sch.location || '-'}\n\n`;
        });

        message += `Total: ${recap.totalClasses || 0} Sesi. Semangat! 💪`;

        await whatsappService.sendMessage(
          recap.coachPhone,
          message,
          'reminder',
          null,
          { recipientName: recap.coachName || 'Coach' }
        );

        await new Promise(r => setTimeout(r, 2000));
      }

      console.log('✅ Daily Recap selesai dikirim.');

    } catch (error) {
      console.error('❌ Error sending daily recap:', error);
    }
  }, {
    timezone: "Asia/Jakarta"
  });
};

module.exports = initDailyRecapJob;
