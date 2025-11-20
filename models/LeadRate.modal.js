import mongoose from "mongoose";
const LeadRateSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    LeadRateId: {
      type: Number,
      unique: true,
      index: true,
    },
    actionStatus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeadStatus",
    },
  },
  {
    timestamps: true,
  }
);

LeadRateSchema.pre("save", async function (next) {
  if (this.LeadRateId) return next();

  try {
    const lastPlatform = await mongoose
      .model("LeadRate")
      .findOne({}, { LeadRateId: 1 })
      .sort({ LeadRateId: -1 });

    // If none exist, start from 1
    this.LeadRateId = lastPlatform ? lastPlatform.LeadRateId + 1 : 1;

    next();
  } catch (err) {
    next(err);
  }
});

const LeadRate = mongoose.model("LeadRate", LeadRateSchema);
export default LeadRate;
