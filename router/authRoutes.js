import { Router } from "express";
import { blockUser, createPassword, deleteUser, getAllUsers, getProfile, getUserById, loginWithPassword, registerOrLogin, registerUser, resendOtp, sendOtp, updatePassword, updateUserById, updateUserRoll, verifyOtp, updateFCMToken } from "../controllers/authController.js";
import { verifyJWT } from "../middlewares/authTypeMiddleware.js";
import { ipWhitelist } from "../middlewares/ipWhitelist.js";

const routes = Router();

/* ── Public: IP check (so frontend/admin can see their IP) ── */
routes.get("/my-ip", (req, res) => {
  const forwarded = req.headers["x-forwarded-for"];
  const raw = forwarded
    ? forwarded.split(",")[0].trim()
    : req.headers["x-real-ip"] || req.socket?.remoteAddress || "";
  const ip = raw.replace(/^::ffff:/, "");

  const allowedIps = (process.env.ALLOWED_IPS || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  return res.status(200).json({
    success: true,
    yourIp: ip,
    isAllowed: allowedIps.length === 0 || allowedIps.includes(ip),
    restrictionEnabled: allowedIps.length > 0,
  });
});

/* ── Login routes — protected by IP whitelist ── */
routes.post("/loginWithPassword", ipWhitelist, loginWithPassword);
routes.post("/registerOrLogin",   ipWhitelist, registerOrLogin);   // OTP login step 1
routes.post("/verifyOtp",         ipWhitelist, verifyOtp);         // OTP login step 2

/* ── Other auth routes (no IP restriction) ── */
routes.post("/registerUser",    registerUser);
routes.post("/sendOtp",         sendOtp);
routes.post("/resendOtp",       resendOtp);
routes.patch("/update/:id",     updateUserById);
routes.patch("/updateFCMToken", verifyJWT, updateFCMToken);
routes.delete("/delete/:id",    verifyJWT, deleteUser);
routes.get("/getAllUsers",       getAllUsers);
routes.get("/profile",          verifyJWT, getProfile);
routes.post("/createPassword",  createPassword);
routes.post("/updatePassword",  verifyJWT, updatePassword);
routes.put("/updateRoll/:userId", updateUserRoll);
routes.put("/blockUser/:userId",  verifyJWT, blockUser);
routes.patch("/suspend/:id",      verifyJWT, blockUser);
routes.get("/user/:userId",       getUserById);

export default routes;