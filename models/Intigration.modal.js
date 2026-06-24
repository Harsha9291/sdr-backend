import mongoose from "mongoose";
const IntegrationSchema = new mongoose.Schema(
  {
    platform: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Platform",
      required: true,
    },

    googleSheetUrl: {
      type: String,
    },
    fetchTime: {
      type: String,
    },
    status: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const Integration = mongoose.model("Integration", IntegrationSchema);
export default Integration;
