import mongoose from "mongoose";

const LeadStatusSchema = new mongoose.Schema(
  {
    title: {
      type: String,
    },
    status: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const LeadStatus = mongoose.model("LeadStatus", LeadStatusSchema);

export default LeadStatus;
