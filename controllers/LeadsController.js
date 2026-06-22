import Leads from "../models/Leads.modal.js";
import LeadHistory from "../models/LeadHistory.model.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import mongoose from "mongoose";

/* ======================================================
   🟢 Add Single Lead
====================================================== */
const addLead = asyncHandler(async (req, res) => {
  try {
    const {
      phone,
      name,
      gender,
      email,
      assignTo,
      platform,
      remark,
      leadDate,
      action,
      status,
    } = req.body;

    if (!phone) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Phone number is required"));
    }

    const existingLead = await Leads.findOne({ phone });
    if (existingLead) {
      return res
        .status(400)
        .json(
          new apiResponse(400, null, "Lead with this phone already exists"),
        );
    }

    const newLead = await Leads.create({
      phone,
      name,
      gender,
      email,
      platform,
      assignTo,
      remark,
      leadDate: leadDate || new Date(),
      action,
      status,
    });

    const historyData = {
      leadId: newLead._id,
      employeeId: newLead.assignTo || null,
      actionType: newLead.assignTo ? "Lead Added & Assigned" : "Lead Added",
      previousStatus: null,
      status: newLead.status || "Fresh",
      comment: null,
      performedBy: req.user?._id || null,
      performedAt: new Date(),
    };

    await LeadHistory.create(historyData);

    res
      .status(201)
      .json(new apiResponse(201, newLead, "Lead created successfully"));
  } catch (error) {
    res
      .status(500)
      .json(
        new apiResponse(500, null, `Error creating lead: ${error.message}`),
      );
  }
});

/* ======================================================
   🟢 Bulk Add Leads
====================================================== */
const bulkAddLeads = asyncHandler(async (req, res) => {
  const leads = req.body.leads;

  if (!Array.isArray(leads) || leads.length === 0) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid or empty leads data array"));
  }

  try {
    const uniqueLeads = leads.filter(
      (item, index, self) =>
        index ===
        self.findIndex(
          (t) =>
            t.phone?.trim().toLowerCase() === item.phone?.trim().toLowerCase(),
        ),
    );

    const existingLeads = await Leads.find({
      phone: { $in: uniqueLeads.map((l) => l.phone) },
    }).select("_id phone assignTo");

    const existingPhones = existingLeads.map((l) => l.phone);

    const newLeads = uniqueLeads.filter(
      (l) => !existingPhones.includes(l.phone),
    );

    let insertedLeads = [];
    if (newLeads.length > 0) {
      const formattedLeads = newLeads.map((lead) => ({
        phone: lead.phone?.trim(),
        name: lead.name || "",
        gender: lead.gender || "",
        email: lead.email?.toLowerCase() || "",
        platform: lead.platform || "",
        remark: lead.remark || "",
        leadDate: lead.leadDate ? new Date(lead.leadDate) : new Date(),
        assignTo: lead.assignTo || null,
        action: lead.action || null,
        status: lead.status || null,
      }));

      const BATCH_SIZE = 1000;
      for (let i = 0; i < formattedLeads.length; i += BATCH_SIZE) {
        const batch = formattedLeads.slice(i, i + BATCH_SIZE);
        const inserted = await Leads.insertMany(batch, { ordered: false });
        insertedLeads.push(...inserted);
      }
    }

    const allHistoryLogs = [];

    insertedLeads.forEach((lead) => {
      allHistoryLogs.push({
        leadId: lead._id,
        employeeId: lead.assignTo || null,
        actionType: lead.assignTo ? "Lead Added & Assigned" : "Lead Added",
        previousStatus: null,
        status: "Fresh",
        comment: null,
        performedBy: req.user?._id || null,
        performedAt: new Date(),
      });
    });

    existingLeads.forEach((lead) => {
      allHistoryLogs.push({
        leadId: lead._id,
        employeeId: lead.assignTo || null,
        actionType: "Duplicate Lead Attempted",
        previousStatus: null,
        status: "Duplicate",
        comment: "This lead already existed in the system.",
        performedBy: req.user?._id || null,
        performedAt: new Date(),
      });
    });

    if (allHistoryLogs.length > 0) {
      await LeadHistory.insertMany(allHistoryLogs, { ordered: false });
    }

    res.status(201).json(
      new apiResponse(
        201,
        {
          totalReceived: leads.length,
          totalUnique: uniqueLeads.length,
          insertedCount: insertedLeads.length,
          skippedDuplicates: existingPhones.length,
          duplicateLogged: existingPhones.length,
        },
        `${insertedLeads.length} new leads inserted successfully, ${existingPhones.length} duplicates logged`,
      ),
    );
  } catch (error) {
    res
      .status(500)
      .json(new apiResponse(500, null, `Bulk insert error: ${error.message}`));
  }
});

/* ======================================================
   🟢 Update Lead
====================================================== */
const updateLead = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await Leads.findById(id);

    if (!lead) {
      return res.status(404).json(new apiResponse(404, null, "Lead not found"));
    }

    Object.keys(req.body).forEach((key) => {
      lead[key] = req.body[key];
    });

    await lead.save();

    res
      .status(200)
      .json(new apiResponse(200, lead, "Lead updated successfully and logged"));
  } catch (error) {
    res
      .status(500)
      .json(
        new apiResponse(500, null, `Error updating lead: ${error.message}`),
      );
  }
});

const updateStatus = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await Leads.findById(id);

    if (!lead) {
      return res.status(404).json(new apiResponse(404, null, "Lead not found"));
    }

    const previousStatus = lead.status;
    const previousAction = lead.action;

    Object.keys(req.body).forEach((key) => {
      lead[key] = req.body[key];
    });

    await lead.save();

    const historyData = {
      leadId: lead._id,
      employeeId: lead.assignTo || null,
      actionType: req.body.actionType || "Lead Updated",
      status: lead.status,
      comment: req.body.comment || null,
      performedBy: req.user?._id || null,
      performedAt: new Date(),
    };

    await LeadHistory.create(historyData);

    res
      .status(200)
      .json(new apiResponse(200, lead, "Lead updated successfully and logged"));
  } catch (error) {
    res
      .status(500)
      .json(
        new apiResponse(500, null, `Error updating lead: ${error.message}`),
      );
  }
});

/* ======================================================
   🟢 Delete Lead
====================================================== */
const deleteLead = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await Leads.findById(id);

    if (!lead) {
      return res.status(404).json(new apiResponse(404, null, "Lead not found"));
    }

    await Leads.findByIdAndDelete(id);

    res
      .status(200)
      .json(new apiResponse(200, null, "Lead deleted successfully"));
  } catch (error) {
    res
      .status(500)
      .json(
        new apiResponse(500, null, `Error deleting lead: ${error.message}`),
      );
  }
});

/* ======================================================
   🟢 Get All Leads (with populated refs)
====================================================== */

const getAllLeads = asyncHandler(async (req, res) => {
  const {
    isPagination = "true",
    page = 1,
    limit = 10,
    search,
    sortBy = "recent",
    fromDate,
    toDate,
    assignTo,
    status,
    action,
    platformId,
    currentStatus,
    assigned = "all", // NEW FILTER
  } = req.query;

  const pipeline = [];

  // 🔍 Search filter
  if (search) {
    const regex = new RegExp(search, "i");
    pipeline.push({
      $match: {
        $or: [
          { name: regex },
          { phone: regex },
          { email: regex },
          { platform: regex },
          { remark: regex },
        ],
      },
    });
  }

  // 📅 Date filter
  if (fromDate || toDate) {
    const dateFilter = {};
    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      dateFilter.$gte = from;
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      dateFilter.$lte = to;
    }
    pipeline.push({ $match: { leadDate: dateFilter } });
  }

  // 👤 Assigned user filter
  if (assignTo && mongoose.Types.ObjectId.isValid(assignTo)) {
    pipeline.push({
      $match: { assignTo: new mongoose.Types.ObjectId(assignTo) },
    });
  }

  if (status && mongoose.Types.ObjectId.isValid(status)) {
    pipeline.push({
      $match: { status: new mongoose.Types.ObjectId(status) },
    });
  }

  if (action && mongoose.Types.ObjectId.isValid(action)) {
    pipeline.push({
      $match: { action: new mongoose.Types.ObjectId(action) },
    });
  }

  if (platformId) {
    pipeline.push({
      $match: { platform: Number(platformId) },
    });
  }

  // if (currentStatus) {
  //   pipeline.push({
  //     $match: { currentStatus },
  //   });
  if (currentStatus) {
    pipeline.push({
      $match: {
        currentStatus: {
          $regex: currentStatus,
          $options: "i",
        },
      },
    });
  }

  // 🟦 NEW FILTER → Assigned / Unassigned Leads
  if (assigned === "yes") {
    pipeline.push({ $match: { assignTo: { $ne: null } } });
  } else if (assigned === "no") {
    pipeline.push({ $match: { assignTo: null } });
  }
  // If "all" → no filter applied

  // 🔽 Sorting
  if (sortBy === "recent") pipeline.push({ $sort: { createdAt: -1 } });
  else if (sortBy === "oldest") pipeline.push({ $sort: { createdAt: 1 } });

  // ==========================================
  // 🟦 POPULATE assignTo (User)
  // ==========================================
  pipeline.push({
    $lookup: {
      from: "users",
      localField: "assignTo",
      foreignField: "_id",
      as: "assignTo",
    },
  });
  pipeline.push({
    $unwind: { path: "$assignTo", preserveNullAndEmptyArrays: true },
  });

  // ==========================================
  // 🟩 POPULATE action (LeadAction)
  // ==========================================
  pipeline.push({
    $lookup: {
      from: "leadactions",
      localField: "action",
      foreignField: "_id",
      as: "action",
    },
  });
  pipeline.push({
    $unwind: { path: "$action", preserveNullAndEmptyArrays: true },
  });

  // ==========================================
  // 🟪 POPULATE status (LeadStatus)
  // ==========================================
  pipeline.push({
    $lookup: {
      from: "leadstatuses",
      localField: "status",
      foreignField: "_id",
      as: "status",
    },
  });
  pipeline.push({
    $unwind: { path: "$status", preserveNullAndEmptyArrays: true },
  });

  // ==========================================
  // 🟧 POPULATE prevAction
  // ==========================================
  pipeline.push({
    $lookup: {
      from: "leadactions",
      localField: "prevAction",
      foreignField: "_id",
      as: "prevAction",
    },
  });
  pipeline.push({
    $unwind: { path: "$prevAction", preserveNullAndEmptyArrays: true },
  });

  // ==========================================
  // 🟥 POPULATE prevStatus
  // ==========================================
  pipeline.push({
    $lookup: {
      from: "leadstatuses",
      localField: "prevStatus",
      foreignField: "_id",
      as: "prevStatus",
    },
  });
  pipeline.push({
    $unwind: { path: "$prevStatus", preserveNullAndEmptyArrays: true },
  });

  // PLATFORM LOOKUP
  pipeline.push({
    $lookup: {
      from: "platforms",
      localField: "platform",
      foreignField: "PlatformId",
      as: "platformData",
    },
  });
  pipeline.push({
    $unwind: { path: "$platformData", preserveNullAndEmptyArrays: true },
  });

  // 🧹 Clean empty fields
  pipeline.push({
    $replaceRoot: {
      newRoot: {
        $arrayToObject: {
          $filter: {
            input: { $objectToArray: "$$ROOT" },
            as: "field",
            cond: {
              $and: [
                { $ne: ["$$field.v", null] },
                { $ne: ["$$field.v", ""] },
                { $ne: ["$$field.v", []] },
              ],
            },
          },
        },
      },
    },
  });

  // 📊 Total Count
  const totalData = await Leads.aggregate([...pipeline, { $count: "count" }]);
  const total = totalData[0]?.count || 0;

  // 📄 Pagination
  if (isPagination === "true") {
    pipeline.push({ $skip: (page - 1) * limit }, { $limit: parseInt(limit) });
  }

  const leads = await Leads.aggregate(pipeline);

  res.status(200).json(
    new apiResponse(
      200,
      {
        leads,
        totalLeads: total,
        totalPages: Math.ceil(total / limit),
        currentPage: Number(page),
      },
      "Leads fetched successfully",
    ),
  );
});

/* ======================================================
   🟢 Get Lead by ID
====================================================== */
const getLeadById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const lead = await Leads.findById(id)
    .populate("assignTo", "name email phone gender occupation profilepic")
    .populate("action", "title")
    .populate("status", "title")
    .populate("prevAction", "title")
    .populate("prevStatus", "title");

  if (!lead)
    return res.status(404).json(new apiResponse(404, null, "Lead not found"));

  res.status(200).json(new apiResponse(200, lead, "Lead fetched successfully"));
});

/* ======================================================
   🟢 Assign Leads (manual / auto)
====================================================== */
const assignLeads = asyncHandler(async (req, res) => {
  const { type, employeeId, employeeIds, leadIds } = req.body;

  if (!type || !["manual", "auto"].includes(type)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid assignment type"));
  }

  if (type === "manual") {
    if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Valid employeeId is required"));
    }

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Lead IDs are required"));
    }

    const updatedLeads = await Leads.updateMany(
      { _id: { $in: leadIds } },
      { $set: { assignTo: employeeId } },
    );

    return res
      .status(200)
      .json(
        new apiResponse(
          200,
          updatedLeads,
          `Leads assigned manually to employee ${employeeId} successfully`,
        ),
      );
  }

  if (type === "auto") {
    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Employee IDs are required"));
    }

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Lead IDs are required"));
    }

    const updates = leadIds.map((leadId, index) => ({
      updateOne: {
        filter: { _id: leadId },
        update: { assignTo: employeeIds[index % employeeIds.length] },
      },
    }));

    const result = await Leads.bulkWrite(updates);

    return res
      .status(200)
      .json(
        new apiResponse(
          200,
          result,
          `Leads assigned automatically (round-robin) to selected employees`,
        ),
      );
  }
});

const getLeadCountByStatus1 = asyncHandler(async (req, res) => {
  try {
    const result = await Leads.aggregate([
      {
        $lookup: {
          from: "leadstatuses",
          localField: "status",
          foreignField: "_id",
          as: "statusData",
        },
      },
      {
        $unwind: {
          path: "$statusData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$statusData._id",
          statusTitle: { $first: "$statusData.title" },
          totalLeads: { $sum: 1 },
        },
      },
      {
        $sort: { totalLeads: -1 },
      },
    ]);

    res
      .status(200)
      .json(
        new apiResponse(
          200,
          result,
          "Leads count by status fetched successfully",
        ),
      );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, error.message));
  }
});

const getLeadCountByStatus = asyncHandler(async (req, res) => {
  try {
    const result = await Leads.aggregate([
      {
        $group: {
          _id: "$currentStatus",
          totalLeads: { $sum: 1 },
        },
      },
      {
        $project: {
          currentStatus: "$_id",
          totalLeads: 1,
          _id: 0,
        },
      },
      {
        $sort: { totalLeads: -1 },
      },
    ]);

    res
      .status(200)
      .json(
        new apiResponse(
          200,
          result,
          "Lead count by currentStatus fetched successfully",
        ),
      );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, error.message));
  }
});

const transferSingleLead = asyncHandler(async (req, res) => {
  const { leadId } = req.params;
  const { userId, reason } = req.body;

  // Validation
  if (!leadId) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "leadId is required"));
  }

  if (!userId) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "userId is required"));
  }

  try {
    // 1️⃣ Find Lead
    const lead = await Leads.findById(leadId);

    if (!lead) {
      return res.status(404).json(new apiResponse(404, null, "Lead not found"));
    }

    const previousAssign = lead.assignTo || null;

    // 2️⃣ Update assignTo field
    lead.assignTo = userId;
    await lead.save();

    // 3️⃣ Create LeadHistory Log
    await LeadHistory.create({
      leadId: lead._id,
      employeeId: userId,
      actionType: "Lead Transferred",
      previousStatus: null,
      status: "Transferred",
      comment: reason || "Transferred to another user",
      performedBy: req.user?._id || null,
      performedAt: new Date(),
      previousAssignTo: previousAssign,
      newAssignTo: userId,
    });

    return res.status(200).json(
      new apiResponse(
        200,
        {
          leadId: lead._id,
          oldAssign: previousAssign,
          newAssign: userId,
        },
        "Lead transferred successfully",
      ),
    );
  } catch (error) {
    return res
      .status(500)
      .json(new apiResponse(500, null, `Transfer error: ${error.message}`));
  }
});

const getDashboardStats = asyncHandler(async (req, res) => {
  try {
    const stats = await Leads.aggregate([
      {
        $group: {
          _id: "$currentStatus",
          total: { $sum: 1 },
        },
      },
    ]);

    const totalLeads = await Leads.countDocuments();

    const formatted = {
      TotalLead: totalLeads,
      TotalFreshLead: 0,
      TotalResentLead: 0,
      ScheduledTotal: 0,
      PendingTotal: 0,
      TotalSitevisit: 0,
      TotalQualified: 0,
      TotalOpen: 0,
      TotalScraped: 0,
    };

    stats.forEach((item) => {
      const status = (item._id || "").toLowerCase();

      if (status.includes("fresh")) formatted.TotalFreshLead = item.total;
      else if (status.includes("follow")) formatted.ScheduledTotal = item.total;
      else if (status.includes("pending")) formatted.PendingTotal = item.total;
      else if (status.includes("meeting"))
        formatted.TotalSitevisit = item.total;
      else if (status.includes("qualified"))
        formatted.TotalQualified = item.total;
      else if (status.includes("open")) formatted.TotalOpen = item.total;
      else if (status.includes("scraped")) formatted.TotalScraped = item.total;
    });

    return res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export {
  addLead,
  bulkAddLeads,
  updateLead,
  deleteLead,
  getAllLeads,
  getLeadById,
  assignLeads,
  getLeadCountByStatus,
  updateStatus,
  transferSingleLead,
  getDashboardStats,
};
