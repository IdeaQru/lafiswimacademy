const cron = require('node-cron');
const Schedule = require('../models/Schedule');
const whatsappService = require('../services/whatsappService');

// ==========================================
// FORMAT PESAN REMINDER 24 JAM SEBELUMNYA
// ==========================================
const formatReminder24Hours = (schedule) => {
  const date = new Date(schedule.date);
  const formattedDate = date.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `👨‍🏫 *Pengingat Jadwal Mengajar (H-1) - Lafi Swimming Academy*

Halo Coach ${schedule.coachName}! 👋

Pengingat jadwal mengajar Anda *BESOK*:

📅 *Tanggal:* ${formattedDate}
⏰ *Waktu:* ${schedule.startTime} - ${schedule.endTime}
👨‍🎓 *Siswa:* ${schedule.studentName}
📱 *HP Siswa:* ${schedule.studentPhone}
🏊 *Program:* ${schedule.program}
📍 *Lokasi:* ${schedule.location}

Mohon persiapkan materi dan peralatan yang diperlukan.

Anda akan menerima pengingat lagi 1 jam sebelum jadwal.

Terima kasih! 💪
*Lafi Swimming Academy*
📱 WA: 0821-4004-4677`;
};

// ==========================================
// FORMAT PESAN REMINDER 1 JAM SEBELUMNYA
// ==========================================
const formatReminder1Hour = (schedule) => {
  const date = new Date(schedule.date);
  const formattedDate = date.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `⏰ *Pengingat Jadwal Mengajar (1 Jam Lagi!) - Lafi Swimming Academy*

Halo Coach ${schedule.coachName}! 👋

⚠️ *PENGINGAT: Jadwal mengajar Anda 1 JAM LAGI!*

📅 *Tanggal:* ${formattedDate}
⏰ *Waktu:* ${schedule.startTime} - ${schedule.endTime}
👨‍🎓 *Siswa:* ${schedule.studentName}
📱 *HP Siswa:* ${schedule.studentPhone}
🏊 *Program:* ${schedule.program}
📍 *Lokasi:* ${schedule.location}

Harap segera bersiap dan menuju lokasi.

Semangat mengajar! 💪
*Lafi Swimming Academy*
📱 WA: 0821-4004-4677`;
};

// ==========================================
// CRON JOB: REMINDER 24 JAM SEBELUMNYA
// Berjalan setiap jam (00:00, 01:00, 02:00, dst)
// ==========================================
const reminder24Hours = cron.schedule('0 * * * *', async () => {
  try {
    console.log('');
    console.log('='.repeat(60));
    console.log('🔔 [24H REMINDER] Starting 24-hour reminder job...');
    console.log('   Time:', new Date().toLocaleString('id-ID'));
    console.log('='.repeat(60));

    // Check WhatsApp status
    if (!whatsappService.isReady()) {
      console.log('⚠️  WhatsApp service is not ready');
      console.log('   Status:', whatsappService.status);
      console.log('   Skipping 24-hour reminder job');
      console.log('='.repeat(60));
      return;
    }

    console.log('✅ WhatsApp service is ready');

    // Calculate time window (24 hours from now ± 30 minutes)
    const now = new Date();
    const reminderTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const reminderTimeStart = new Date(reminderTime.getTime() - 30 * 60 * 1000);
    const reminderTimeEnd = new Date(reminderTime.getTime() + 30 * 60 * 1000);

    console.log('📊 Search parameters:');
    console.log('   Target time:', reminderTime.toLocaleString('id-ID'));
    console.log('   Window start:', reminderTimeStart.toLocaleString('id-ID'));
    console.log('   Window end:', reminderTimeEnd.toLocaleString('id-ID'));

    // Find schedules that need 24-hour reminder
    const schedules = await Schedule.find({
      date: {
        $gte: reminderTimeStart,
        $lte: reminderTimeEnd
      },
      reminderEnabled: true,
      reminderSent: false, // Belum pernah kirim reminder
      status: 'scheduled'
    });

    console.log(`📋 Found ${schedules.length} schedule(s) for 24-hour reminder`);

    if (schedules.length === 0) {
      console.log('   No schedules to process');
      console.log('='.repeat(60));
      return;
    }

    // Process each schedule
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < schedules.length; i++) {
      const schedule = schedules[i];
      
      console.log('');
      console.log(`📤 [${i + 1}/${schedules.length}] Processing schedule:`);
      console.log('   ID:', schedule._id);
      console.log('   Date:', new Date(schedule.date).toLocaleString('id-ID'));
      console.log('   Time:', `${schedule.startTime} - ${schedule.endTime}`);
      console.log('   Coach:', schedule.coachName);
      console.log('   Student:', schedule.studentName);

      try {
        // Validate coach phone
        if (!schedule.coachPhone) {
          console.log('   ⚠️  Coach phone not available');
          console.log('   Skipping...');
          failCount++;
          continue;
        }

        console.log('   Phone:', schedule.coachPhone);

        // Send WhatsApp message
        const message = formatReminder24Hours(schedule);
        await whatsappService.sendMessage(schedule.coachPhone, message);

        // Mark as sent
        schedule.reminderSent = true;
        schedule.reminderSentAt = new Date();
        await schedule.save();

        successCount++;
        console.log('   ✅ 24-hour reminder sent successfully');

        // Delay to avoid rate limiting
        if (i < schedules.length - 1) {
          console.log('   ⏳ Waiting 2 seconds before next message...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        failCount++;
        console.error('   ❌ Error sending reminder:');
        console.error('   ', error.message);
      }
    }

    // Summary
    console.log('');
    console.log('='.repeat(60));
    console.log('📊 24-HOUR REMINDER JOB SUMMARY:');
    console.log('   Total schedules:', schedules.length);
    console.log('   ✅ Success:', successCount);
    console.log('   ❌ Failed:', failCount);
    console.log('   Completed at:', new Date().toLocaleString('id-ID'));
    console.log('='.repeat(60));
    console.log('');

  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('❌ 24-HOUR REMINDER JOB ERROR:');
    console.error('   ', error.message);
    console.error('   Stack:', error.stack);
    console.error('='.repeat(60));
    console.error('');
  }
});

// ==========================================
// CRON JOB: REMINDER 1 JAM SEBELUMNYA
// Berjalan setiap 15 menit untuk akurasi lebih tinggi
// ==========================================
const reminder1Hour = cron.schedule('*/15 * * * *', async () => {
  try {
    console.log('');
    console.log('='.repeat(60));
    console.log('⏰ [1H REMINDER] Starting 1-hour reminder job...');
    console.log('   Time:', new Date().toLocaleString('id-ID'));
    console.log('='.repeat(60));

    // Check WhatsApp status
    if (!whatsappService.isReady()) {
      console.log('⚠️  WhatsApp service is not ready');
      console.log('   Status:', whatsappService.status);
      console.log('   Skipping 1-hour reminder job');
      console.log('='.repeat(60));
      return;
    }

    console.log('✅ WhatsApp service is ready');

    // Calculate time window (1 hour from now ± 10 minutes)
    const now = new Date();
    const reminderTime = new Date(now.getTime() + 60 * 60 * 1000);
    const reminderTimeStart = new Date(reminderTime.getTime() - 10 * 60 * 1000);
    const reminderTimeEnd = new Date(reminderTime.getTime() + 10 * 60 * 1000);

    console.log('📊 Search parameters:');
    console.log('   Target time:', reminderTime.toLocaleString('id-ID'));
    console.log('   Window start:', reminderTimeStart.toLocaleString('id-ID'));
    console.log('   Window end:', reminderTimeEnd.toLocaleString('id-ID'));

    // Find schedules that need 1-hour reminder
    const schedules = await Schedule.find({
      date: {
        $gte: reminderTimeStart,
        $lte: reminderTimeEnd
      },
      reminderEnabled: true,
      reminderSent: true, // Sudah kirim reminder 24 jam
      status: 'scheduled'
    });

    console.log(`📋 Found ${schedules.length} schedule(s) for 1-hour reminder`);

    if (schedules.length === 0) {
      console.log('   No schedules to process');
      console.log('='.repeat(60));
      return;
    }

    // Process each schedule
    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < schedules.length; i++) {
      const schedule = schedules[i];
      
      console.log('');
      console.log(`📤 [${i + 1}/${schedules.length}] Processing schedule:`);
      console.log('   ID:', schedule._id);
      console.log('   Date:', new Date(schedule.date).toLocaleString('id-ID'));
      console.log('   Time:', `${schedule.startTime} - ${schedule.endTime}`);
      console.log('   Coach:', schedule.coachName);
      console.log('   Student:', schedule.studentName);

      try {
        // Validate coach phone
        if (!schedule.coachPhone) {
          console.log('   ⚠️  Coach phone not available');
          console.log('   Skipping...');
          skippedCount++;
          continue;
        }

        // Check if 1-hour reminder already sent
        const reminderSentAt = new Date(schedule.reminderSentAt);
        const hoursSinceReminder = (now - reminderSentAt) / (1000 * 60 * 60);
        
        console.log('   First reminder sent:', reminderSentAt.toLocaleString('id-ID'));
        console.log('   Hours since first reminder:', hoursSinceReminder.toFixed(2));

        // Only send if between 22-25 hours since first reminder (untuk menghindari duplikat)
        if (hoursSinceReminder < 22 || hoursSinceReminder > 25) {
          console.log('   ⏭️  Not in 1-hour reminder window (need 22-25 hours gap)');
          console.log('   Skipping...');
          skippedCount++;
          continue;
        }

        console.log('   Phone:', schedule.coachPhone);

        // Send WhatsApp message
        const message = formatReminder1Hour(schedule);
        await whatsappService.sendMessage(schedule.coachPhone, message);

        // Update last reminder time
        schedule.reminderSentAt = new Date();
        await schedule.save();

        successCount++;
        console.log('   ✅ 1-hour reminder sent successfully');

        // Delay to avoid rate limiting
        if (i < schedules.length - 1) {
          console.log('   ⏳ Waiting 2 seconds before next message...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        failCount++;
        console.error('   ❌ Error sending reminder:');
        console.error('   ', error.message);
      }
    }

    // Summary
    console.log('');
    console.log('='.repeat(60));
    console.log('📊 1-HOUR REMINDER JOB SUMMARY:');
    console.log('   Total schedules:', schedules.length);
    console.log('   ✅ Success:', successCount);
    console.log('   ⏭️  Skipped:', skippedCount);
    console.log('   ❌ Failed:', failCount);
    console.log('   Completed at:', new Date().toLocaleString('id-ID'));
    console.log('='.repeat(60));
    console.log('');

  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('❌ 1-HOUR REMINDER JOB ERROR:');
    console.error('   ', error.message);
    console.error('   Stack:', error.stack);
    console.error('='.repeat(60));
    console.error('');
  }
});

// ==========================================
// START CRON JOBS
// ==========================================
reminder24Hours.start();
reminder1Hour.start();

console.log('');
console.log('='.repeat(60));
console.log('🚀 SCHEDULE REMINDER JOBS INITIALIZED');
console.log('='.repeat(60));
console.log('📅 24-Hour Reminder:');
console.log('   Schedule: Every hour (0 * * * *)');
console.log('   Runs at: 00:00, 01:00, 02:00, ..., 23:00');
console.log('   Window: ±30 minutes');
console.log('');
console.log('⏰ 1-Hour Reminder:');
console.log('   Schedule: Every 15 minutes (*/15 * * * *)');
console.log('   Runs at: 00, 15, 30, 45 minutes of every hour');
console.log('   Window: ±10 minutes');
console.log('   Condition: 22-25 hours after first reminder');
console.log('='.repeat(60));
console.log('');

// ==========================================
// EXPORT CRON JOBS
// ==========================================
module.exports = {
  reminder24Hours,
  reminder1Hour
};
