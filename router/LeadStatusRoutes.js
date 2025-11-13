import { Router } from "express";
import {
  addLeadStatus,
  bulkAddLeadStatuses,
  getAllLeadStatuses,
  getLeadStatusById,
  updateLeadStatus,
  deleteLeadStatus,
} from "../controllers/LeadStatusController.js";
import { verifyJWT } from "../middlewares/authTypeMiddleware.js";

const routes = Router();

routes.route("/").post(verifyJWT, addLeadStatus);
routes.route("/bulkAdd").post(verifyJWT, bulkAddLeadStatuses);
routes.route("/").get(verifyJWT, getAllLeadStatuses);
routes
  .route("/:id")
  .get(verifyJWT, getLeadStatusById)
  .patch(verifyJWT, updateLeadStatus)
  .delete(verifyJWT, deleteLeadStatus);

export default routes;
