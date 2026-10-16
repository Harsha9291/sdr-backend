import ScheduledNotification from '../models/ScheduledNotification.modal.js';
import { sendPushNotification } from '../firebase/firebaseAdmin.js';
import { createNotification } from '../controllers/userNotificationController.js';

let isRunning = false;

/**
 * Start the background notification service
 * Checks database every 30 seconds for due notifications
 */
export const startBackgroundNotificationService = () => {
  if (isRunning) {
    console.log('⚠️ Background notification service is already running');
    return;
  }

  isRunning = true;
  console.log('✅✅✅ Background notification service STARTED ✅✅✅');
  console.log('🔔 Service will check for due notifications every 30 seconds');

  // Check for due notifications every 30 seconds
  const intervalId = setInterval(async () => {
    const checkTime = new Date().toISOString();
    console.log(`\n⏰ [${checkTime}] 🔍 Background service checking for due notifications...`);
    try {
      await processPendingNotifications();
    } catch (error) {
      console.error('❌ Error in background service:', error.message);
    }
  }, 30000); // 30 seconds

  console.log(`📋 Background notification service interval ID: ${intervalId}`);
};

/**
 * Process all pending notifications from database
 */
export const processPendingNotifications = async () => {
  try {
    const now = new Date();
    const nowISO = now.toISOString();

    // Find all scheduled notifications that are due (use local time, not UTC)
    const dueNotifications = await ScheduledNotification.find({
      status: 'scheduled',
      scheduledDateTime: { $lte: now },
    }).limit(100); // Process max 100 at a time

    if (dueNotifications.length === 0) {
      console.log(`   ℹ️  No pending notifications to send at ${nowISO}`);
      return;
    }

    console.log(`\n   📨 Found ${dueNotifications.length} pending notifications to process`);
    console.log(`   ⏱️  Current time: ${nowISO}`);

    for (let i = 0; i < dueNotifications.length; i++) {
      const notification = dueNotifications[i];
      console.log(`\n   [${i + 1}/${dueNotifications.length}] Processing notification:`);
      console.log(`      Lead: ${notification.leadName} (${notification.leadPhone})`);
      console.log(`      Type: ${notification.notificationType}`);
      console.log(`      Scheduled for: ${notification.scheduledDateTime.toISOString()}`);
      
      await sendScheduledNotification(notification);
    }

    console.log(`\n   ✅ Batch processing complete\n`);
  } catch (error) {
    console.error('❌ Error processing pending notifications:', error.message);
  }
};

/**
 * Send a single scheduled notification
 */
export const sendScheduledNotification = async (notification) => {
  const startTime = new Date().toISOString();
  try {
    console.log(`      📤 Starting to send notification...`);
    console.log(`      ⏱️  Time: ${startTime}`);
    console.log(`      🎯 Lead ID: ${notification.leadId}`);
    console.log(`      👤 User ID: ${notification.userId}`);
    console.log(`      🔔 FCM Token: ${notification.fcmToken.substring(0, 20)}...`);

    // Send FCM push notification
    const fcmResult = await sendPushNotification({
      token: notification.fcmToken,
      title: `${notification.notificationType.replace('reminder_', '⏰ ')}: ${notification.actionTitle}`,
      body: notification.leadPhone
        ? `${notification.leadName} • ${notification.leadPhone}`
        : notification.leadName,
      data: {
        leadId: String(notification.leadId),
        type: notification.notificationType,
        actionTitle: notification.actionTitle,
        leadName: notification.leadName,
        leadPhone: notification.leadPhone,
        leadEmail: notification.leadEmail,
      },
    });

    console.log(`      ✅ FCM Push sent! Message ID: ${fcmResult.messageId}`);

    // Create database notification
    try {
      await createNotification({
        userId: notification.userId,
        title: `${notification.notificationType.replace('reminder_', '⏰ ')}: ${notification.actionTitle}`,
        message: `Lead: ${notification.leadName}\nPhone: ${notification.leadPhone}\nAction: ${notification.actionTitle}`,
        type: 'Reminder',
        data: {
          leadId: String(notification.leadId),
          reminderType: notification.notificationType,
          actionTitle: notification.actionTitle,
          leadName: notification.leadName,
          leadPhone: notification.leadPhone,
          leadEmail: notification.leadEmail,
        },
      });
      console.log(`      📝 Database notification created`);
    } catch (dbError) {
      console.error(`      ⚠️  DB notification failed:`, dbError.message);
    }

    // Mark as sent
    await ScheduledNotification.findByIdAndUpdate(notification._id, {
      status: 'sent',
      sentAt: new Date(),
      retryCount: 0,
      messageId: fcmResult.messageId,
    });

    const endTime = new Date().toISOString();
    console.log(`      🎉 Notification fully sent at ${endTime}`);
  } catch (error) {
    console.error(`      ❌ ERROR sending notification:`, error.message);
    console.error(`      📋 Error details:`, error);

    // Update retry count
    const newRetryCount = (notification.retryCount || 0) + 1;

    if (newRetryCount >= notification.maxRetries) {
      // Max retries reached, mark as failed
      await ScheduledNotification.findByIdAndUpdate(notification._id, {
        status: 'failed',
        errorMessage: error.message,
        retryCount: newRetryCount,
      });
      console.log(`      🔴 FAILED after ${newRetryCount} retries`);
    } else {
      // Retry later
      await ScheduledNotification.findByIdAndUpdate(notification._id, {
        retryCount: newRetryCount,
        errorMessage: error.message,
      });
      console.log(`      🔄 Retry ${newRetryCount}/${notification.maxRetries}`);
    }
  }
};

/**
 * Schedule notifications for a lead action with database persistence
 */
export const scheduleLeadNotificationsV2 = async (
  leadId,
  userId,
  scheduledDateTime,
  actionId,
  leadName = 'Unknown',
  leadPhone = '',
  leadEmail = '',
  fcmToken = '',
) => {
  try {
    console.log(`\n   🗄️  [DB Scheduler] Starting database-based notification scheduling...`);
    console.log(`   Lead ID: ${leadId}`);

    // Fetch action title
    let actionTitle = 'Action';
    try {
      const { default: LeadAction } = await import('../models/LeadAction.modal.js');
      const action = await LeadAction.findById(actionId);
      if (action) {
        actionTitle = action.title || 'Action';
      }
    } catch (error) {
      console.warn(`⚠️ Could not fetch action title:`, error.message);
    }

    console.log(`   Action: ${actionTitle}`);

    // Fetch user FCM token if not provided
    let userFcmToken = fcmToken;
    if (!userFcmToken || userFcmToken === '') {
      console.log(`   📱 FCM token not provided or empty, fetching from database...`);
      try {
        const { default: User } = await import('../models/User.modal.js');
        const user = await User.findById(userId);
        if (user && user.fcmToken && user.fcmToken.trim() !== '') {
          userFcmToken = user.fcmToken;
          console.log(`   ✅ FCM Token fetched from DB: ${userFcmToken.substring(0, 30)}...`);
        } else {
          console.log(`   ⚠️  No valid FCM token in database for user`);
          return false;
        }
      } catch (error) {
        console.warn(`⚠️ Could not fetch user FCM token:`, error.message);
        return false;
      }
    }

    if (!userFcmToken || userFcmToken === '') {
      console.log(`   ❌ No valid FCM token available for user: ${userId}`);
      return false;
    }

    console.log(`   ✅ FCM Token available: ${userFcmToken.substring(0, 20)}...`);

    // Cancel existing notifications for this lead
    console.log(`   🗑️  Cancelling previous notifications for this lead...`);
    const cancelResult = await ScheduledNotification.updateMany(
      { leadId, status: 'scheduled' },
      { status: 'cancelled' },
    );
    console.log(`   └─ Cancelled ${cancelResult.modifiedCount} previous notifications`);

    const scheduleTime = new Date(scheduledDateTime);
    const now = new Date();

    if (Number.isNaN(scheduleTime.getTime())) {
      console.error('[DB Scheduler] Invalid scheduled date:', scheduledDateTime);
      return false;
    }

    // If scheduled time is in the past, send immediately
    if (scheduleTime.getTime() <= now.getTime()) {
      console.log(`   ⏰ Scheduled time is in the past - sending immediately`);

      const immediateNotif = new ScheduledNotification({
        leadId,
        userId,
        actionId,
        actionTitle,
        leadName,
        leadPhone,
        leadEmail,
        fcmToken: userFcmToken,
        scheduledDateTime: new Date(),
        notificationType: 'reminder_exact',
        minutesBefore: 0,
        status: 'scheduled',
      });

      await immediateNotif.save();
      console.log(`   💾 Immediate notification saved to database`);
      await sendScheduledNotification(immediateNotif);

      return true;
    }

    // Reminder configuration
    const reminders = [
      { minutesBefore: 30, type: 'reminder_30min' },
      { minutesBefore: 10, type: 'reminder_10min' },
      { minutesBefore: 1, type: 'reminder_1min' },
      { minutesBefore: 0, type: 'reminder_exact' },
    ];

    console.log(`\n   📝 Creating reminder database entries:`);
    // Create notification records for each reminder
    let createdCount = 0;
    for (const reminder of reminders) {
      const notificationTime = new Date(
        scheduleTime.getTime() - reminder.minutesBefore * 60 * 1000,
      );

      // Skip if notification time has already passed
      if (notificationTime.getTime() <= now.getTime()) {
        console.log(
          `      ⏭️  ${reminder.type}: SKIPPED (time passed)`,
        );
        continue;
      }

      const scheduledNotif = new ScheduledNotification({
        leadId,
        userId,
        actionId,
        actionTitle,
        leadName,
        leadPhone,
        leadEmail,
        fcmToken: userFcmToken,
        scheduledDateTime: notificationTime,
        notificationType: reminder.type,
        minutesBefore: reminder.minutesBefore,
        status: 'scheduled',
      });

      await scheduledNotif.save();
      createdCount++;

      const timeUntil = Math.round((notificationTime.getTime() - now.getTime()) / 1000);
      console.log(
        `      ✅ ${reminder.type}: ${notificationTime.toISOString()} (in ${timeUntil}s)`,
      );
    }

    console.log(`\n   🎉 SUCCESS! Created ${createdCount} notification reminders`);
    console.log(`   📊 Summary:`);
    console.log(`      - Lead: ${leadName} (${leadPhone})`);
    console.log(`      - Action: ${actionTitle}`);
    console.log(`      - Scheduled: ${scheduleTime.toISOString()}`);
    console.log(`      - Reminders: 30min, 10min, 1min, exact time`);

    return true;
  } catch (error) {
    console.error(
      '❌ [DB Scheduler] Error scheduling notifications:',
      error.message,
    );
    console.error('   Stack:', error.stack);
    return false;
  }
};

/**
 * Cancel all scheduled notifications for a lead
 */
export const cancelLeadNotificationsV2 = async (leadId) => {
  try {
    console.log(
      `🛑 [DB Scheduler] Cancelling notifications for lead: ${leadId}`,
    );

    const result = await ScheduledNotification.updateMany(
      { leadId, status: 'scheduled' },
      { status: 'cancelled' },
    );

    console.log(
      `✅ [DB Scheduler] Cancelled ${result.modifiedCount} notifications`,
    );

    return result.modifiedCount > 0;
  } catch (error) {
    console.error('❌ [DB Scheduler] Error cancelling notifications:', error.message);
    return false;
  }
};

/**
 * Get all active scheduled notifications for a lead
 */
export const getLeadScheduledNotifications = async (leadId) => {
  try {
    const notifications = await ScheduledNotification.find({
      leadId,
      status: 'scheduled',
    }).sort({ scheduledDateTime: 1 });

    return notifications;
  } catch (error) {
    console.error('❌ Error fetching scheduled notifications:', error.message);
    return [];
  }
};

export default {
  startBackgroundNotificationService,
  processPendingNotifications,
  sendScheduledNotification,
  scheduleLeadNotificationsV2,
  cancelLeadNotificationsV2,
  getLeadScheduledNotifications,
};
