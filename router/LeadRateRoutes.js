import { Router } from "express";
import {
  addLeadRate,
  bulkAddLeadRates,
  getAllLeadRates,
  getLeadRateById,
  updateLeadRate,
  deleteLeadRate,
} from "../controllers/LeadRateController.js";

import { verifyJWT } from "../middlewares/authTypeMiddleware.js";

const routes = Router();

// ADD single rate
routes.route("/").post(verifyJWT, addLeadRate);

// BULK add
routes.route("/bulkAdd").post(verifyJWT, bulkAddLeadRates);

// GET all
routes.route("/").get(verifyJWT, getAllLeadRates);

// GET / UPDATE / DELETE by ID
routes
  .route("/:id")
  .get(verifyJWT, getLeadRateById)
  .patch(verifyJWT, updateLeadRate)
  .delete(verifyJWT, deleteLeadRate);

export default routes;
