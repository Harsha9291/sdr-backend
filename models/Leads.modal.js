import mongoose from "mongoose";

const LeadsSchema = new mongoose.Schema(
  {
    leadCode: {
      type: String,
      unique: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
    },
    name: String,
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    platform: Number,
    action: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeadAction",
    },
    status: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeadStatus",
    },
    prevAction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeadAction",
    },
    prevStatus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeadStatus",
    },

    followUpDate: Date,
    followUpTime: String,
    remark: String,
    comment: String,

    assignTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    leadDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// ⚙️ Pre-save hook to generate unique numeric lead code
LeadsSchema.pre("save", function (next) {
  if (this.leadCode) return next();

  // Generate a random 8-digit number
  const randomNumber = Math.floor(10000000 + Math.random() * 90000000);

  this.leadCode = `LEAD-${randomNumber}`;
  next();
});

const Leads = mongoose.model("Leads", LeadsSchema);
export default Leads;
