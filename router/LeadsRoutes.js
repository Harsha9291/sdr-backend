import { Router } from "express";
import {
  addLead,
  updateLead,
  deleteLead,
  getAllLeads,
  getLeadById,
  bulkAddLeads,
  assignLeads,
  getLeadCountByStatus,
  updateStatus,
  transferSingleLead,
  getDashboardStats,
} from "../controllers/LeadsController.js";

import { verifyJWT } from "../middlewares/authTypeMiddleware.js";

const routes = Router();

/* ==========================
   LEADS
========================== */

routes.route("/").post(verifyJWT, addLead).get(verifyJWT, getAllLeads);

routes.route("/bulkAddLeads").post(verifyJWT, bulkAddLeads);

routes.route("/assignLeads").post(verifyJWT, assignLeads);

/* ==========================
   DASHBOARD / STATS
========================== */

routes.route("/dashboard-stats").get(verifyJWT, getDashboardStats);

routes.route("/getLeadCountByStatus").get(verifyJWT, getLeadCountByStatus);

/* ==========================
   LEAD ACTIONS
========================== */

routes.route("/transfer/:leadId").post(verifyJWT, transferSingleLead);

routes.route("/updateStatus/:id").patch(verifyJWT, updateStatus);

/* ==========================
   LEAD BY ID
========================== */

routes
  .route("/:id")
  .get(verifyJWT, getLeadById)
  .patch(verifyJWT, updateLead)
  .delete(verifyJWT, deleteLead);

export default routes;
