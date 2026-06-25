
import { syncLeadsFromSheet } from '../controllers/ExcelSyncController.js';

import cron from "node-cron";

import Integration from "../models/Intigration.modal.js";


const startExcelSyncCron = () => {
  console.log(
    "✅ Dynamic Integration Sync Cron Started"
  );

  cron.schedule("* * * * *", async () => {
    // cron.schedule("*/20 * * * * *", async () => {
    try {
      const integrations =
        await Integration.find({
          status: true,
        });

      const now = new Date();

      for (const integration of integrations) {
        const fetchMinutes = Number(
          integration.fetchTime || 5
        );

        const lastRun =
          integration.lastSyncedAt;

        let shouldRun = false;

        if (!lastRun) {
          shouldRun = true;
        } else {
          const diffMinutes =
            (now - lastRun) /
            (1000 * 60);

          shouldRun =
            diffMinutes >= fetchMinutes;
        }

        if (!shouldRun) continue;

        console.log(
          `🔄 Running Sync: ${integration._id}`
        );

        await syncLeadsFromSheet(
          integration.googleSheetUrl,
          integration._id
        );
      }
    } catch (error) {
      console.error(
        "Cron Error:",
        error.message
      );
    }
  });
};


export {
  startExcelSyncCron,
};