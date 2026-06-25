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
    action: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeadAction",
    },
    actionResult: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeadActionResult",
    },
    status: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeadStatus",
    },

    prevAction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeadAction",
    },

    prevActionResult: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeadActionResult",
    },
    prevStatus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeadStatus",
    },

    nextAction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeadAction",
    },
    currentStatus: {
      type: String,
    },
    siteVisitDate: {
      type: String,
    },
    followUpDate: {
      type: String,
    },
    followUpTime: {
      type: String,
    },
    remark: {
      type: String,
      trim: true,
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
