// backend/src/jobs/scheduleReminderJob.js

const cron = require('node-cron');
const Schedule = require('../models/Schedule');
const whatsappService = require('../services/whatsappService');

// ==========================================
// FORMAT PESAN REMINDER 24 JAM - SUPPORT 3 TYPES
// ==========================================
const formatReminder24Hours = (schedule) => {
  const date = new Date(schedule.date);
  const formattedDate = date.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // ============ PRIVATE ============
  if (schedule.scheduleType === 'private') {
    return `👨‍🏫 *Pengingat Jadwal Mengajar (H-1) - Lafi Swimming Academy*

Halo Coach ${schedule.coachName}! 👋

Pengingat jadwal mengajar Anda *BESOK*:

📅 *Tanggal:* ${formattedDate}
⏰ *Waktu:* ${schedule.startTime} - ${schedule.endTime}
👨‍🎓 *Siswa:* ${schedule.studentName}
🏊 *Program:* ${schedule.program}
📍 *Lokasi:* ${schedule.location}
📝 *Tipe:* Private (1-on-1)

Mohon persiapkan materi dan peralatan yang diperlukan.

Anda akan menerima pengingat lagi 1 jam sebelum jadwal.

Terima kasih! 💪
*Lafi Swimming Academy*
📱 WA: 0821-4004-4677`;
  }

  // ============ SEMI-PRIVATE ============
  else if (schedule.scheduleType === 'semiPrivate') {
    const studentList = schedule.students
      ?.map(s => `• ${s.fullName}`)
      .join('\n') || '• (Siswa tidak tersedia)';
    const studentCount = schedule.students?.length || 0;

    return `👨‍🏫 *Pengingat Semi-Private Class (H-1) - Lafi Swimming Academy*

Halo Coach ${schedule.coachName}! 👋

Pengingat semi-private class Anda *BESOK*:

📝 *Group:* ${schedule.groupName || 'Semi-Private'}
📅 *Tanggal:* ${formattedDate}
⏰ *Waktu:* ${schedule.startTime} - ${schedule.endTime}
👨‍🎓 *Siswa (${studentCount}):*
${studentList}
🏊 *Program:* ${schedule.program}
📍 *Lokasi:* ${schedule.location}
📝 *Tipe:* Semi-Private (1:${studentCount})

Mohon persiapkan materi dan peralatan yang diperlukan.

Anda akan menerima pengingat lagi 1 jam sebelum jadwal.

Terima kasih! 💪
*Lafi Swimming Academy*
📱 WA: 0821-4004-4677`;
  }

  // ============ GROUP ============
  else {
    const studentList = schedule.students
      ?.map(s => `• ${s.fullName}`)
      .join('\n') || '• (Siswa tidak tersedia)';
    const studentCount = schedule.students?.length || 0;
    const coachList = schedule.coaches
      ?.map(c => c.fullName)
      .join(', ') || 'Unknown';

    return `👨‍🏫 *Pengingat Group Class (H-1) - Lafi Swimming Academy*

Halo Coach! 👋

Pengingat group class Anda *BESOK*:

📝 *Group:* ${schedule.groupName}
📅 *Tanggal:* ${formattedDate}
⏰ *Waktu:* ${schedule.startTime} - ${schedule.endTime}
👨‍🏫 *Pelatih:* ${coachList}
👨‍🎓 *Siswa (${studentCount}):*
${studentList}
🏊 *Program:* ${schedule.program}
📍 *Lokasi:* ${schedule.location}
📝 *Tipe:* Group Class

Mohon persiapkan materi dan peralatan yang diperlukan.

Anda akan menerima pengingat lagi 1 jam sebelum jadwal.

Terima kasih! 💪
*Lafi Swimming Academy*
📱 WA: 0821-4004-4677`;
  }
};

// ==========================================
// FORMAT PESAN REMINDER 1 JAM - SUPPORT 3 TYPES
// ==========================================
const formatReminder1Hour = (schedule) => {
  const date = new Date(schedule.date);
  const formattedDate = date.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // ============ PRIVATE ============
  if (schedule.scheduleType === 'private') {
    return `⏰ *Pengingat Jadwal Mengajar (1 Jam Lagi!) - Lafi Swimming Academy*

Halo Coach ${schedule.coachName}! 👋

⚠️ *PENGINGAT: Jadwal mengajar Anda 1 JAM LAGI!*

📅 *Tanggal:* ${formattedDate}
⏰ *Waktu:* ${schedule.startTime} - ${schedule.endTime}
👨‍🎓 *Siswa:* ${schedule.studentName}
🏊 *Program:* ${schedule.program}
📍 *Lokasi:* ${schedule.location}
📝 *Tipe:* Private (1-on-1)

Harap segera bersiap dan menuju lokasi.

Semangat mengajar! 💪
*Lafi Swimming Academy*
📱 WA: 0821-4004-4677`;
  }

  // ============ SEMI-PRIVATE ============
  else if (schedule.scheduleType === 'semiPrivate') {
    const studentList = schedule.students
      ?.map(s => `• ${s.fullName}`)
      .join('\n') || '• (Siswa tidak tersedia)';
    const studentCount = schedule.students?.length || 0;

    return `⏰ *Pengingat Semi-Private Class (1 Jam Lagi!) - Lafi Swimming Academy*

Halo Coach ${schedule.coachName}! 👋

⚠️ *PENGINGAT: Semi-private class Anda 1 JAM LAGI!*

📝 *Group:* ${schedule.groupName || 'Semi-Private'}
📅 *Tanggal:* ${formattedDate}
⏰ *Waktu:* ${schedule.startTime} - ${schedule.endTime}
👨‍🎓 *Siswa (${studentCount}):*
${studentList}
🏊 *Program:* ${schedule.program}
📍 *Lokasi:* ${schedule.location}
📝 *Tipe:* Semi-Private (1:${studentCount})

Harap segera bersiap dan menuju lokasi.

Semangat mengajar! 💪
*Lafi Swimming Academy*
📱 WA: 0821-4004-4677`;
  }

  // ============ GROUP ============
  else {
    const studentList = schedule.students
      ?.map(s => `• ${s.fullName}`)
      .join('\n') || '• (Siswa tidak tersedia)';
    const studentCount = schedule.students?.length || 0;
    const coachList = schedule.coaches
      ?.map(c => c.fullName)
      .join(', ') || 'Unknown';

    return `⏰ *Pengingat Group Class (1 Jam Lagi!) - Lafi Swimming Academy*

Halo Coach! 👋

⚠️ *PENGINGAT: Group class Anda 1 JAM LAGI!*

📝 *Group:* ${schedule.groupName}
📅 *Tanggal:* ${formattedDate}
⏰ *Waktu:* ${schedule.startTime} - ${schedule.endTime}
👨‍🏫 *Pelatih:* ${coachList}
👨‍🎓 *Siswa (${studentCount}):*
${studentList}
🏊 *Program:* ${schedule.program}
📍 *Lokasi:* ${schedule.location}
📝 *Tipe:* Group Class

Harap segera bersiap dan menuju lokasi.

Semangat mengajar! 💪
*Lafi Swimming Academy*
📱 WA: 0821-4004-4677`;
  }
};

// ==========================================
// HELPER: Send to coach(es) based on schedule type
// ==========================================
const sendToCoaches = async (schedule, message, reminderType) => {
  let recipients = [];

  // ============ PRIVATE / SEMI-PRIVATE ============
  if (schedule.scheduleType === 'private' || schedule.scheduleType === 'semiPrivate') {
    const coachPhone = schedule.coachPhone;
    const coachName = schedule.coachName;

    if (coachPhone) {
      recipients = [{
        name: coachName,
        phone: coachPhone
      }];
    }
  }
  // ============ GROUP ============
  else if (schedule.scheduleType === 'group') {
    // ✅ Send to ALL coaches in the group
    recipients = (schedule.coaches || [])
      .filter(c => c.phone)
      .map(c => ({
        name: c.fullName,
        phone: c.phone
      }));
  }

  if (recipients.length === 0) {
    console.log('   ⚠️  No coach phone numbers available');
    return { successCount: 0, failCount: 0, totalRecipients: 0 };
  }

  // Send messages with delay
  let successCount = 0;
  let failCount = 0;

  for (const recipient of recipients) {
    try {
      await whatsappService.sendMessage(
        recipient.phone,
        message,
        'reminder',
        null,
        {
          recipientName: recipient.name,
          scheduleId: schedule._id.toString(),
          reminderType,
          scheduleType: schedule.scheduleType
        }
      );

      successCount++;
      console.log(`   ✅ Sent to ${recipient.name} (${recipient.phone})`);

      // Delay 2 seconds between messages
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      failCount++;
      console.error(`   ❌ Failed to send to ${recipient.name}: ${error.message}`);
    }
  }

  return { successCount, failCount, totalRecipients: recipients.length };
};

// ==========================================
// CRON JOB: REMINDER 24 JAM SEBELUMNYA
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

    // Calculate time window
    const now = new Date();
    const reminderTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const reminderTimeStart = new Date(reminderTime.getTime() - 30 * 60 * 1000);
    const reminderTimeEnd = new Date(reminderTime.getTime() + 30 * 60 * 1000);

    console.log('📊 Search parameters:');
    console.log('   Target time:', reminderTime.toLocaleString('id-ID'));
    console.log('   Window start:', reminderTimeStart.toLocaleString('id-ID'));
    console.log('   Window end:', reminderTimeEnd.toLocaleString('id-ID'));

    // Find schedules
    const schedules = await Schedule.find({
      date: {
        $gte: reminderTimeStart,
        $lte: reminderTimeEnd
      },
      reminderEnabled: true,
      reminderSent: false,
      status: 'scheduled'
    });

    console.log(`📋 Found ${schedules.length} schedule(s) for 24-hour reminder`);
    console.log(`   Private: ${schedules.filter(s => s.scheduleType === 'private').length}`);
    console.log(`   Semi-Private: ${schedules.filter(s => s.scheduleType === 'semiPrivate').length}`);
    console.log(`   Group: ${schedules.filter(s => s.scheduleType === 'group').length}`);

    if (schedules.length === 0) {
      console.log('   No schedules to process');
      console.log('='.repeat(60));
      return;
    }

    // Process each schedule
    let totalSuccess = 0;
    let totalFailed = 0;

    for (let i = 0; i < schedules.length; i++) {
      const schedule = schedules[i];

      console.log('');
      console.log(`📤 [${i + 1}/${schedules.length}] Processing schedule:`);
      console.log('   ID:', schedule._id);
      console.log('   Type:', schedule.scheduleType);
      console.log('   Date:', new Date(schedule.date).toLocaleString('id-ID'));
      console.log('   Time:', `${schedule.startTime} - ${schedule.endTime}`);

      try {
        // Format message based on schedule type
        const message = formatReminder24Hours(schedule);

        // ✅ Send to coach(es)
        const result = await sendToCoaches(schedule, message, '24h');

        totalSuccess += result.successCount;
        totalFailed += result.failCount;

        console.log(`   📊 Result: ${result.successCount}/${result.totalRecipients} sent`);

        // Mark as sent
        schedule.reminderSent = true;
        schedule.reminderSentAt = new Date();
        await schedule.save();

        console.log('   ✅ 24-hour reminder processed');

      } catch (error) {
        totalFailed++;
        console.error('   ❌ Error processing schedule:', error.message);
      }
    }

    // Summary
    console.log('');
    console.log('='.repeat(60));
    console.log('📊 24-HOUR REMINDER JOB SUMMARY:');
    console.log('   Total schedules:', schedules.length);
    console.log('   ✅ Messages sent:', totalSuccess);
    console.log('   ❌ Messages failed:', totalFailed);
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

    // Calculate time window
    const now = new Date();
    const reminderTime = new Date(now.getTime() + 60 * 60 * 1000);
    const reminderTimeStart = new Date(reminderTime.getTime() - 10 * 60 * 1000);
    const reminderTimeEnd = new Date(reminderTime.getTime() + 10 * 60 * 1000);

    console.log('📊 Search parameters:');
    console.log('   Target time:', reminderTime.toLocaleString('id-ID'));
    console.log('   Window start:', reminderTimeStart.toLocaleString('id-ID'));
    console.log('   Window end:', reminderTimeEnd.toLocaleString('id-ID'));

    // Find schedules
    const schedules = await Schedule.find({
      date: {
        $gte: reminderTimeStart,
        $lte: reminderTimeEnd
      },
      reminderEnabled: true,
      reminderSent: true, // Already sent 24h reminder
      status: 'scheduled'
    });

    console.log(`📋 Found ${schedules.length} schedule(s) for 1-hour reminder`);

    if (schedules.length === 0) {
      console.log('   No schedules to process');
      console.log('='.repeat(60));
      return;
    }

    // Process each schedule
    let totalSuccess = 0;
    let totalFailed = 0;
    let skippedCount = 0;

    for (let i = 0; i < schedules.length; i++) {
      const schedule = schedules[i];

      console.log('');
      console.log(`📤 [${i + 1}/${schedules.length}] Processing schedule:`);
      console.log('   ID:', schedule._id);
      console.log('   Type:', schedule.scheduleType);
      console.log('   Date:', new Date(schedule.date).toLocaleString('id-ID'));
      console.log('   Time:', `${schedule.startTime} - ${schedule.endTime}`);

      try {
        // Check timing window
        const reminderSentAt = new Date(schedule.reminderSentAt);
        const hoursSinceReminder = (now - reminderSentAt) / (1000 * 60 * 60);

        console.log('   First reminder sent:', reminderSentAt.toLocaleString('id-ID'));
        console.log('   Hours since first reminder:', hoursSinceReminder.toFixed(2));

        // Only send if between 22-25 hours since first reminder
        if (hoursSinceReminder < 22 || hoursSinceReminder > 25) {
          console.log('   ⏭️  Not in 1-hour reminder window (need 22-25 hours gap)');
          console.log('   Skipping...');
          skippedCount++;
          continue;
        }

        // Format message based on schedule type
        const message = formatReminder1Hour(schedule);

        // ✅ Send to coach(es)
        const result = await sendToCoaches(schedule, message, '1h');

        totalSuccess += result.successCount;
        totalFailed += result.failCount;

        console.log(`   📊 Result: ${result.successCount}/${result.totalRecipients} sent`);

        // Update last reminder time
        schedule.reminderSentAt = new Date();
        await schedule.save();

        console.log('   ✅ 1-hour reminder processed');

      } catch (error) {
        totalFailed++;
        console.error('   ❌ Error processing schedule:', error.message);
      }
    }

    // Summary
    console.log('');
    console.log('='.repeat(60));
    console.log('📊 1-HOUR REMINDER JOB SUMMARY:');
    console.log('   Total schedules:', schedules.length);
    console.log('   ✅ Messages sent:', totalSuccess);
    console.log('   ⏭️  Skipped:', skippedCount);
    console.log('   ❌ Messages failed:', totalFailed);
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
console.log('   Support: private, semiPrivate, group');
console.log('');
console.log('⏰ 1-Hour Reminder:');
console.log('   Schedule: Every 15 minutes (*/15 * * * *)');
console.log('   Runs at: 00, 15, 30, 45 minutes of every hour');
console.log('   Window: ±10 minutes');
console.log('   Condition: 22-25 hours after first reminder');
console.log('   Support: private, semiPrivate, group');
console.log('='.repeat(60));
console.log('');

// ==========================================
// EXPORT CRON JOBS
// ==========================================
module.exports = {
  reminder24Hours,
  reminder1Hour
};
