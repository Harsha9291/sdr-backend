import mongoose from "mongoose";

const LeadActionResultSchema = new mongoose.Schema(
  {
    leadAction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeadAction",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
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
  }
);

const LeadActionResult = mongoose.model(
  "LeadActionResult",
  LeadActionResultSchema
);

export default LeadActionResult;