import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const UserSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
    },
    otp: {
      type: String,
    },
    isNew: {
      type: Boolean,
      default: true,
      required: true,
    },
    otpExpiration: {
      type: Date,
      // required: true,
    },
    name: {
      type: String,
    },
    gender: {
      type: String,
    },
    employeeType: {
      type: String,
    },
    // roll: {
    //   type: String,
    //   enum: ["User", "Employee", "Admin"],
    //   default: "User",
    //   required: true,
    // },
    roll: {
      type: String,
      enum: ["Admin", "Manager", "Telecaller", "Employee"],
      default: "Telecaller",
      required: true,
    },

    dob: {
      type: Date,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    profilepic: {
      type: String,
    },
    occupation: {
      type: String,
    },
    address: {
      type: String,
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
      },
    },
    password: {
      type: String,
    },
    fcmToken: {
      type: String,
    },

    authToken: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  },
);

UserSchema.methods.matchPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

UserSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    { userId: this._id, accountType: this.accountType },
    process.env.JWT_SECRET,
  );
  return token;
};

const User = mongoose.model("User", UserSchema);

export default User;
