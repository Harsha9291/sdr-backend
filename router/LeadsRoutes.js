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
   getLeadStatusStats,
} from "../controllers/LeadsController.js";

import { verifyJWT } from "../middlewares/authTypeMiddleware.js";

const routes = Router();

/* ==========================
   LEADS
========================== */

routes.route("/").post(verifyJWT, addLead).get(getAllLeads);

routes.route("/bulkAddLeads").post(verifyJWT, bulkAddLeads);
routes.route("/getLeadStatusStats").get(getLeadStatusStats);

routes.route("/assignLeads").post(verifyJWT, assignLeads);

/* ==========================
   DASHBOARD / STATS
========================== */

routes.route("/dashboard-stats").get(verifyJWT, getLeadStatusStats);

routes.route("/getLeadCountByStatus").get(getLeadCountByStatus);

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
