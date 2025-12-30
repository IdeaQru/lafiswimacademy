const cron = require('node-cron');
const Schedule = require('../models/Schedule');
const whatsappService = require('../services/whatsappService'); 

const initDailyRecapJob = () => {
  console.log('🕒 Daily Recap Job initialized (Schedule: 06:00 AM)');

  // Jadwal: Setiap hari jam 06:00
  cron.schedule('0 6 * * *', async () => {
    console.log('🔄 Running Daily Schedule Recap...');

    try {
      // 1. Ambil data Harian
      const coachRecaps = await Schedule.getDailyRecap();

      // CEK JADWAL KOSONG: Jika tidak ada sama sekali, stop.
      if (!coachRecaps || coachRecaps.length === 0) {
        console.log('ℹ️ Tidak ada jadwal untuk hari ini. Job selesai.');
        return;
      }

      console.log(`📨 Mengirim jadwal ke ${coachRecaps.length} pelatih...`);

      // 2. Loop setiap pelatih
      for (const recap of coachRecaps) {
        // Validasi nomor HP
        if (!recap.coachPhone) {
          console.warn(`⚠️ Skip Coach ${recap.coachName}: Tidak ada nomor HP`);
          continue;
        }

        // CEK KHUSUS PER COACH: Jika schedules array kosong, skip coach ini.
        if (!recap.schedules || recap.schedules.length === 0) {
          console.log(`⚠️ Skip Coach ${recap.coachName}: Jadwal kosong.`);
          continue;
        }

        // 3. Susun Pesan WhatsApp
        let message = `*📅 JADWAL MENGAJAR HARI INI*\n`;
        message += `Halo Coach *${recap.coachName}*, berikut jadwal Anda:\n\n`;

        recap.schedules.forEach((sch, index) => {
          message += `${index + 1}. *${sch.time}*\n`;
          message += `   👤 Siswa: ${sch.student}\n`;
          message += `   🏷️ Kategori: ${sch.category}\n`;
          message += `   📍 Lokasi: ${sch.location}\n\n`;
        });

        message += `Total: ${recap.totalClasses} Sesi. Semangat! 💪`;

        // 4. Kirim via WhatsApp Service
        // FIX ERROR ENUM: Gunakan 'reminder' (jangan pakai tipe aneh2)
        await whatsappService.sendMessage(
          recap.coachPhone,
          message,
          'reminder', 
          null,
          { recipientName: recap.coachName }
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
