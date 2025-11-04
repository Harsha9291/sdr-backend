import { Router } from "express";
import {
  addPlatform,
  bulkAddPlatforms,
  getAllPlatforms,
  getPlatformById,
  updatePlatform,
  deletePlatform,
} from "../controllers/PlatformController.js";
import { verifyJWT } from "../middlewares/authTypeMiddleware.js";

const routes = Router();

routes.route("/").post(verifyJWT, addPlatform);
routes.route("/bulkAdd").post(verifyJWT, bulkAddPlatforms);
routes.route("/").get(verifyJWT, getAllPlatforms);
routes
  .route("/:id")
  .get(verifyJWT, getPlatformById)
  .patch(verifyJWT, updatePlatform)
  .delete(verifyJWT, deletePlatform);

export default routes;
