import { Router } from "express";
import {
  addLeadAction,
  bulkAddLeadActions,
  getAllLeadActions,
  getLeadActionById,
  updateLeadAction,
  deleteLeadAction,
} from "../controllers/LeadActionController.js";
import { verifyJWT } from "../middlewares/authTypeMiddleware.js";

const routes = Router();

routes.route("/").post(verifyJWT, addLeadAction);
routes.route("/bulkAdd").post(verifyJWT, bulkAddLeadActions);
routes.route("/").get(verifyJWT, getAllLeadActions);
routes
  .route("/:id")
  .get(verifyJWT, getLeadActionById)
  .patch(verifyJWT, updateLeadAction)
  .delete(verifyJWT, deleteLeadAction);

export default routes;
