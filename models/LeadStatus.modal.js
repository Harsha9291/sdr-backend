import mongoose from "mongoose";
const LeadStatusSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    LeadStatusId: {
      type: Number,
      unique: true,
      index: true,
    },
    action: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeadAction",
    },
  },
  {
    timestamps: true,
  }
);

LeadStatusSchema.pre("save", async function (next) {
  if (this.LeadStatusId) return next();

  try {
    const lastPlatform = await mongoose
      .model("LeadStatus")
      .findOne({}, { LeadStatusId: 1 })
      .sort({ LeadStatusId: -1 });

    // If none exist, start from 1
    this.LeadStatusId = lastPlatform ? lastPlatform.LeadStatusId + 1 : 1;

    next();
  } catch (err) {
    next(err);
  }
});

const LeadStatus = mongoose.model("LeadStatus", LeadStatusSchema);
export default LeadStatus;
