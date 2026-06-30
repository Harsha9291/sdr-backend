import express from "express";
import {
  getDashboardAnalytics,
  getYearlyAnalytics,
  getStatusWiseLeads,
  getMonthlyTrend,
} from "../controllers/dashboardController.js";


const router = express.Router();

// Get complete dashboard analytics
router.get("/analytics", getDashboardAnalytics);

// Get yearly analytics
router.get("/yearly-analytics",getYearlyAnalytics);

// Get status-wise leads only
router.get("/status-wise", getStatusWiseLeads);

// Get monthly trend only
router.get("/monthly-trend", getMonthlyTrend);

export default router;