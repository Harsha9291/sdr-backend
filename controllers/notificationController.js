import { asyncHandler } from "../utils/asynchandler.js";
import { apiResponse } from "../utils/apiResponse.js";
import User from "../models/User.modal.js";


export const sendNotificationToUser = asyncHandler(async (req, res) => {
  const { userId, title, body, data } = req.body;

  if (!userId || !title || !body) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "userId, title, and body are required"));
  }

  try {
    // Find user by userId
    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(404).json(new apiResponse(404, null, "User not found"));
    }

    if (!user.fcmToken) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "User has no FCM token registered"));
    }

    console.log(`📤 Sending notification to user ${userId}...`);

    // Send notification
    const result = await sendPushNotification({
      token: user.fcmToken,
      title,
      body,
      data: data || {},
    });

    console.log(`✅ Notification sent successfully:`, result);

    return res
      .status(200)
      .json(new apiResponse(200, result, "Notification sent successfully"));
  } catch (error) {
    console.error(`❌ Error sending notification:`, error.message);
    return res
      .status(500)
      .json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

/**
 * 🔥 Send notification by FCM token directly
 * POST /api/notifications/send-by-token
 */
export const sendNotificationByToken = asyncHandler(async (req, res) => {
  const { fcmToken, title, body, data } = req.body;

  if (!fcmToken || !title || !body) {
    return res
      .status(400)
      .json(
        new apiResponse(400, null, "fcmToken, title, and body are required"),
      );
  }

  try {
    console.log(`📤 Sending notification to token...`);

    // Send notification
    const result = await sendPushNotification({
      token: fcmToken,
      title,
      body,
      data: data || {},
    });

    console.log(`✅ Notification sent successfully:`, result);

    return res
      .status(200)
      .json(new apiResponse(200, result, "Notification sent successfully"));
  } catch (error) {
    console.error(`❌ Error sending notification:`, error.message);
    return res
      .status(500)
      .json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

/**
 * 🔥 Send notification to multiple users
 * POST /api/notifications/send-bulk
 */
export const sendBulkNotification = asyncHandler(async (req, res) => {
  const { userIds, title, body, data } = req.body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "userIds array is required"));
  }

  if (!title || !body) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "title and body are required"));
  }

  try {
    console.log(`📤 Sending bulk notification to ${userIds.length} users...`);

    // Find all users with matching IDs
    const users = await User.find({ userId: { $in: userIds } });

    if (users.length === 0) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "No users found with given userIds"));
    }

    // Filter users with FCM tokens
    const usersWithTokens = users.filter((u) => u.fcmToken);

    if (usersWithTokens.length === 0) {
      return res
        .status(400)
        .json(
          new apiResponse(400, null, "No users with registered FCM tokens"),
        );
    }

    // Send notifications to all users
    const results = [];
    const errors = [];

    for (const user of usersWithTokens) {
      try {
        const result = await sendPushNotification({
          token: user.fcmToken,
          title,
          body,
          data: data || {},
        });
        results.push({
          userId: user.userId,
          success: true,
          messageId: result.messageId,
        });
      } catch (error) {
        errors.push({
          userId: user.userId,
          success: false,
          error: error.message,
        });
      }
    }

    console.log(`✅ Bulk notification sent:`, {
      total: usersWithTokens.length,
      success: results.length,
      failed: errors.length,
    });

    return res.status(200).json(
      new apiResponse(
        200,
        {
          total: usersWithTokens.length,
          success: results.length,
          failed: errors.length,
          results,
          errors: errors.length > 0 ? errors : null,
        },
        "Bulk notification sent",
      ),
    );
  } catch (error) {
    console.error(`❌ Error sending bulk notification:`, error.message);
    return res
      .status(500)
      .json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

/**
 * 🔥 Send notification to all users (broadcast)
 * POST /api/notifications/broadcast
 */
export const broadcastNotification = asyncHandler(async (req, res) => {
  const { title, body, data, roleFilter } = req.body;

  if (!title || !body) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "title and body are required"));
  }

  try {
    console.log(`📤 Broadcasting notification...`);

    // Build query
    const query = { fcmToken: { $exists: true, $ne: "" } };
    if (roleFilter) {
      query.role = roleFilter;
    }

    // Find all users with FCM tokens
    const users = await User.find(query);

    if (users.length === 0) {
      return res
        .status(400)
        .json(
          new apiResponse(400, null, "No users with registered FCM tokens"),
        );
    }

    console.log(`📢 Broadcasting to ${users.length} users...`);

    // Send notifications to all
    const results = [];
    const errors = [];

    for (const user of users) {
      try {
        const result = await sendPushNotification({
          token: user.fcmToken,
          title,
          body,
          data: data || {},
        });
        results.push({
          userId: user.userId,
          success: true,
          messageId: result.messageId,
        });
      } catch (error) {
        errors.push({
          userId: user.userId,
          success: false,
          error: error.message,
        });
      }
    }

    console.log(`✅ Broadcast complete:`, {
      total: users.length,
      success: results.length,
      failed: errors.length,
    });

    return res.status(200).json(
      new apiResponse(
        200,
        {
          total: users.length,
          success: results.length,
          failed: errors.length,
          results: results.slice(0, 10), // Return first 10 only
          errors: errors.length > 0 ? errors.slice(0, 10) : null,
        },
        "Broadcast notification sent",
      ),
    );
  } catch (error) {
    console.error(`❌ Error broadcasting notification:`, error.message);
    return res
      .status(500)
      .json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

export default {
  sendNotificationToUser,
  sendNotificationByToken,
  sendBulkNotification,
  broadcastNotification,
};
