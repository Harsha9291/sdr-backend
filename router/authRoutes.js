import { Router } from "express";
import {
  createPassword,
  deleteUser,
  getAllUsers,
  getProfile,
  loginWithPassword,
  registerOrLogin,
  resendOtp,
  updatePassword,
  updateUserById,
  updateUserRoll,
  verifyOtp,
} from "../controllers/authController.js";
import {
  authorizeUserType,
  verifyJWT,
} from "../middlewares/authTypeMiddleware.js";

const routes = Router();

// auth
routes.route("/registerOrLogin").post(registerOrLogin);
routes.route("/verifyOtp").post(verifyOtp);
routes.route("/resendOtp").post(resendOtp);
routes.route("/update/:id").patch(updateUserById);
routes.route("/delete/:id").delete(verifyJWT,deleteUser);
routes.route("/getAllUsers").get(getAllUsers);
routes.route("/profile").get(verifyJWT,getProfile);
routes.route("/loginWithPassword").post(loginWithPassword);
routes.route("/createPassword").post(verifyJWT,createPassword);
routes.route("/updatePassword").post(verifyJWT,updatePassword);
routes.route("/updateRoll/:userId").put(updateUserRoll);




// routes.route("/sendOtp").post(register);
// routes.route("/login").post(login);

// routes.route("/registerUser").post(registerUser);
// routes.route("/getUserById/:id").get(getUserById);
// routes.route("/updateProfile/:id").patch(updateProfile);

// routes.route("/resetPassword").post(resetPassword);

export default routes;
