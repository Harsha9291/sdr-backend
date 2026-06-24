import mongoose from "mongoose";
const LeadActionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    status: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

const LeadAction = mongoose.model("LeadAction", LeadActionSchema);
export default LeadAction;
