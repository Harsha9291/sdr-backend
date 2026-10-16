import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const keyPath = path.join(__dirname, "firebaseServiceAccountKey.json");

// Load service account
const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));

// Initialize Firebase
admin.default.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

console.log("✅ Firebase initialized");

export async function sendPushNotification({ token, title, body, data = {} }) {
  try {
    const message = {
      notification: { title, body },
      data,
      token,
    };

    const response = await admin.default.messaging().send(message);
    console.log(`✅ FCM Sent: ${response}`);
    return { messageId: response };
  } catch (error) {
    console.error(`❌ FCM Error: ${error.message}`);
    throw error;
  }
}

export default admin.default;
