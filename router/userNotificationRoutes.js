import { Router } from "express";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
  deleteNotification,
} from "../controllers/userNotificationController.js";
import { verifyJWT } from "../middlewares/authTypeMiddleware.js";

const routes = Router();

/**
 * 🔔 User Notification Routes
 * All routes require JWT authentication
 */

// Get all notifications for logged-in user
routes.get("/", verifyJWT, getUserNotifications);

// Get unread notification count
routes.get("/unread-count", verifyJWT, getUnreadNotificationCount);

// Mark specific notification as read
routes.patch("/:notificationId/read", verifyJWT, markNotificationAsRead);

// Mark all notifications as read
routes.patch("/read-all", verifyJWT, markAllNotificationsAsRead);

// Delete notification
routes.delete("/:notificationId", verifyJWT, deleteNotification);

export default routes;
