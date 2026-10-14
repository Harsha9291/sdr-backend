import { asyncHandler } from "../utils/asynchandler.js";
import { apiResponse } from "../utils/apiResponse.js";
import Notification from "../models/Notification.modal.js";
import Leads from "../models/Leads.modal.js";

/**
 * 📋 Get all notifications for logged-in user with populated lead data
 * GET /api/user-notifications/
 */
export const getUserNotifications = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20, isRead } = req.query;

    const query = { userId };

    // Filter by read status if provided
    if (isRead !== undefined) {
      query.isRead = isRead === "true";
    }

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Fetch notifications with pagination
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Populate lead data for each notification
    const enrichedNotifications = await Promise.all(
      notifications.map(async (notification) => {
        // If notification has leadId in data, fetch lead details
        if (notification.data?.leadId) {
          try {
            const lead = await Leads.findById(notification.data.leadId).select(
              'name phone email platform currentStatus'
            ).lean();

            if (lead) {
              return {
                ...notification,
                leadDetails: {
                  name: lead.name || 'Unknown Lead',
                  phone: lead.phone || 'N/A',
                  email: lead.email || 'N/A',
                  platform: lead.platform || 'N/A',
                  status: lead.currentStatus || 'Open',
                },
              };
            }
          } catch (error) {
            console.warn(`⚠️ Could not fetch lead details for ${notification.data.leadId}`);
          }
        }

        return notification;
      })
    );

    // Get total count for pagination
    const totalCount = await Notification.countDocuments(query);

    console.log(
      `✅ [Notifications] Found ${notifications.length} notifications out of ${totalCount} total`,
    );

    return res.status(200).json(
      new apiResponse(
        200,
        {
          notifications: enrichedNotifications,
          pagination: {
            totalCount,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(totalCount / limit),
          },
        },
        "Notifications fetched successfully with lead details",
      ),
    );
  } catch (error) {
    console.error(`❌ [Notifications] Error:`, error.message);
    console.error(`❌ [Notifications] Stack:`, error.stack);
    return res
      .status(500)
      .json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

/**
 * ✅ Mark notification as read
 * PATCH /api/user-notifications/:notificationId/read
 */
export const markNotificationAsRead = asyncHandler(async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    console.log(
      `📖 [Notifications] Marking notification as read: ${notificationId}`,
    );

    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      {
        isRead: true,
        readAt: new Date(),
      },
      { new: true },
    );

    if (!notification) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Notification not found"));
    }

    // Verify ownership
    if (notification.userId.toString() !== userId.toString()) {
      return res
        .status(403)
        .json(
          new apiResponse(
            403,
            null,
            "Unauthorized: Cannot update this notification",
          ),
        );
    }

    console.log(`✅ [Notifications] Marked as read`);

    return res
      .status(200)
      .json(new apiResponse(200, notification, "Notification marked as read"));
  } catch (error) {
    console.error(`❌ [Notifications] Error:`, error.message);
    return res
      .status(500)
      .json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

/**
 * ✅ Mark all notifications as read
 * PATCH /api/user-notifications/read-all
 */
export const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;

    console.log(
      `📖 [Notifications] Marking all notifications as read for user: ${userId}`,
    );

    const result = await Notification.updateMany(
      { userId, isRead: false },
      {
        isRead: true,
        readAt: new Date(),
      },
    );

    console.log(`✅ [Notifications] Marked ${result.modifiedCount} as read`);

    return res
      .status(200)
      .json(
        new apiResponse(
          200,
          { modifiedCount: result.modifiedCount },
          `${result.modifiedCount} notifications marked as read`,
        ),
      );
  } catch (error) {
    console.error(`❌ [Notifications] Error:`, error.message);
    return res
      .status(500)
      .json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

/**
 * 📊 Get unread notification count
 * GET /api/user-notifications/unread-count
 */
export const getUnreadNotificationCount = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;

    console.log(`🔔 [Notifications] Fetching unread count for user: ${userId}`);

    const unreadCount = await Notification.countDocuments({
      userId,
      isRead: false,
    });

    console.log(`✅ [Notifications] Unread count: ${unreadCount}`);

    return res
      .status(200)
      .json(
        new apiResponse(
          200,
          { unreadCount },
          "Unread count fetched successfully",
        ),
      );
  } catch (error) {
    console.error(`❌ [Notifications] Error:`, error.message);
    return res
      .status(500)
      .json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

/**
 * 🗑️ Delete notification
 * DELETE /api/user-notifications/:notificationId
 */
export const deleteNotification = asyncHandler(async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    console.log(`🗑️ [Notifications] Deleting notification: ${notificationId}`);

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Notification not found"));
    }

    // Verify ownership
    if (notification.userId.toString() !== userId.toString()) {
      return res
        .status(403)
        .json(
          new apiResponse(
            403,
            null,
            "Unauthorized: Cannot delete this notification",
          ),
        );
    }

    await Notification.findByIdAndDelete(notificationId);

    console.log(`✅ [Notifications] Notification deleted`);

    return res
      .status(200)
      .json(new apiResponse(200, null, "Notification deleted successfully"));
  } catch (error) {
    console.error(`❌ [Notifications] Error:`, error.message);
    return res
      .status(500)
      .json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

/**
 * 🔔 Create notification (internal use)
 * Used by other parts of the app to create notifications
 */
export const createNotification = asyncHandler(
  async ({ userId, title, message, type = "System", data = null }) => {
    try {
      console.log(
        `📝 [Notifications] Creating notification for user: ${userId}`,
      );

      const notification = await Notification.create({
        userId,
        title,
        message,
        type,
        data,
      });

      console.log(`✅ [Notifications] Notification created:`, notification._id);

      return notification;
    } catch (error) {
      console.error(
        `❌ [Notifications] Error creating notification:`,
        error.message,
      );
      throw error;
    }
  },
);

export default {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
  deleteNotification,
  createNotification,
};
