import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load service account - try env var first (for Render), then file (for local)
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  // Running on Render - load from environment variable
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    console.log("✅ Firebase key loaded from environment variable");
  } catch (error) {
    console.error("❌ Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:", error.message);
    process.exit(1);
  }
} else {
  // Running locally - load from file
  const keyPath = path.join(__dirname, "firebaseServiceAccountKey.json");
  try {
    serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));
    console.log("✅ Firebase key loaded from file");
  } catch (error) {
    console.error("❌ Error loading Firebase key file:", error.message);
    process.exit(1);
  }
}

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
