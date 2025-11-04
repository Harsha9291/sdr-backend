import mongoose from "mongoose";

const LeadsSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
    },
    name: {
      type: String,
    },
    gender: {
      type: String,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    platfrom: {
      type: String,
    },
    status: {
      type: String,
    },
    remark: {
      type: String,
    },
    comment: {
      type: String,
    },
    assignTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    leadDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const Leads = mongoose.model("Leads", LeadsSchema);

export default Leads;
