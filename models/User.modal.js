import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const UserSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
    },
    userId: {
      type: String,
    },
    otp: String,
    otpExpiration: Date,

    isNew: {
      type: Boolean,
      default: true,
      required: true,
    },
    name: String,
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },
    isBlock: {
      type: Boolean,
      default: false,
    },
    fcmToken: {
      type: String,
    },

    role: {
      type: String,
      enum: ["Admin", "Manager", "Telecaller", "Employee"],
      default: "Telecaller",
      required: true,
    },
    dob: Date,
    age: Number,
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },
    profilePic: String,
    address: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
    },
  },
  { timestamps: true },
);

UserSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    { userId: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: "365d" },
  );
};

export default mongoose.model("User", UserSchema);
