import express from "express";

import {
    addIntegration,
    getAllIntegrations,
    getIntegrationById,
    updateIntegration,
    deleteIntegration,
} from "../controllers/IntigrationController.js";

const router = express.Router();

router.post("/", addIntegration);

router.get("/", getAllIntegrations);

router.get("/:id", getIntegrationById);

router.put("/:id", updateIntegration);

router.delete("/:id", deleteIntegration);

export default router;