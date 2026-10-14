import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = join(__dirname, "firebaseServiceAccountKey.json");

console.log("🔥 Initializing Firebase Admin...");

let serviceAccount;
try {
  const data = readFileSync(serviceAccountPath, "utf8");
  serviceAccount = JSON.parse(data);
  console.log("✅ Service account loaded");
} catch (error) {
  console.error("❌ Failed to load service account:", error.message);
  throw error;
}

// Initialize Firebase only once
const existingApp = getApps().find((app) => app.name === "[DEFAULT]");

export const firebaseApp =
  existingApp ||
  initializeApp({
    credential: cert(serviceAccount),
  });

export const messaging = getMessaging(firebaseApp);

console.log("✅ Firebase Admin initialized successfully");

// Send push notification via FCM
export const sendPushNotification = async ({ token, title, body, data = {} }) => {
  try {
    console.log("📤 Sending FCM notification...");
    console.log("📱 Token available:", Boolean(token));
    console.log("📝 Title:", title);

    if (!token || !title || !body) {
      throw new Error("token, title and body are required");
    }

    const messageId = await messaging.send({
      token,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, String(value)])
      ),
      android: {
        priority: "high",
        ttl: 86400,
        notification: {
          title,
          body,
          channelId: "high",
          clickAction: "FLUTTER_NOTIFICATION_CLICK",
          sound: "default",
          color: "#2874F0",
          defaultVibrateTimings: true,
          defaultLightSettings: true,
          lightSettings: {
            color: "#2874F0FF",
            lightOnDurationMillis: 1000,
            lightOffDurationMillis: 3000,
          },
        },
      },
    });

    console.log("✅ Notification sent:", messageId);

    return { success: true, messageId };
  } catch (error) {
    console.error("❌ FCM error:", error.code, error.message);
    throw error;
  }
};

export default { sendPushNotification };
