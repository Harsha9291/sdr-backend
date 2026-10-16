import mongoose from 'mongoose';

const ScheduledNotificationSchema = new mongoose.Schema({
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Leads', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  leadName: String,
  actionTitle: String,
  fcmToken: { type: String, required: true },
  type: { type: String, enum: ['30min', '10min', '1min', 'exact'], required: true },
  scheduledTime: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'sent', 'failed', 'cancelled'], default: 'pending' },
  sentAt: Date,
  error: String,
  createdAt: { type: Date, default: Date.now }
});

// Index for fast queries
ScheduledNotificationSchema.index({ status: 1, scheduledTime: 1 });
ScheduledNotificationSchema.index({ leadId: 1 });

export default mongoose.model('ScheduledNotification', ScheduledNotificationSchema);

