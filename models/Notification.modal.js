import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["Lead", "Status", "Reminder", "System", "Bill", "Complaint", "Disconnection"],
      default: "System",
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

// Index for fetching user notifications sorted by date
NotificationSchema.index({ userId: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", NotificationSchema);

export default Notification;
