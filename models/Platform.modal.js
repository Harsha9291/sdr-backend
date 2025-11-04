import mongoose from "mongoose";

const PlatformSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Platform = mongoose.model("Platform", PlatformSchema);

export default Platform;
