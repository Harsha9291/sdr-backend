import axios from "axios";
import XLSX from "xlsx";
import mongoose from "mongoose";
import Leads from "../models/Leads.modal.js";
import LeadHistory from "../models/LeadHistory.model.js";
import Integration from "../models/Intigration.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import Platform from "../models/Platform.modal.js";
import LeadAction from "../models/LeadAction.modal.js";
import LeadStatus from "../models/LeadStatus.modal.js";
import User from "../models/User.modal.js";
import {
  BATCH_SIZE,
  EXCEL_DOWNLOAD_TIMEOUT,
} from "../utils/constants.js";

let lastSyncHash = null;
let isSyncing = false;



const syncLeadsFromSheet = async (
  sheetUrl,
  integrationId
) => {
  try {

    const response = await axios.get(sheetUrl, {
      responseType: "arraybuffer",
      timeout: EXCEL_DOWNLOAD_TIMEOUT,
    });

    const workbook = XLSX.read(response.data, {
      type: "buffer",
    });

    const worksheet =
      workbook.Sheets[workbook.SheetNames[0]];

    // Read all rows as array
    const rows = XLSX.utils.sheet_to_json(
      worksheet,
      {
        header: 1,
        defval: "",
      }
    );


    // Find header row dynamically
    const headerIndex = rows.findIndex(
      (row) =>
        row.includes("Phone") &&
        row.includes("Name")
    );

    if (headerIndex === -1) {
      throw new Error(
        "Header row not found in sheet"
      );
    }

    // Convert rows to objects
    const excelData = rows
      .slice(headerIndex + 1)
      .filter(
        (row) =>
          row &&
          row.length > 0 &&
          row[0] &&
          String(row[0]).trim() !== ""
      )
      .map((row) => ({
        Phone: row[0],
        Name: row[1],
        Gender: row[2],
        Email: row[3],
        Platform: row[4],
        LeadDate: row[5],
      }));


    if (!excelData.length) {
      return {
        success: true,
        inserted: 0,
      };
    }

    const leadsToInsert = [];

    for (const row of excelData) {
      try {
        const phone = String(
          row.Phone || ""
        ).trim();

        if (!phone) continue;



        // Duplicate check
        const existingLead =
          await Leads.findOne({
            phone,
          });

        if (existingLead) {
          console.log(
            `⚠️ Duplicate Lead: ${phone}`
          );
          continue;
        }

        // Platform Mapping
        const platformDoc =
          await Platform.findOne({
            PlatformId: Number(
              row.Platform
            ),
          });

        leadsToInsert.push({
          phone,
          name: row.Name || "",
          gender: row.Gender || "",
          email: row.Email || "",

          platform:
            platformDoc?.PlatformId || 0,

          status: null,

          assignTo: null,

          remark: "",

          currentStatus: "Fresh",

          leadDate: row.LeadDate
            ? new Date(row.LeadDate)
            : new Date(),
        });
      } catch (rowError) {
        console.error(
          "❌ Row Error:",
          rowError.message
        );
      }
    }



    let insertedLeads = [];

    for (
      let i = 0;
      i < leadsToInsert.length;
      i += BATCH_SIZE
    ) {
      const batch = leadsToInsert.slice(
        i,
        i + BATCH_SIZE
      );

      try {
        const inserted =
          await Leads.insertMany(batch, {
            ordered: false,
          });

        insertedLeads.push(...inserted);


      } catch (err) {
        console.error(
          "❌ Batch Insert Error:",
          err.message
        );
      }
    }

    // Lead History
    if (insertedLeads.length) {
      await LeadHistory.insertMany(
        insertedLeads.map((lead) => ({
          leadId: lead._id,
          employeeId:
            lead.assignTo || null,
          actionType:
            "Lead Added from Excel",
          status: lead.status,
          comment:
            "Synced from Google Sheet",
          performedAt: new Date(),
        }))
      );


    }

    // Update last sync time
    await Integration.findByIdAndUpdate(
      integrationId,
      {
        lastSyncedAt: new Date(),
      }
    );



    return {
      success: true,
      inserted: insertedLeads.length,
      totalRecords: excelData.length,
    };
  } catch (error) {
    console.error(
      "❌ Sync Error:",
      error.message
    );

    return {
      success: false,
      error: error.message,
    };
  }
};





export {
  syncLeadsFromSheet
};
