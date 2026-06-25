// routes/leadHistoryRoutes.js
import { Router } from "express";
import {
  addLeadHistory,
  deleteLeadHistory,
  getLeadHistoryById,
  getAllLeadHistory,
  getLeadHistoryByLead,
} from "../controllers/LeadHistoryController.js";
import { verifyJWT } from "../middlewares/authTypeMiddleware.js";

const routes = Router();

routes.route("/").post(verifyJWT, addLeadHistory);
routes.route("/").get(getAllLeadHistory);
routes.route("/:id").get(verifyJWT, getLeadHistoryById);
routes.route("/:id").delete(verifyJWT, deleteLeadHistory);

routes.route("/lead/:leadId").get(verifyJWT, getLeadHistoryByLead);

export default routes;
