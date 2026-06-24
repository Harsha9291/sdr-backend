import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import cors from "cors";
import authRoutes from "./router/authRoutes.js";
import uploadRoutes from "./router/uploadRoutes.js";
import leadsRoutes from "./router/LeadsRoutes.js";
import platformRoutes from "./router/PlatformRoutes.js";
import leadsLogRoutes from "./router/leadHistoryRoutes.js";
import leadStatusRoutes from "./router/LeadStatusRoutes.js";
import leadActionRoutes from "./router/LeadActionRoutes.js";
import leadActionResultRoutes from "./router/LeadActionResultRoutes.js";
import leadRateRoutes from "./router/LeadRateRoutes.js";
import { startAllCronJobs } from "./utils/cronJobs.js";
import excelSyncRoutes from "./router/excelSyncRoutes.js";

dotenv.config();

const app = express();

const clientUrl = process.env.CLIENT_URL;

app.use(
  cors({
    origin: clientUrl || "*",
    credentials: true,
  }),
);

app.use(express.json());

app.use("/api/upload", uploadRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/platform", platformRoutes);
app.use("/api/leadAction", leadActionRoutes);
app.use("/api/leadActionResult", leadActionResultRoutes);
app.use("/api/leads", leadsRoutes);
app.use("/api/leadsLog", leadsLogRoutes);
app.use("/api/leadStatus", leadStatusRoutes);
app.use("/api/leadRate", leadRateRoutes);
app.use("/api/excel", excelSyncRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  connectDB();
  startAllCronJobs();
});
