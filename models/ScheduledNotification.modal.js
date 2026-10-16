import mongoose from 'mongoose';

const ScheduledNotificationSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Leads',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LeadAction',
    },
    actionTitle: String,
    leadName: String,
    leadPhone: String,
    leadEmail: String,
    fcmToken: {
      type: String,
      required: true,
    },
    scheduledDateTime: {
      type: Date,
      required: true,
    },
    notificationType: {
      type: String,
      enum: [
        'reminder_30min',
        'reminder_10min',
        'reminder_1min',
        'reminder_exact',
        'reminder_overdue',
      ],
      required: true,
    },
    minutesBefore: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['scheduled', 'sent', 'failed', 'cancelled'],
      default: 'scheduled',
    },
    sentAt: Date,
    messageId: String,
    errorMessage: String,
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
  },
  { timestamps: true },
);

// Index for efficient querying of pending notifications
ScheduledNotificationSchema.index({
  status: 1,
  scheduledDateTime: 1,
});

ScheduledNotificationSchema.index({ leadId: 1 });
ScheduledNotificationSchema.index({ userId: 1 });

export default mongoose.model('ScheduledNotification', ScheduledNotificationSchema);
