const cron = require('node-cron');
const Student = require('../models/Student');
const whatsappService = require('../services/whatsappService');
const Message = require('../models/Message');

class PaymentReminderJob {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Start cron jobs for payment reminders
   */
  start() {
    console.log('💰 Starting Payment Reminder Jobs...');

    // Job 1: Daily check at 9 AM - send reminders for overdue payments
    cron.schedule('0 9 * * *', async () => {
      console.log('🔔 [9 AM] Running daily payment reminder check...');
      await this.sendOverdueReminders();
    });

    // Job 2: 3 days before due date - send reminder at 10 AM
    cron.schedule('0 10 * * *', async () => {
      console.log('🔔 [10 AM] Running upcoming payment reminder check...');
      await this.sendUpcomingReminders();
    });

    // Job 3: Daily at midnight - update payment status
    cron.schedule('0 0 * * *', async () => {
      console.log('🔔 [Midnight] Updating payment statuses...');
      await this.updatePaymentStatuses();
    });

    console.log('✅ Payment reminder jobs scheduled:');
    console.log('   - Overdue reminders: Daily at 9 AM');
    console.log('   - Upcoming reminders: Daily at 10 AM');
    console.log('   - Status update: Daily at midnight');
  }

  /**
   * Send reminders for overdue payments
   */
  async sendOverdueReminders() {
    if (this.isRunning) {
      console.log('⏳ Payment reminder job already running, skipping...');
      return;
    }

    this.isRunning = true;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find students with overdue payments
      const overdueStudents = await Student.find({
        status: 'Aktif',
        paymentStatus: 'Overdue',
        enableReminder: true,
        monthlyFee: { $gt: 0 },
        phone: { $exists: true, $ne: '' }
      }).select('fullName parentName phone monthlyFee monthsUnpaid totalUnpaid nextPaymentDue studentId');

      console.log(`📊 Found ${overdueStudents.length} students with overdue payments`);

      let successCount = 0;
      let failCount = 0;

      for (const student of overdueStudents) {
        try {
          const message = this.formatOverdueMessage(student);
          
          // Send WhatsApp message
          await whatsappService.sendMessage(student.phone, message);
          
          // Save to message log
          await Message.create({
            recipient: student.phone,
            recipientName: student.fullName,
            message: message,
            type: 'reminder',
            status: 'sent',
            sentByName: 'System - Payment Reminder',
            metadata: {
              studentId: student._id,
              reminderType: 'payment_overdue',
              monthsUnpaid: student.monthsUnpaid,
              totalUnpaid: student.totalUnpaid
            },
            sentAt: new Date()
          });

          successCount++;
          console.log(`✅ Overdue reminder sent to ${student.fullName} (${student.phone})`);
          
          // Wait 2 seconds between messages to avoid spam
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          failCount++;
          console.error(`❌ Failed to send to ${student.fullName}:`, error.message);
          
          // Log failed message
          await Message.create({
            recipient: student.phone,
            recipientName: student.fullName,
            message: message,
            type: 'reminder',
            status: 'failed',
            sentByName: 'System - Payment Reminder',
            error: error.message,
            metadata: {
              studentId: student._id,
              reminderType: 'payment_overdue'
            }
          });
        }
      }

      console.log(`✅ Overdue reminders completed: ${successCount} sent, ${failCount} failed`);
    } catch (error) {
      console.error('❌ Error in sendOverdueReminders:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Send reminders for upcoming payments (3 days before)
   */
  async sendUpcomingReminders() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Calculate 3 days from now
      const threeDaysFromNow = new Date(today);
      threeDaysFromNow.setDate(today.getDate() + 3);

      // Find students with payments due in 3 days
      const upcomingStudents = await Student.find({
        status: 'Aktif',
        paymentStatus: 'Pending',
        enableReminder: true,
        monthlyFee: { $gt: 0 },
        phone: { $exists: true, $ne: '' },
        nextPaymentDue: {
          $gte: today,
          $lte: threeDaysFromNow
        }
      }).select('fullName parentName phone monthlyFee nextPaymentDue studentId');

      console.log(`📊 Found ${upcomingStudents.length} students with upcoming payments`);

      let successCount = 0;

      for (const student of upcomingStudents) {
        try {
          const daysUntilDue = Math.ceil(
            (new Date(student.nextPaymentDue) - today) / (1000 * 60 * 60 * 24)
          );

          // Only send reminder exactly 3 days before
          if (daysUntilDue === 3) {
            const message = this.formatUpcomingMessage(student);
            
            await whatsappService.sendMessage(student.phone, message);
            
            await Message.create({
              recipient: student.phone,
              recipientName: student.fullName,
              message: message,
              type: 'reminder',
              status: 'sent',
              sentByName: 'System - Payment Reminder',
              metadata: {
                studentId: student._id,
                reminderType: 'payment_upcoming',
                daysUntilDue: daysUntilDue
              },
              sentAt: new Date()
            });

            successCount++;
            console.log(`✅ Upcoming reminder sent to ${student.fullName} (${daysUntilDue} days)`);
            
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (error) {
          console.error(`❌ Failed to send to ${student.fullName}:`, error.message);
        }
      }

      console.log(`✅ Upcoming reminders completed: ${successCount} sent`);
    } catch (error) {
      console.error('❌ Error in sendUpcomingReminders:', error);
    }
  }

  /**
   * Update payment statuses for all active students
   */
  async updatePaymentStatuses() {
    try {
      const students = await Student.find({
        status: 'Aktif',
        monthlyFee: { $gt: 0 }
      });

      console.log(`🔄 Updating payment status for ${students.length} students...`);

      let updatedCount = 0;

      for (const student of students) {
        if (student.updatePaymentStatus) {
          await student.updatePaymentStatus();
          await student.save();
          updatedCount++;
        }
      }

      console.log(`✅ Payment statuses updated: ${updatedCount} students`);
    } catch (error) {
      console.error('❌ Error updating payment statuses:', error);
    }
  }

  /**
   * Format message for overdue payment
   */
  formatOverdueMessage(student) {
    const monthsUnpaid = student.monthsUnpaid || 0;
    const totalUnpaid = student.totalUnpaid || 0;
    const dueDate = student.nextPaymentDue ? 
      new Date(student.nextPaymentDue).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }) : 
      'Tidak diketahui';

    return `🏊‍♂️ *Lafi Swimming Academy*
━━━━━━━━━━━━━━━━━━━━━━

*PENGINGAT PEMBAYARAN SPP*

Yth. ${student.parentName},

Kami ingin mengingatkan bahwa pembayaran SPP untuk *${student.fullName}* sudah melewati jatuh tempo.

📋 *Detail Pembayaran:*
• ID Siswa: ${student.studentId}
• Tunggakan: *${monthsUnpaid} bulan*
• Total: *Rp ${totalUnpaid.toLocaleString('id-ID')}*
• Jatuh tempo: ${dueDate}

💰 Mohon segera melakukan pembayaran ke:
• Bank BCA: 1234567890
• a.n. Lafi Swimming Academy

Konfirmasi pembayaran dapat dilakukan melalui nomor ini.

Terima kasih atas perhatiannya 🙏

━━━━━━━━━━━━━━━━━━━━━━
_Pesan otomatis dari Lafi Swimming Academy_`;
  }

  /**
   * Format message for upcoming payment
   */
  formatUpcomingMessage(student) {
    const dueDate = student.nextPaymentDue ? 
      new Date(student.nextPaymentDue).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }) : 
      'Segera';

    return `🏊‍♂️ *Lafi Swimming Academy*
━━━━━━━━━━━━━━━━━━━━━━

*PENGINGAT PEMBAYARAN SPP*

Yth. ${student.parentName},

Kami ingin mengingatkan bahwa pembayaran SPP untuk *${student.fullName}* akan jatuh tempo dalam 3 hari.

📋 *Detail Pembayaran:*
• ID Siswa: ${student.studentId}
• Biaya: *Rp ${(student.monthlyFee || 0).toLocaleString('id-ID')}*
• Jatuh tempo: *${dueDate}*

💰 Pembayaran dapat dilakukan ke:
• Bank BCA: 1234567890
• a.n. Lafi Swimming Academy

Mohon melakukan pembayaran sebelum jatuh tempo untuk menghindari keterlambatan.

Terima kasih 🙏

━━━━━━━━━━━━━━━━━━━━━━
_Pesan otomatis dari Lafi Swimming Academy_`;
  }

  /**
   * Manual trigger for testing
   */
  async sendTestReminder(studentId) {
    try {
      const student = await Student.findById(studentId);
      
      if (!student) {
        throw new Error('Student not found');
      }

      if (!student.phone) {
        throw new Error('Student has no phone number');
      }

      let message;
      if (student.paymentStatus === 'Overdue') {
        message = this.formatOverdueMessage(student);
      } else {
        message = this.formatUpcomingMessage(student);
      }

      await whatsappService.sendMessage(student.phone, message);

      await Message.create({
        recipient: student.phone,
        recipientName: student.fullName,
        message: message,
        type: 'manual',
        status: 'sent',
        sentByName: 'System - Test Reminder',
        metadata: {
          studentId: student._id,
          reminderType: 'payment_test'
        },
        sentAt: new Date()
      });

      console.log(`✅ Test reminder sent to ${student.fullName}`);
      return { 
        success: true, 
        message: `Test reminder sent to ${student.fullName}`,
        phone: student.phone
      };
    } catch (error) {
      console.error('❌ Test reminder error:', error);
      throw error;
    }
  }

  /**
   * Get payment reminder statistics
   */
  async getStats() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [overdue, upcoming, totalUnpaid] = await Promise.all([
        Student.countDocuments({
          status: 'Aktif',
          paymentStatus: 'Overdue',
          monthlyFee: { $gt: 0 }
        }),
        Student.countDocuments({
          status: 'Aktif',
          paymentStatus: 'Pending',
          monthlyFee: { $gt: 0 },
          nextPaymentDue: {
            $gte: today,
            $lte: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)
          }
        }),
        Student.aggregate([
          {
            $match: {
              paymentStatus: 'Overdue'
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$totalUnpaid' }
            }
          }
        ])
      ]);

      return {
        overdueCount: overdue,
        upcomingCount: upcoming,
        totalUnpaid: totalUnpaid[0]?.total || 0,
        lastRun: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error getting payment stats:', error);
      throw error;
    }
  }
}

module.exports = new PaymentReminderJob();
