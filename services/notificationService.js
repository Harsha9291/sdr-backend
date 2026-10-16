import ScheduledNotification from '../models/ScheduledNotification.modal.js';
import { createNotification } from '../controllers/userNotificationController.js';

/**
 * Start background service - checks every 30 seconds for due notifications
 */
export const startNotificationService = () => {
  console.log('✅ Notification Service Started (30-second interval)');
  
  setInterval(async () => {
    try {
      const now = new Date();
      
      // Find notifications ready to send
      const pending = await ScheduledNotification.find({
        status: 'pending',
        scheduledTime: { $lte: now }
      });

      for (const notif of pending) {
        await sendNotification(notif);
      }
    } catch (error) {
      console.error('❌ Service Error:', error.message);
    }
  }, 30000);
};

/**
 * Send a single notification
 */
async function sendNotification(notif) {
  try {
    console.log(`📤 Sending: ${notif.type} - ${notif.leadName}`);

    // Import Firebase
    const { sendPushNotification } = await import('../firebase/firebaseAdmin.js');

    // Send push notification
    await sendPushNotification({
      token: notif.fcmToken,
      title: `Your Next Schedule`,
      body: `${notif.leadName}\nAction: ${notif.actionTitle}`
    });

    // Save to notification center
    await createNotification({
      userId: notif.userId,
      title: 'Your Next Schedule',
      message: `Lead: ${notif.leadName}\nAction: ${notif.actionTitle}`,
      type: 'Reminder',
      data: { leadId: notif.leadId.toString() }
    });

    // Mark as sent
    await ScheduledNotification.findByIdAndUpdate(notif._id, {
      status: 'sent',
      sentAt: new Date()
    });

    console.log(`✅ Sent: ${notif.leadName}`);
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`);
    await ScheduledNotification.findByIdAndUpdate(notif._id, {
      status: 'failed',
      error: error.message
    });
  }
}

/**
 * Schedule 4 reminders for a lead (30min, 10min, 1min, exact)
 */
export const scheduleReminders = async (leadId, userId, scheduleTime, leadName, actionTitle, fcmToken) => {
  try {
    console.log(`📅 Scheduling reminders for: ${leadName}`);

    // Cancel old reminders
    await ScheduledNotification.updateMany(
      { leadId, status: 'pending' },
      { status: 'cancelled' }
    );

    const times = [
      { minutes: 30, type: '30min' },
      { minutes: 10, type: '10min' },
      { minutes: 1, type: '1min' },
      { minutes: 0, type: 'exact' }
    ];

    for (const t of times) {
      const reminderTime = new Date(scheduleTime.getTime() - t.minutes * 60000);
      
      if (reminderTime > new Date()) {
        await ScheduledNotification.create({
          leadId,
          userId,
          leadName,
          actionTitle,
          fcmToken,
          type: t.type,
          scheduledTime: reminderTime,
          status: 'pending'
        });
        console.log(`✓ ${t.type}: ${reminderTime.toLocaleTimeString('en-IN')}`);
      }
    }

    console.log(`🎉 Reminders scheduled\n`);
    return true;
  } catch (error) {
    console.error(`❌ Scheduling error:`, error.message);
    return false;
  }
};
