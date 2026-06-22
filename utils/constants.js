// ======================================================
//   EXCEL SYNC CONFIGURATION
// ======================================================

// Google Drive direct download link (UPDATED)
export const EXCEL_URL =
  "https://drive.google.com/uc?export=download&id=1N0bPGPL7OvKp7fJhorI2UZMHbi18Qu9t";

// Sync intervals (in milliseconds)
export const SYNC_INTERVAL = {
  EVERY_MINUTE: "* * * * *", // Every 1 minute
  EVERY_5_MINUTES: "*/5 * * * *", // Every 5 minutes
  EVERY_HOUR: "0 * * * *", // Every hour
  EVERY_DAY: "0 0 * * *", // Every day at midnight
};

// Batch size for bulk insert
export const BATCH_SIZE = 500;

// Timeout for Excel download (in milliseconds)
export const EXCEL_DOWNLOAD_TIMEOUT = 30000; // 30 seconds

// Cron job enabled/disabled (for development)
export const CRON_ENABLED = process.env.NODE_ENV === "production" || true;