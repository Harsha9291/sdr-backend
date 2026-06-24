import { Router } from "express";
import { blockUser, createPassword, deleteUser, getAllUsers, getProfile, getUserById, loginWithPassword, registerOrLogin, registerUser, resendOtp, sendOtp, updatePassword, updateUserById, updateUserRoll, verifyOtp } from "../controllers/authController.js";
import { verifyJWT } from "../middlewares/authTypeMiddleware.js";


const routes = Router();

routes.post("/registerOrLogin", registerOrLogin);
routes.post("/registerUser", registerUser);
routes.post("/verifyOtp", verifyOtp);
routes.post("/sendOtp", sendOtp);
routes.post("/resendOtp", resendOtp);
routes.patch("/update/:id", updateUserById);
routes.delete("/delete/:id", verifyJWT, deleteUser);
routes.get("/getAllUsers", getAllUsers);
routes.get("/profile", verifyJWT, getProfile);
routes.post("/loginWithPassword", loginWithPassword);
routes.post("/createPassword", createPassword);
routes.post("/updatePassword", verifyJWT, updatePassword);
routes.put("/updateRoll/:userId", updateUserRoll);
routes.put("/blockUser/:userId", verifyJWT, blockUser);

routes.get("/user/:userId", getUserById);

export default routes;