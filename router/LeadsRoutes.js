// routes/leadRoutes.js
import { Router } from "express";
import {
  addLead,
  updateLead,
  deleteLead,
  getAllLeads,
  getLeadById,
  bulkAddLeads,
  assignLeads,
} from "../controllers/LeadsController.js";
import { verifyJWT } from "../middlewares/authTypeMiddleware.js";

const routes = Router();

routes.route("/").post(verifyJWT, addLead);
routes.route("/bulkAddLeads").post(verifyJWT, bulkAddLeads);
routes.route("/assignLeads").post(verifyJWT, assignLeads);
routes.route("/:id").patch(verifyJWT, updateLead);
routes.route("/:id").delete(verifyJWT, deleteLead);
routes.route("/").get(verifyJWT, getAllLeads);
routes.route("/:id").get(verifyJWT, getLeadById);

export default routes;
