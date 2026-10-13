import { Router } from "express";
import {
  stockIn,
  stockOut,
  getTransactions,
  getStockReport,
  getCurrentStock,
} from "../controllers/StockController.js";
import { verifyJWT } from "../middlewares/authTypeMiddleware.js";

const routes = Router();

/* ==========================
   STOCK MANAGEMENT
========================== */

// Stock In / Stock Out
routes.route("/in").post(verifyJWT, stockIn);
routes.route("/out").post(verifyJWT, stockOut);

// Transaction history (with filters: productId, type, startDate, endDate, page, limit)
routes.route("/transactions").get(verifyJWT, getTransactions);

// Full stock report with aggregated IN/OUT per product
routes.route("/report").get(verifyJWT, getStockReport);

// Quick current stock levels (optional ?lowStock=true to filter low-stock only)
routes.route("/current").get(verifyJWT, getCurrentStock);

export default routes;
