import User from "../models/User.modal.js";
import Leads from "../models/Leads.modal.js";
import LeadAction from "../models/LeadAction.modal.js";
import { sendPushNotification } from "../firebase/firebaseAdmin.js";
import { createNotification } from "../controllers/userNotificationController.js";

// Store scheduled timers (lead ID -> notification timers)
const scheduledNotifications = {};

/**
 * Schedule notifications for a lead action.
 *
 * @param {string} leadId
 * @param {string} assignedUserId
 * @param {Date|string} scheduledDateTime
 * @param {string} actionId - Lead Action ID (will be fetched for title)
 * @returns {Promise<boolean>}
 */
export const scheduleLeadNotifications = async (
  leadId,
  assignedUserId,
  scheduledDateTime,
  actionId,
) => {
  try {
    console.log(`📅 [Scheduler] Scheduling notifications for lead: ${leadId}`);

    // Cancel existing timers for this lead
    cancelLeadNotifications(leadId);

    const scheduleTime = new Date(scheduledDateTime);
    const now = Date.now();

    if (Number.isNaN(scheduleTime.getTime())) {
      console.error("[Scheduler] Invalid scheduled date:", scheduledDateTime);
      return false;
    }

    // Fetch lead details for rich notification data
    let lead = {};
    try {
      const leadData = await Leads.findById(leadId);
      if (leadData) {
        lead = {
          id: leadData._id,
          name: leadData.name || 'Unknown',
          phone: leadData.phone || '',
          email: leadData.email || '',
          platform: leadData.platform || '',
        };
      }
    } catch (error) {
      console.warn(`⚠️ [Scheduler] Could not fetch lead details:`, error.message);
    }

    // Fetch action title from LeadAction model
    let actionTitle = 'Action';
    try {
      const action = await LeadAction.findById(actionId);
      if (action) {
        actionTitle = action.title || 'Action';
      }
    } catch (error) {
      console.warn(`⚠️ [Scheduler] Could not fetch action title:`, error.message);
    }

    if (scheduleTime.getTime() <= now) {
      console.log(
        `⚠️ [Scheduler] Scheduled time is in the past for: ${leadId}. Sending immediate notification instead.`,
      );

      // Send immediate notification for past scheduled time
      try {
        const user = await User.findById(assignedUserId);
        if (!user || !user.fcmToken) {
          console.log(`⚠️ [Scheduler] User not found or FCM token missing: ${assignedUserId}`);
          return false;
        }

        const notificationTitle = `🎯 ${actionTitle} - ${lead.name || 'Lead'}`;
        const notificationBody = lead.phone 
          ? `${lead.phone} • ${lead.name || 'New Lead'}` 
          : 'This action was scheduled in the past. Please take action now!';

        await sendPushNotification({
          token: user.fcmToken,
          title: notificationTitle,
          body: notificationBody,
          data: {
            leadId: String(leadId),
            type: "reminder_overdue",
            actionTitle: String(actionTitle),
            leadName: lead.name || '',
            leadPhone: lead.phone || '',
            leadEmail: lead.email || '',
          },
        });

        // Create database notification
        await createNotification({
          userId: assignedUserId,
          title: notificationTitle,
          message: `Lead: ${lead.name || 'Unknown'}\nPhone: ${lead.phone || 'N/A'}\nAction: ${actionTitle}`,
          type: "Reminder",
          data: {
            leadId: String(leadId),
            reminderType: "reminder_overdue",
            actionTitle: String(actionTitle),
            leadName: lead.name,
            leadPhone: lead.phone,
            leadEmail: lead.email,
          },
        });

        console.log(`✅ [Scheduler] Immediate notification sent for overdue action: ${leadId}`);
      } catch (error) {
        console.error(`❌ [Scheduler] Failed to send immediate notification:`, error.message);
      }

      return false;
    }

    // Fetch assigned user and FCM token
    const user = await User.findById(assignedUserId);

    if (!user || !user.fcmToken) {
      console.log(
        `⚠️ [Scheduler] User not found or FCM token missing: ${assignedUserId}`,
      );
      return false;
    }

    const token = user.fcmToken;
    const scheduledAt = scheduleTime.getTime();

    // Reminder configuration with rich data
    const reminders = [
      {
        minutesBefore: 30,
        type: "reminder_30min",
        titlePrefix: "⏰ 30 Min",
        bodyPrefix: "in 30 minutes",
      },
      {
        minutesBefore: 10,
        type: "reminder_10min",
        titlePrefix: "⏰ 10 Min",
        bodyPrefix: "in 10 minutes",
      },
      {
        minutesBefore: 1,
        type: "reminder_1min",
        titlePrefix: "⚡ 1 Min",
        bodyPrefix: "in 1 minute",
      },
      {
        minutesBefore: 0,
        type: "reminder_exact",
        titlePrefix: "🎯 Now",
        bodyPrefix: "Time to act!",
      },
    ];

    const timers = [];

    reminders.forEach((reminder) => {
      const notificationTime = scheduledAt - reminder.minutesBefore * 60 * 1000;

      const delay = notificationTime - Date.now();

      // Do not schedule reminders whose notification time has passed
      if (delay <= 0) {
        console.log(
          `⏭️ [Scheduler] Skipping ${reminder.type} for lead: ${leadId}`,
        );
        return;
      }

      const timer = setTimeout(async () => {
        try {
          console.log(
            `📨 [Scheduler] Sending ${reminder.type} for lead: ${leadId}`,
          );

          // Build rich notification title and body
          const notificationTitle = `${reminder.titlePrefix}: ${actionTitle}`;
          const notificationBody = lead.phone
            ? `${lead.name || 'Lead'} • ${lead.phone} • ${reminder.bodyPrefix}`
            : `${lead.name || 'Unknown'} - ${reminder.bodyPrefix}`;

          // Send FCM push notification
          await sendPushNotification({
            token,
            title: notificationTitle,
            body: notificationBody,
            data: {
              leadId: String(leadId),
              type: reminder.type,
              actionTitle: String(actionTitle),
              leadName: lead.name || '',
              leadPhone: lead.phone || '',
              leadEmail: lead.email || '',
              reminderMinutes: String(reminder.minutesBefore),
            },
          });

          // Create database notification entry
          try {
            await createNotification({
              userId: assignedUserId,
              title: notificationTitle,
              message: notificationBody,
              type: "Reminder",
              data: {
                leadId: String(leadId),
                reminderType: reminder.type,
                actionTitle: String(actionTitle),
                leadName: lead.name,
                leadPhone: lead.phone,
                leadEmail: lead.email,
                reminderMinutes: reminder.minutesBefore,
              },
            });
            console.log(
              `📝 [Scheduler] Database notification created for lead: ${leadId}`,
            );
          } catch (dbError) {
            console.error(
              `❌ [Scheduler] Failed to create DB notification:`,
              dbError.message,
            );
          }

          console.log(
            `✅ [Scheduler] ${reminder.type} sent for lead: ${leadId}`,
          );
        } catch (error) {
          console.error(
            `❌ [Scheduler] Failed to send ${reminder.type}:`,
            error.message,
          );
        } finally {
          // Remove this timer from the active timer list
          const activeTimers = scheduledNotifications[leadId];

          if (activeTimers) {
            const index = activeTimers.indexOf(timer);

            if (index !== -1) {
              activeTimers.splice(index, 1);
            }

            if (activeTimers.length === 0) {
              delete scheduledNotifications[leadId];
            }
          }
        }
      }, delay);

      timers.push(timer);

      console.log(
        `⏱️ [Scheduler] ${reminder.type} scheduled in ${Math.round(
          delay / 1000,
        )} seconds`,
      );
    });

    if (timers.length > 0) {
      scheduledNotifications[leadId] = timers;
    }

    console.log(
      `✅ [Scheduler] ${timers.length} notifications scheduled for lead: ${leadId}`,
    );

    return true;
  } catch (error) {
    console.error(
      "❌ [Scheduler] Error scheduling notifications:",
      error.message,
    );

    return false;
  }
};

/**
 * Cancel scheduled notifications for a lead.
 *
 * @param {string} leadId
 * @returns {boolean}
 */
export const cancelLeadNotifications = (leadId) => {
  try {
    const timers = scheduledNotifications[leadId];

    if (!timers) {
      return false;
    }

    console.log(`🛑 [Scheduler] Cancelling notifications for lead: ${leadId}`);

    timers.forEach((timer) => clearTimeout(timer));

    delete scheduledNotifications[leadId];

    return true;
  } catch (error) {
    console.error(
      "❌ [Scheduler] Error cancelling notifications:",
      error.message,
    );

    return false;
  }
};

/**
 * Get all active scheduled notifications.
 *
 * @returns {Array<{leadId: string, notificationCount: number}>}
 */
export const getAllScheduledNotifications = () => {
  return Object.entries(scheduledNotifications).map(([leadId, timers]) => ({
    leadId,
    notificationCount: timers.length,
  }));
};

export default {
  scheduleLeadNotifications,
  cancelLeadNotifications,
  getAllScheduledNotifications,
};
