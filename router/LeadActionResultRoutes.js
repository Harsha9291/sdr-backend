import express from "express";
import {
  addLeadActionResult,
  getAllLeadActionResults,
  getLeadActionResultById,
  updateLeadActionResult,
  deleteLeadActionResult,
} from "../controllers/LeadActionResultController.js";

const router = express.Router();

router.post("/", addLeadActionResult);
router.get("/", getAllLeadActionResults);
router.get("/:id", getLeadActionResultById);
router.put("/:id", updateLeadActionResult);
router.delete("/:id", deleteLeadActionResult);

export default router;