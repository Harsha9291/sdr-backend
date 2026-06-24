import mongoose from "mongoose";
const LeadStatusSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
   
    leadActionResult: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeadActionResult",
    },
    status: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);


const LeadStatus = mongoose.model("LeadStatus", LeadStatusSchema);
export default LeadStatus;
