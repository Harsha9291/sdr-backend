import mongoose from "mongoose";
const LeadActionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    LeadActionId: {
      type: Number,
      unique: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

LeadActionSchema.pre("save", async function (next) {
  if (this.LeadActionId) return next();

  try {
    const lastPlatform = await mongoose
      .model("LeadAction")
      .findOne({}, { LeadActionId: 1 })
      .sort({ LeadActionId: -1 });

    // If none exist, start from 1
    this.LeadActionId = lastPlatform ? lastPlatform.LeadActionId + 1 : 1;

    next();
  } catch (err) {
    next(err);
  }
});

const LeadAction = mongoose.model("LeadAction", LeadActionSchema);
export default LeadAction;
