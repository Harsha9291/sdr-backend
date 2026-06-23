import axios from "axios";
import XLSX from "xlsx";
import mongoose from "mongoose";
import Leads from "../models/Leads.modal.js";
import LeadHistory from "../models/LeadHistory.model.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import Platform from "../models/Platform.modal.js";
import LeadAction from "../models/LeadAction.modal.js";
import LeadStatus from "../models/LeadStatus.modal.js";
import User from "../models/User.modal.js";
import {
  EXCEL_URL,
  BATCH_SIZE,
  EXCEL_DOWNLOAD_TIMEOUT,
} from "../utils/constants.js";

// Track last sync to avoid duplicate processing
let lastSyncHash = null;
let isSyncing = false;

/**
 * ======================================================
 *   📥 SYNC LEADS FROM EXCEL
 *   Can be called by CRON job or manually via API
 * ======================================================
 */
const syncLeadsFromExcel = async (req = null, res = null) => {
  try {
    // Prevent concurrent syncs
    if (isSyncing) {
      console.log("⏳ Sync already in progress...");
      if (res) {
        return res
          .status(200)
          .json(new apiResponse(200, null, "Sync already in progress..."));
      }
      return { error: "Sync already in progress" };
    }

    isSyncing = true;
    console.log(`🔄 Excel Sync started at: ${new Date().toISOString()}`);

    // ========== 1️⃣ DOWNLOAD EXCEL ==========
    console.log("📥 Downloading Excel from:", EXCEL_URL);
    const response = await axios.get(EXCEL_URL, {
      responseType: "arraybuffer",
      timeout: EXCEL_DOWNLOAD_TIMEOUT,
    });
    console.log(`✅ Download complete: ${response.data.length} bytes`);

    // ========== 2️⃣ PARSE EXCEL ==========
    console.log("📄 Parsing Excel file...");
    const workbook = XLSX.read(response.data, { type: "buffer" });
    console.log(`📋 Workbook sheets: ${workbook.SheetNames.join(", ")}`);

    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const excelData = XLSX.utils.sheet_to_json(firstSheet);


    if (!excelData || excelData.length === 0) {
      isSyncing = false;
      if (res) {
        return res
          .status(200)
          .json(
            new apiResponse(200, null, "Excel file is empty. No data to sync."),
          );
      }
      return { totalInExcel: 0, newLeadsInserted: 0, duplicatesSkipped: 0 };
    }

    // ========== 3️⃣ CHECK FOR CHANGES ==========
    const currentHash = JSON.stringify(excelData).length;
    const force = req?.query?.force === "true";



    if (lastSyncHash === currentHash && !force) {
      isSyncing = false;
      console.log("✅ No changes detected in Excel. Sync skipped.");
      if (res) {
        return res
          .status(200)
          .json(
            new apiResponse(
              200,
              null,
              "No changes detected in Excel. Sync skipped.",
            ),
          );
      }
      return {
        totalInExcel: excelData.length,
        newLeadsInserted: 0,
        duplicatesSkipped: 0,
        skipped: true,
        message: "No changes detected",
      };
    }

    // ========== 4️⃣ PROCESS LEADS ==========
    console.log("🔄 Processing leads...");
    const leadsToInsert = [];
    const duplicatePhones = [];

    // Show sample data
    if (excelData.length > 0) {

    }

    for (const [index, row] of excelData.entries()) {
      const phone =
        row["Phone"] ||
        row["phone"] ||
        row["Mobile"] ||
        row["mobile"] ||
        row["Contact"] ||
        "";


      if (!phone) {
        continue;
      }

      // Check if lead already exists
      const existingLead = await Leads.findOne({
        phone: phone.toString().trim(),
      });

      if (existingLead) {
        duplicatePhones.push(phone);
        continue;
      }

      // Platform Mapping
      const platformDoc = await Platform.findOne({
        title: { $regex: `^${row["Platform"]}$`, $options: "i" },
      });

      // Action Mapping
      const actionDoc = await LeadAction.findOne({
        title: { $regex: `^${row["Action"]}$`, $options: "i" },
      });

      // Status Mapping
      const statusDoc = await LeadStatus.findOne({
        title: { $regex: `^${row["Status"]}$`, $options: "i" },
      });

      // User Mapping
      const userDoc = await User.findOne({
        name: { $regex: `^${row["Assign To"]}$`, $options: "i" },
      });

      const leadData = {
        phone: phone.toString().trim(),

        name: row["Name"] || "",

        gender: row["Gender"] || "",

        email: row["Email"] || "",

        // Platform Number expected
        platform: platformDoc?.PlatformId || 0,

        // ObjectIds expected
        action: actionDoc?._id || null,

        status: statusDoc?._id || null,

        assignTo: userDoc?._id || null,

        remark: row["Remark"] || row["Comments"] || row["Notes"] || "",

        currentStatus: row["Current Status"] || row["Status"] || "Fresh",

        leadDate: new Date(),
      };
  
      leadsToInsert.push(leadData);
    }



    // ========== 5️⃣ BULK INSERT ==========
    let insertedLeads = [];
    if (leadsToInsert.length > 0) {

      try {
        for (let i = 0; i < leadsToInsert.length; i += BATCH_SIZE) {
          const batch = leadsToInsert.slice(i, i + BATCH_SIZE);
      
          try {
            const inserted = await Leads.insertMany(batch, { ordered: false });
            insertedLeads.push(...inserted);
          } catch (batchError) {
            console.error(
              `❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`,
              batchError.message,
            );

            // Check for write errors
            if (batchError.writeErrors) {
              console.error(
                "❌ Write errors:",
                JSON.stringify(batchError.writeErrors, null, 2),
              );

              // Try individual inserts for failed documents
              console.log("🔄 Retrying failed documents individually...");
              for (const writeError of batchError.writeErrors) {
                try {
                  const doc = batch[writeError.index];
                  console.log(
                    `🔄 Retrying doc ${writeError.index}:`,
                    doc.phone,
                  );
                  const singleResult = await Leads.create(doc);
                  insertedLeads.push(singleResult);
                  console.log(`✅ Individual insert success: ${doc.phone}`);
                } catch (singleError) {
                  console.error(
                    `❌ Individual insert failed:`,
                    singleError.message,
                  );
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("❌ Insert loop error:", error.message);
      }
    }

  
    // ========== 6️⃣ CREATE HISTORY LOGS ==========
    if (insertedLeads.length > 0) {
      console.log(`📝 Creating ${insertedLeads.length} history logs...`);
      const historyLogs = insertedLeads.map((lead) => ({
        leadId: lead._id,
        employeeId: lead.assignTo || null,
        actionType: lead.assignTo
          ? "Lead Added & Assigned"
          : "Lead Added from Excel",
        status: lead.status || "Fresh",
        previousStatus: null,
        comment: "Synced from Excel file",
        performedBy: req?.user?._id || null,
        performedAt: new Date(),
      }));

      try {
        await LeadHistory.insertMany(historyLogs, { ordered: false });
        console.log(`✅ ${historyLogs.length} history logs created`);
      } catch (historyError) {
        console.error("❌ History log error:", historyError.message);
      }
    }

    // ========== 7️⃣ UPDATE LAST SYNC ==========
    lastSyncHash = currentHash;
    isSyncing = false;

    // ========== 8️⃣ RESPONSE ==========
    const responseData = {
      totalInExcel: excelData.length,
      newLeadsInserted: insertedLeads.length,
      duplicatesSkipped: duplicatePhones.length,
      insertedLeads: insertedLeads.map((l) => ({
        id: l._id,
        phone: l.phone,
        name: l.name,
      })),
    };


    if (res) {
      return res
        .status(200)
        .json(
          new apiResponse(
            200,
            responseData,
            `✅ Sync complete! ${insertedLeads.length} new leads added.`,
          ),
        );
    }

    return responseData;
  } catch (error) {
    isSyncing = false;
    console.error("❌ Excel Sync Error:", error.message);
    console.error("❌ Error Stack:", error.stack);

    if (res) {
      return res
        .status(500)
        .json(new apiResponse(500, null, `Sync failed: ${error.message}`));
    }
    throw error;
  }
};

/**
 * ======================================================
 *   📊 GET LAST SYNC STATUS
 * ======================================================
 */
const getSyncStatus = asyncHandler(async (req, res) => {
  console.log("📊 Fetching sync status...");

  const totalLeads = await Leads.countDocuments();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayLeads = await Leads.countDocuments({
    createdAt: { $gte: today },
  });


  res.status(200).json(
    new apiResponse(
      200,
      {
        totalLeads,
        todayLeads,
        lastSyncHash: lastSyncHash ? "Synced" : "Never synced",
        isSyncing,
        lastSyncTime: lastSyncHash ? new Date().toISOString() : null,
      },
      "Sync status fetched successfully",
    ),
  );
});

/**
 * ======================================================
 *   🔄 FORCE SYNC (Reset hash and sync again)
 * ======================================================
 */
const forceSync = asyncHandler(async (req, res) => {
  lastSyncHash = null;
  console.log("🔄 Force sync triggered. Resetting hash...");
  await syncLeadsFromExcel(req, res);
});

/**
 * ======================================================
 *   🔄 RESET SYNC STATE (For testing)
 * ======================================================
 */
const resetSyncState = () => {
  lastSyncHash = null;
  isSyncing = false;
  console.log("🔄 Sync state reset");
};

/**
 * ======================================================
 *   🧪 TEST INSERT (For debugging)
 * ======================================================
 */
const testInsert = asyncHandler(async (req, res) => {
  console.log("🧪 Testing insert...");

  try {
    const testLead = {
      phone: "9999999999",
      name: "Test User",
      gender: "Male",
      email: "test@example.com",
      currentStatus: "Fresh",
    };

    console.log("📝 Test lead data:", JSON.stringify(testLead, null, 2));

    const result = await Leads.create(testLead);
    console.log("✅ Test insert successful:", result);

    res
      .status(200)
      .json(new apiResponse(200, result, "Test insert successful"));
  } catch (error) {
    console.error("❌ Test insert failed:", error.message);
    console.error("❌ Error details:", error);
    res
      .status(500)
      .json(new apiResponse(500, null, `Test insert failed: ${error.message}`));
  }
});

/**
 * ======================================================
 *   📋 CHECK DB LEADS (For debugging)
 * ======================================================
 */
const checkDbLeads = asyncHandler(async (req, res) => {
  console.log("📋 Checking database leads...");

  try {
    const count = await Leads.countDocuments();
    const sample = await Leads.find().limit(5);

    console.log(`📊 Total leads in DB: ${count}`);
    console.log("📋 Sample leads:", JSON.stringify(sample, null, 2));

    res
      .status(200)
      .json(
        new apiResponse(200, { total: count, sample }, "DB check successful"),
      );
  } catch (error) {
    console.error("❌ DB check failed:", error.message);
    res
      .status(500)
      .json(new apiResponse(500, null, `DB check failed: ${error.message}`));
  }
});

export {
  syncLeadsFromExcel,
  getSyncStatus,
  forceSync,
  resetSyncState,
  testInsert,
  checkDbLeads,
};
