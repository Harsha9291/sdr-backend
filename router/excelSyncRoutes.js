import { Router } from "express";
import {
  syncLeadsFromExcel,
  getSyncStatus,
  forceSync,
} from "../controllers/ExcelSyncController.js";
import { verifyJWT } from "../middlewares/authTypeMiddleware.js";

const routes = Router();

// 📥 Sync leads from Excel
routes.post("/sync", verifyJWT, syncLeadsFromExcel);

// 📊 Get sync status
routes.get("/status", verifyJWT, getSyncStatus);

// 🔄 Force sync
routes.post("/force-sync", verifyJWT, forceSync);

export default routes;
