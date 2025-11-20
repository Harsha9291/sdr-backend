import User from "../models/User.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";

import { generateOTP } from "../utils/generateOTP.js";

import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { sendWhatsappOTP } from "../utils/sendOTP.js";

const OTP_EXPIRATION_TIME = 5 * 60 * 1000;

const createUser = asyncHandler(async (req, res) => {
  const {
    name,
    phone,
    employeeType,
    roll,
    email,
    gender,
    dob,
    address,
    occupation,
  } = req.body;

  if (!phone) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Phone number is required"));
  }

  const phoneRegex = /^[0-9]{10}$/;
  if (!phoneRegex.test(phone)) {
    return res
      .status(400)
      .json(
        new apiResponse(400, null, "Phone number must be exactly 10 digits")
      );
  }

  try {
    // Check if user already exists
    let existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res
        .status(400)
        .json(
          new apiResponse(400, null, "User with this phone already exists")
        );
    }

    const salt = await bcrypt.genSalt(10); // You can change the number of rounds if needed

    // Generate auto password
    // const plainPassword = generatePasswordFromName(name || "user");
    const plainPassword = `Abc@123`;
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    // Create new user
    const newUser = new User({
      phone,
      name,
      email,
      gender,
      dob,
      employeeType,
      roll,
      address,
      occupation,
      password: hashedPassword,
      isNew: false,
    });

    await newUser.save();

    return res.status(201).json(
      new apiResponse(
        201,
        {
          userId: newUser._id,
          phone: newUser.phone,
          name: newUser.name,
          roll: newUser.roll,
          password: plainPassword,
        },
        "User created successfully"
      )
    );
  } catch (error) {
    console.error("Error creating user:", error);
    return res
      .status(500)
      .json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const registerOrLogin = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Phone number is required"));
  }

  // Phone number must be exactly 10 digits
  const phoneRegex = /^[0-9]{10}$/;
  if (!phoneRegex.test(phone)) {
    return res
      .status(400)
      .json(
        new apiResponse(400, null, "Phone number must be exactly 10 digits")
      );
  }

  try {
    let user = await User.findOne({ phone });

    // OTP generate (special case for test number)
    const otp = phone === "1111111111" ? "0101" : generateOTP();
    const otpExpiration = new Date(Date.now() + OTP_EXPIRATION_TIME);

    await sendWhatsappOTP(phone, otp);

    if (user) {
      // ✅ Existing user → update OTP & set isNew = false (just in case)
      user.otp = otp;
      user.otpExpiration = otpExpiration;
      // user.isNew = false;
      await user.save();

      return res.status(200).json(
        new apiResponse(
          200,
          {
            phone,
            otp,
            isNew: user.isNew,
            _id: user._id,
          },
          "Existing user - OTP sent successfully"
        )
      );
    }

    // ✅ New user → create and save
    const newUser = new User({
      phone,
      otp,
      otpExpiration,
      isNew: true,
    });

    await newUser.save();

    return res
      .status(200)
      .json(
        new apiResponse(
          200,
          newUser,
          "New user created - OTP sent successfully"
        )
      );
  } catch (error) {
    console.error("Error in registerOrLogin:", error);
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Phone number and OTP are required"));
  }

  try {
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(400).json(new apiResponse(400, null, "User not found"));
    }

    // if (new Date() > user.otpExpiration) {
    //   return res.status(400).json(new apiResponse(400, null, "OTP has expired. Please resend the OTP"));
    // }

    if (user.otp !== otp) {
      return res.status(400).json(new apiResponse(400, null, "Invalid OTP"));
    }

    const token = user.generateAuthToken();

    const userDetails = {
      _id: user._id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      gender: user.gender,
      roll: user.roll,
      isNew: user.isNew,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      authToken: token,
    };

    res
      .status(200)
      .json(new apiResponse(200, userDetails, "OTP verified successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const resendOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Phone number is required"));
  }

  try {
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(400).json(new apiResponse(400, null, "User not found"));
    }

    // Generate new OTP
    const otp = generateOTP();
    const data = await sendWhatsappOTP(phone, otp);
    const otpExpiration = new Date(Date.now() + OTP_EXPIRATION_TIME); // Set expiration time

    user.otp = otp;
    user.otpExpiration = otpExpiration;
    await user.save();

    const userData = {
      phone,
      otp,
    };

    res
      .status(200)
      .json(new apiResponse(200, userData, "OTP resent successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const updateUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // Check if user exists
    let user = await User.findById(id);
    if (!user) {
      return res.status(404).json(new apiResponse(404, null, "User not found"));
    }

    // Update allowed fields dynamically
    Object.keys(req.body).forEach((key) => {
      user[key] = req.body[key];
    });
    user.isNew = false;

    await user.save();

    res
      .status(200)
      .json(new apiResponse(200, user, "User updated successfully"));
  } catch (error) {
    res
      .status(500)
      .json(
        new apiResponse(500, null, `Error updating user: ${error.message}`)
      );
  }
});

const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const getData = await User.findById(id);

    if (!getData) {
      return res.status(404).json(new apiResponse(404, null, "User not found"));
    }

    await User.findByIdAndDelete(id);

    res
      .status(200)
      .json(new apiResponse(200, null, " user deleted successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const getAllUsers = asyncHandler(async (req, res) => {
  try {
    const {
      isPagination = "true",
      page = 1,
      limit = 10,
      search,
      sortBy = "recent",
      roll,
      employeeType,
    } = req.query;

    const match = {};

    // -----------------------------
    // Apply Filters
    // -----------------------------
    if (roll) {
      match.roll = roll; // "User", "Admin", "Employee"
    }

    if (employeeType) {
      match.employeeType = employeeType;
    }

    let pipeline = [{ $match: match }];

    // -----------------------------
    // Global Search
    // -----------------------------
    if (search) {
      const words = search
        .trim()
        .split(/\s+/)
        .map((w) => new RegExp(w.replace(/’/g, "'"), "i"));

      const orConditions = words.flatMap((regex) => [
        { name: { $regex: regex } },
        { phone: { $regex: regex } },
        { email: { $regex: regex } },
      ]);

      pipeline.push({ $match: { $or: orConditions } });
    }

    // -----------------------------
    // Sorting
    // -----------------------------
    if (sortBy === "recent") {
      pipeline.push({ $sort: { updatedAt: -1, createdAt: -1, _id: -1 } });
    } else if (sortBy === "oldest") {
      pipeline.push({ $sort: { createdAt: 1, updatedAt: 1, _id: 1 } });
    } else {
      pipeline.push({ $sort: { _id: -1 } });
    }

    // -----------------------------
    // Count Total
    // -----------------------------
    const totalUsersArr = await User.aggregate([
      ...pipeline,
      { $count: "count" },
    ]);

    const total = totalUsersArr[0]?.count || 0;

    // -----------------------------
    // Pagination (Only if true)
    // -----------------------------
    if (isPagination === "true") {
      pipeline.push({ $skip: (page - 1) * limit }, { $limit: parseInt(limit) });
    }

    // -----------------------------
    // Final Query
    // -----------------------------
    const users = await User.aggregate(pipeline);

    return res.status(200).json(
      new apiResponse(
        200,
        {
          users,
          totalUsers: total,
          totalPages: isPagination === "true" ? Math.ceil(total / limit) : 1,
          currentPage: isPagination === "true" ? Number(page) : 1,
        },
        "Users fetched successfully"
      )
    );
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const getProfile = async (req, res) => {
  try {
    const data = req.user;
    res
      .status(200)
      .json(new apiResponse(200, data, "Users fetched successfully"));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const loginWithPassword = asyncHandler(async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res
      .status(400)
      .json(
        new apiResponse(400, null, "Phone number and password are required")
      );
  }

  try {
    const existingUser = await User.findOne({ phone });

    if (!existingUser) {
      return res.status(400).json(new apiResponse(400, null, "User not found"));
    }

    // Check if password is not set for this user
    if (!existingUser.password) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Password is not set for this user"));
    }

    const isPasswordCorrect = await existingUser.matchPassword(password);

    if (!isPasswordCorrect) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid password"));
    }

    // Generate a JWT token for login
    const token = existingUser.generateAuthToken();

    const userData = {
      _id: existingUser._id,
      phone: existingUser.phone,
      name: existingUser.name,
      email: existingUser.email,
      gender: existingUser.gender,
      isNew: existingUser.isNew,
      roll: existingUser.roll,
      createdAt: existingUser.createdAt,
      updatedAt: existingUser.updatedAt,
      authToken: token,
    };

    res.status(200).json(new apiResponse(200, userData, "Login successful"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const createPassword = asyncHandler(async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res
      .status(400)
      .json(
        new apiResponse(400, null, "Phone number and password are required")
      );
  }

  try {
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(400).json(new apiResponse(400, null, "User not found"));
    }

    // Check if the user has already set the password
    if (user.password) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Password already set for this user"));
    }

    const salt = await bcrypt.genSalt(10); // You can change the number of rounds if needed

    user.password = await bcrypt.hash(password, salt);

    await user.save();

    res
      .status(200)
      .json(new apiResponse(200, null, "Password created successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const resetPassword = asyncHandler(async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res
      .status(400)
      .json(
        new apiResponse(400, null, "Phone number and password are required")
      );
  }

  try {
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(400).json(new apiResponse(400, null, "User not found"));
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    res
      .status(200)
      .json(new apiResponse(200, null, "Password Reset successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const updatePassword = asyncHandler(async (req, res) => {
  const { phone, oldPassword, newPassword } = req.body;

  if (!phone || !oldPassword || !newPassword) {
    return res
      .status(400)
      .json(
        new apiResponse(
          400,
          null,
          "Phone number, old password, and new password are required"
        )
      );
  }

  const user = await User.findOne({ phone });

  if (!user) {
    return res.status(400).json(new apiResponse(400, null, "User not found"));
  }

  // Check if the old password matches
  const isOldPasswordCorrect = await user.matchPassword(oldPassword);
  if (!isOldPasswordCorrect) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid old password"));
  }

  // Hash and update with new password
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);

  await user.save();

  res
    .status(200)
    .json(new apiResponse(200, null, "Password updated successfully"));
});

const updateUserRoll = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { roll } = req.body;

  if (!userId || !roll) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "User ID and roll are required"));
  }

  if (!["User", "Admin"].includes(roll)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid roll value"));
  }

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json(new apiResponse(404, null, "User not found"));
  }

  user.roll = roll;
  await user.save();

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        { userId: user._id, roll: user.roll },
        "Roll updated successfully"
      )
    );
});

export {
  registerOrLogin,
  createUser,
  verifyOtp,
  resendOtp,
  updateUserById,
  getAllUsers,
  getProfile,
  loginWithPassword,
  createPassword,
  updateUserRoll,
  updatePassword,
  resetPassword,
  deleteUser,
};
