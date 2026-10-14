import { Router } from "express";
import {
  sendNotificationToUser,
  sendNotificationByToken,
  sendBulkNotification,
  broadcastNotification,
} from "../controllers/notificationController.js";
import { verifyJWT } from "../middlewares/authTypeMiddleware.js";

const routes = Router();

/**
 * 🔥 Notification Routes
 * All routes require JWT authentication
 */

// Send notification to single user by userId
routes.post("/send-to-user", verifyJWT, sendNotificationToUser);

// Send notification by FCM token directly
routes.post("/send-by-token", verifyJWT, sendNotificationByToken);

// Send bulk notification to multiple users
routes.post("/send-bulk", verifyJWT, sendBulkNotification);

// Broadcast notification to all users (optional role filter)
routes.post("/broadcast", verifyJWT, broadcastNotification);

export default routes;
