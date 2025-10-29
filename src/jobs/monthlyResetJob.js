const cron = require('node-cron');
const Student = require('../models/Student');

class MonthlyResetJob {
  constructor() {
    this.isRunning = false;
  }

  start() {
    console.log('📅 Starting Monthly Reset Job...');

    // Run every day at 00:01 to check for month change
    cron.schedule('1 0 * * *', async () => {
      console.log('🔔 [00:01] Checking for month change...');
      await this.checkAndResetMonth();
    });

    // Also run on 1st of every month at 00:05 (backup)
    cron.schedule('5 0 1 * *', async () => {
      console.log('🔔 [1st day 00:05] Monthly reset backup check...');
      await this.forceResetMonth();
    });

    // Daily update of payment statuses at 00:30
    cron.schedule('30 0 * * *', async () => {
      console.log('🔔 [00:30] Daily payment status update...');
      await this.updateAllStatuses();
    });

    console.log('✅ Monthly reset job scheduled:');
    console.log('   - Daily check: 00:01');
    console.log('   - Force reset: 1st day 00:05');
    console.log('   - Status update: Daily 00:30');
  }

  async checkAndResetMonth() {
    if (this.isRunning) {
      console.log('⏳ Reset job already running, skipping...');
      return;
    }

    this.isRunning = true;

    try {
      const today = new Date();
      const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      
      // Check if any student needs month reset
      const studentsToReset = await Student.countDocuments({
        status: 'Aktif',
        monthlyFee: { $gt: 0 },
        $or: [
          { 'currentMonthPayment.month': { $ne: currentMonth } },
          { 'currentMonthPayment': { $exists: false } }
        ]
      });

      if (studentsToReset > 0) {
        console.log(`📊 Found ${studentsToReset} students needing reset for ${currentMonth}`);
        const updated = await Student.resetForNewMonth();
        console.log(`✅ Monthly reset completed: ${updated} students updated`);
      } else {
        console.log(`✅ All students already on current month: ${currentMonth}`);
      }
    } catch (error) {
      console.error('❌ Error in checkAndResetMonth:', error);
    } finally {
      this.isRunning = false;
    }
  }

  async forceResetMonth() {
    try {
      console.log('🔄 Force resetting all active students for new month...');
      const updated = await Student.resetForNewMonth();
      console.log(`✅ Force reset completed: ${updated} students updated`);
    } catch (error) {
      console.error('❌ Error in forceResetMonth:', error);
    }
  }

  async updateAllStatuses() {
    try {
      console.log('🔄 Updating all payment statuses...');
      const updated = await Student.updateAllPaymentStatuses();
      console.log(`✅ Payment status update completed: ${updated} students`);
    } catch (error) {
      console.error('❌ Error in updateAllStatuses:', error);
    }
  }

  // Manual trigger for testing
  async triggerReset() {
    console.log('🔧 Manual trigger: Resetting month...');
    return await Student.resetForNewMonth();
  }

  async triggerStatusUpdate() {
    console.log('🔧 Manual trigger: Updating statuses...');
    return await Student.updateAllPaymentStatuses();
  }
}

module.exports = new MonthlyResetJob();
