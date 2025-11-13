import mongoose from "mongoose";

const LeadActionSchema = new mongoose.Schema(
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

const LeadAction = mongoose.model("LeadAction", LeadActionSchema);

export default LeadAction;
