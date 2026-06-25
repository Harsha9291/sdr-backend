

import mongoose from "mongoose";

const LeadsSchema = new mongoose.Schema(
  {
    leadCode: {
      type: String,
      unique: true,
      index: true,
      default: function () {
        const now = new Date();

        const yy = now.getFullYear().toString().slice(-2);
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const dd = String(now.getDate()).padStart(2, "0");

        const random = Math.floor(
          1000 + Math.random() * 9000
        );

        return `${dd}${random}`;
      },
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
    actionResult: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeadActionResult",
    },
    status: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeadStatus",
    },

    prevAction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeadAction",
    },

    prevActionResult: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeadActionResult",
    },
    prevStatus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeadStatus",
    },

    siteVisitDate: Date,

    nextAction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeadAction",
    },

    followUpDate: Date,
    followUpTime: String,

    currentStatus: {
      type: String,
      default: "Fresh",
    },

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
  },
);

// For SINGLE insert (save)
// Already handled using `default`, but keep for safety
LeadsSchema.pre("save", function (next) {
  if (!this.leadCode) {
    const randomNumber = Math.floor(10000000 + Math.random() * 90000000);
    this.leadCode = `LEAD-${randomNumber}`;
  }
  next();
});

// For BULK insert (insertMany)
LeadsSchema.pre("insertMany", function (next, docs) {
  docs.forEach((doc) => {
    if (!doc.leadCode) {
      const now = new Date();

      const yy = now.getFullYear().toString().slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");

      const randomNumber = Math.floor(1000 + Math.random() * 9000);
      doc.leadCode = `${dd}${randomNumber}`;
    }
  });
  next();
});

const Leads = mongoose.model("Leads", LeadsSchema);
export default Leads;
