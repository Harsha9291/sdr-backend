import { Router } from "express";
import {
  sendTestMessage,
  getUsersWithTokens,
  broadcastTestNotification,
  seedTestNotifications,
} from "../controllers/testController.js";

const routes = Router();

/**
 * 🔥 Test Routes
 * No authentication required for testing
 */

// Send test message to specific token
routes.post("/send-message", sendTestMessage);

// Get all users with FCM tokens
routes.get("/users-with-tokens", getUsersWithTokens);

// Broadcast test notification to all users
routes.post("/broadcast", broadcastTestNotification);

// Seed 5 test notifications in database
routes.post("/seed-notifications", seedTestNotifications);

export default routes;
