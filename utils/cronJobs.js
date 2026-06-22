import cron from 'node-cron';
import { syncLeadsFromExcel } from '../controllers/ExcelSyncController.js';
import { SYNC_INTERVAL, CRON_ENABLED } from './constants.js';

/**
 * ======================================================
 *   CRON JOB: Excel Sync (Every 1 Minute)
 *   Checks Google Drive Excel file for new leads
 * ======================================================
 */
const startExcelSyncCron = () => {
  if (!CRON_ENABLED) {
    console.log('ℹ️ Cron jobs are disabled (CRON_ENABLED = false)');
    return;
  }

  console.log(`⏰ Scheduling Excel sync cron: ${SYNC_INTERVAL.EVERY_MINUTE}`);

  cron.schedule(SYNC_INTERVAL.EVERY_MINUTE, async () => {
    const timestamp = new Date().toISOString();
    console.log(`⏰ [${timestamp}] CRON: Checking Excel for new leads...`);
    
    try {
      // Call sync function (no req/res for cron)
      const result = await syncLeadsFromExcel();
      
      if (result && result.newLeadsInserted > 0) {
        console.log(`✅ CRON: ${result.newLeadsInserted} new leads added!`);
        console.log(`   📊 Total: ${result.totalInExcel} records in Excel`);
        console.log(`   ⚠️ ${result.duplicatesSkipped} duplicates skipped`);
      } else if (result) {
        console.log('ℹ️ CRON: No new leads found. Everything up to date.');
      } else {
        console.log('⚠️ CRON: Sync returned no data.');
      }
    } catch (error) {
      console.error('❌ CRON Error:', error.message);
      // Optional: Send alert to admin
      // sendAlertEmail('Excel Sync Failed', error.message);
    }
  });

  console.log('✅ Excel sync cron job started successfully!');
};

/**
 * ======================================================
 *   START ALL CRON JOBS
 *   Add more cron jobs here as needed
 * ======================================================
 */
const startAllCronJobs = () => {
  console.log('🚀 Starting all cron jobs...');
  
  // Start Excel sync cron
  startExcelSyncCron();
  
  // Add more cron jobs here
  // startCleanupCron();
  // startReportCron();
  
  console.log('✅ All cron jobs started successfully!');
};

/**
 * ======================================================
 *   STOP ALL CRON JOBS (For graceful shutdown)
 * ======================================================
 */
const stopAllCronJobs = () => {
  console.log('🛑 Stopping all cron jobs...');
  // node-cron doesn't have built-in stop, but we can track tasks
  // For now, just log
  console.log('✅ All cron jobs stopped.');
};

export {
  startExcelSyncCron,
  startAllCronJobs,
  stopAllCronJobs,
};