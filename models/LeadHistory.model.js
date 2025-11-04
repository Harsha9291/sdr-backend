import mongoose from "mongoose";

const leadHistorySchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Leads",
      required: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    actionType: {
      type: String,
      required: true,
    },
    status: {
      type: String,
    },
    previousStatus: {
      type: String,
    },
    comment: {
      type: String,
      trim: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    performedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const LeadHistory = mongoose.model("LeadHistory", leadHistorySchema);

export default LeadHistory;
