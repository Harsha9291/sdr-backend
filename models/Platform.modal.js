import mongoose from "mongoose";

const PlatformSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    PlatformId: {
      type: Number,
      unique: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

PlatformSchema.pre("save", async function (next) {
  if (this.PlatformId) return next();

  try {
    const lastPlatform = await mongoose
      .model("Platform")
      .findOne({}, { PlatformId: 1 })
      .sort({ PlatformId: -1 });

    // If none exist, start from 1
    this.PlatformId = lastPlatform ? lastPlatform.PlatformId + 1 : 1;

    next();
  } catch (err) {
    next(err);
  }
});

const Platform = mongoose.model("Platform", PlatformSchema);
export default Platform;
