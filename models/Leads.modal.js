// import mongoose from "mongoose";

// const LeadsSchema = new mongoose.Schema(
//   {
//     leadCode: {
//       type: String,
//       unique: true,
//       index: true,
//     },
//     phone: {
//       type: String,
//       required: true,
//     },
//     name: String,
//     gender: {
//       type: String,
//       enum: ["Male", "Female", "Other"],
//     },
//     email: {
//       type: String,
//       trim: true,
//       lowercase: true,
//     },
//     platform: Number,
//     action: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "LeadAction",
//     },

//     status: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "LeadStatus",
//     },
//     prevAction: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "LeadAction",
//     },
//     prevStatus: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "LeadStatus",
//     },
//     siteVisitDate: Date,
//     // NEXT
//     nextAction: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "LeadAction",
//     },
//     followUpDate: Date,
//     followUpTime: String,
//     currentStatus: {
//       type: String,
//       default: "Fresh",
//     },
//     remark: String,
//     comment: String,

//     assignTo: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//     },

//     leadDate: {
//       type: Date,
//       default: Date.now,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// // ⚙️ Pre-save hook to generate unique numeric lead code
// LeadsSchema.pre("save", function (next) {
//   if (this.leadCode) return next();

//   // Generate a random 8-digit number
//   const randomNumber = Math.floor(10000000 + Math.random() * 90000000);

//   this.leadCode = `LEAD-${randomNumber}`;
//   next();
// });

// const Leads = mongoose.model("Leads", LeadsSchema);
// export default Leads;

import mongoose from "mongoose";

const LeadsSchema = new mongoose.Schema(
  {
    leadCode: {
      type: String,
      unique: true,
      index: true,
      default: function () {
        const randomNumber = Math.floor(10000000 + Math.random() * 90000000);
        return `LEAD-${randomNumber}`;
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
  }
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
      const randomNumber = Math.floor(10000000 + Math.random() * 90000000);
      doc.leadCode = `LEAD-${randomNumber}`;
    }
  });
  next();
});

const Leads = mongoose.model("Leads", LeadsSchema);
export default Leads;
