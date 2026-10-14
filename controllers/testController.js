import { asyncHandler } from "../utils/asynchandler.js";
import { apiResponse } from "../utils/apiResponse.js";
import { sendPushNotification } from "../firebase/firebaseAdmin.js";
import User from "../models/User.modal.js";
import Notification from "../models/Notification.modal.js";

/**
 * 🔥 Test notification endpoint
 * Send test message to a device
 * POST /api/test/send-message
 */
export const sendTestMessage = asyncHandler(async (req, res) => {
  const { fcmToken, title, body } = req.body;

  if (!fcmToken || !title || !body) {
    return res.status(400).json(
      new apiResponse(400, null, "fcmToken, title, and body are required")
    );
  }

  try {
    console.log(`📤 Sending test message to device...`);
    console.log(`Token: ${fcmToken.substring(0, 30)}...`);

    const result = await sendPushNotification({
      token: fcmToken,
      title,
      body,
      data: {
        type: "test_message",
        timestamp: new Date().toISOString(),
      },
    });

    console.log(`✅ Test message sent:`, result);

    return res.status(200).json(
      new apiResponse(
        200,
        result,
        "Test message sent successfully!"
      )
    );
  } catch (error) {
    console.error(`❌ Error sending test message:`, error.message);
    return res.status(500).json(
      new apiResponse(500, null, `Error: ${error.message}`)
    );
  }
});

/**
 * 🔥 Get all users with FCM tokens for testing
 * GET /api/test/users-with-tokens
 */
export const getUsersWithTokens = asyncHandler(async (req, res) => {
  try {
    console.log("📋 Fetching users with FCM tokens...");

    const users = await User.find(
      { fcmToken: { $exists: true, $ne: null } },
      { userId: 1, fcmToken: 1, createdAt: 1 }
    ).lean();

    const userList = users.map((user) => ({
      userId: user.userId,
      fcmToken: user.fcmToken.substring(0, 40) + "...",
      fcmTokenFull: user.fcmToken,
      createdAt: user.createdAt,
    }));

    console.log(`✅ Found ${userList.length} users with tokens`);

    return res.status(200).json(
      new apiResponse(
        200,
        {
          count: userList.length,
          users: userList,
        },
        `Found ${userList.length} users with FCM tokens`
      )
    );
  } catch (error) {
    console.error(`❌ Error fetching users:`, error.message);
    return res.status(500).json(
      new apiResponse(500, null, `Error: ${error.message}`)
    );
  }
});

/**
 * 🔥 Send test to all users with tokens
 * POST /api/test/broadcast
 */
export const broadcastTestNotification = asyncHandler(async (req, res) => {
  const { title, body } = req.body;

  if (!title || !body) {
    return res.status(400).json(
      new apiResponse(400, null, "title and body are required")
    );
  }

  try {
    console.log("📢 Broadcasting test notification to all users...");

    const users = await User.find(
      { fcmToken: { $exists: true, $ne: null } },
      { userId: 1, fcmToken: 1 }
    ).lean();

    if (users.length === 0) {
      return res.status(400).json(
        new apiResponse(400, null, "No users with FCM tokens found")
      );
    }

    console.log(`📤 Sending to ${users.length} users...`);

    const results = [];

    for (const user of users) {
      try {
        const result = await sendPushNotification({
          token: user.fcmToken,
          title,
          body,
          data: {
            type: "broadcast_test",
            timestamp: new Date().toISOString(),
          },
        });

        results.push({
          userId: user.userId,
          status: "success",
          messageId: result.messageId,
        });
        console.log(`✅ Sent to ${user.userId}`);
      } catch (error) {
        results.push({
          userId: user.userId,
          status: "failed",
          error: error.message,
        });
        console.error(`❌ Failed for ${user.userId}:`, error.message);
      }
    }

    return res.status(200).json(
      new apiResponse(
        200,
        {
          totalUsers: users.length,
          results,
        },
        `Broadcast sent to ${users.length} users`
      )
    );
  } catch (error) {
    console.error(`❌ Error broadcasting:`, error.message);
    return res.status(500).json(
      new apiResponse(500, null, `Error: ${error.message}`)
    );
  }
});

/**
 * 🌱 Seed 5 test notifications for logged-in user
 * POST /api/test/seed-notifications
 */
export const seedTestNotifications = asyncHandler(async (req, res) => {
  try {
    // Get the first user with fcmToken
    const user = await User.findOne({ fcmToken: { $exists: true, $ne: null } });

    if (!user) {
      return res.status(400).json(
        new apiResponse(400, null, "No user with FCM token found. Please login first.")
      );
    }

    console.log(`🌱 Seeding 5 test notifications for user: ${user.userId}`);

    const testNotifications = [
      {
        userId: user._id,
        title: "🎯 New Lead Assigned",
        message: "Lead LEAD-1023 from Google Ads has been assigned to you.",
        type: "Lead",
        data: { leadId: "LEAD-1023", platform: "Google Ads" },
      },
      {
        userId: user._id,
        title: "📊 Lead Status Updated",
        message: "Lead LEAD-0987 status changed from 'New' to 'In Follow-Up'.",
        type: "Status",
        data: { leadId: "LEAD-0987", status: "In Follow-Up" },
      },
      {
        userId: user._id,
        title: "⏰ Follow-Up Reminder",
        message: "You have a pending follow-up with lead LEAD-0912 scheduled for today.",
        type: "Reminder",
        data: { leadId: "LEAD-0912", actionType: "follow-up" },
      },
      {
        userId: user._id,
        title: "📱 App Update Available",
        message: "A new version of the Lead CRM app is available. Update for improved performance.",
        type: "System",
        data: { version: "2.1.0", updateType: "feature" },
      },
      {
        userId: user._id,
        title: "✨ New Lead Created",
        message: "A new lead (LEAD-1056) has been created from the Website Contact Form.",
        type: "Lead",
        data: { leadId: "LEAD-1056", source: "Website" },
      },
    ];

    const createdNotifications = await Notification.insertMany(testNotifications);

    console.log(`✅ Created ${createdNotifications.length} test notifications`);

    return res.status(200).json(
      new apiResponse(
        200,
        {
          count: createdNotifications.length,
          notifications: createdNotifications,
          userId: user.userId,
        },
        `Successfully created 5 test notifications for ${user.userId}`
      )
    );
  } catch (error) {
    console.error(`❌ Error seeding notifications:`, error.message);
    return res.status(500).json(
      new apiResponse(500, null, `Error: ${error.message}`)
    );
  }
});

export default {
  sendTestMessage,
  getUsersWithTokens,
  broadcastTestNotification,
  seedTestNotifications,
};
