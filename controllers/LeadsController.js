import Leads from "../models/Leads.modal.js";
import LeadHistory from "../models/LeadHistory.model.js";
import LeadAction from "../models/LeadAction.modal.js";
import User from "../models/User.modal.js";
import Platform from "../models/Platform.modal.js";
import LeadStatus from "../models/LeadStatus.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import mongoose from "mongoose";

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

const updateLead = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await Leads.findById(id);

    if (!lead) {
      return res.status(404).json(new apiResponse(404, null, "Lead not found"));
    }

    // Track previous values for history
    const previousStatus = lead.status;
    const previousAction = lead.action;

    Object.keys(req.body).forEach((key) => {
      lead[key] = req.body[key];
    });

    await lead.save();

    // Log the update in history
    const historyData = {
      leadId: lead._id,
      employeeId: lead.assignTo || null,
      actionType: req.body.actionType || "Lead Updated",
      previousStatus: previousStatus || null,
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

const updateStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const {
    action,
    actionResult,
    status,
    currentStatus,
    nextAction,
    siteVisitDate,
    followUpDate,
    followUpTime,
    remark,
    comment,
  } = req.body;

  const lead = await Leads.findById(id);

  if (!lead) {
    return res.status(404).json(new apiResponse(404, null, "Lead not found"));
  }

  const previousStatus = lead.status;
  const previousAction = lead.action;
  const prevActionResult = lead.actionResult;
  const previousCurrentStatus = lead.currentStatus;

  // Update only provided fields
  if (status) lead.status = status;
  if (action) lead.action = action;
  if (actionResult) lead.actionResult = actionResult;
  if (currentStatus) lead.currentStatus = currentStatus;

  if (siteVisitDate !== undefined) lead.siteVisitDate = siteVisitDate;

  if (followUpDate !== undefined) lead.followUpDate = followUpDate;

  if (followUpTime !== undefined) lead.followUpTime = followUpTime;

  if (remark !== undefined) lead.remark = remark;

  await lead.save();

  await LeadHistory.create({
    leadId: lead._id,
    employeeId: lead.assignTo || null,

    action: action || previousAction,
    actionResult: actionResult || prevActionResult,
    status: status || previousStatus,

    prevStatus: previousStatus || null,
    prevAction: previousAction || null,
    prevActionResult: prevActionResult || null,

    nextAction: nextAction || null,
    currentStatus: currentStatus || previousCurrentStatus,

    siteVisitDate: siteVisitDate || null,
    followUpDate: followUpDate || null,
    followUpTime: followUpTime || null,

    remark: remark || null,
    comment: comment || null,

    performedBy: req.user?._id || null,
    performedAt: new Date(),
  });

  // 🔥 Schedule notifications if follow-up date and time are provided
  if (followUpDate && followUpTime && nextAction) {
    try {
      console.log(`📅 [UpdateStatus] Scheduling notifications for lead: ${id}`);

      // Import scheduler here to avoid circular dependencies
      const { scheduleLeadNotifications } = await import(
        "../services/notificationScheduler.js"
      );
      
      // Import notification creator
      const { createNotification } = await import(
        "../controllers/userNotificationController.js"
      );

      // Fetch the action title from LeadAction model
      const LeadActionModel = await import("../models/LeadAction.modal.js").then(m => m.default);
      let actionTitle = "Action";
      try {
        const actionData = await LeadActionModel.findById(nextAction);
        if (actionData) {
          actionTitle = actionData.title || "Action";
        }
      } catch (error) {
        console.warn(`⚠️ Could not fetch action title:`, error.message);
      }

      // Combine followUpDate and followUpTime
      const [hours, minutes] = followUpTime.split(":").map(Number);
      const scheduledDateTime = new Date(followUpDate);
      scheduledDateTime.setHours(hours, minutes, 0, 0);

      // Get the assigned user ID
      const assignedUserId = lead.assignTo;
      if (assignedUserId) {
        // 🔥 Create initial notification in database
        try {
          await createNotification({
            userId: assignedUserId,
            title: `📅 Follow-up Scheduled: ${actionTitle}`,
            message: `Lead follow-up scheduled for ${followUpDate} at ${followUpTime}. Action: ${actionTitle}`,
            type: "Reminder",
            data: {
              leadId: String(id),
              actionType: "scheduled",
              actionTitle: actionTitle,
              scheduledDateTime: scheduledDateTime.toISOString(),
            },
          });
          console.log(`✅ Initial notification created for lead: ${id}`);
        } catch (notifError) {
          console.error(`❌ Error creating initial notification:`, notifError.message);
        }

        // Schedule the reminders with action title
        await scheduleLeadNotifications(
          id,
          assignedUserId,
          scheduledDateTime,
          nextAction
        );
        console.log(`✅ Notifications scheduled for lead: ${id}`);
      }
    } catch (error) {
      console.error(`❌ Error scheduling notifications:`, error.message);
      // Don't fail the request if notification scheduling fails
    }
  }

  return res
    .status(200)
    .json(new apiResponse(200, lead, "Lead status updated successfully"));
});

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
    assigned = "all",
    dashboardStatus = "All",
  } = req.query;

  const query = {};

  if (req.user.role !== "Admin") {
    query.assignTo = req.user._id;
  }

  // Dashboard Status Filter
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  if (dashboardStatus === "Recent") {
    query.updatedAt = {
      $gte: startOfDay,
      $lte: endOfDay,
    };
  } else if (dashboardStatus === "Follow Up") {
    query.followUpDate = {
      $gte: startOfDay,
      $lte: endOfDay,
    };
  } else if (dashboardStatus === "Pending") {
    query.followUpDate = {
      $ne: null,
      $lt: startOfDay,
    };
  } else if (dashboardStatus === "Fresh") {
    query.status = null;
  } else if (
    dashboardStatus !== "All" &&
    !["Recent", "Follow Up", "Pending", "Fresh"].includes(dashboardStatus)
  ) {
    const statusIds = await LeadStatus.find({
      title: {
        $regex: `^${dashboardStatus}$`,
        $options: "i",
      },
    }).distinct("_id");

    if (statusIds.length) {
      query.status = { $in: statusIds };
    } else {
      query._id = null;
    }
  }

  // Search
  if (search) {
    const searchWords = search.trim().split(/\s+/);

    const regexConditions = searchWords.map((word) => ({
      $regex: word,
      $options: "i",
    }));

    // Action IDs
    const actionIds = await LeadAction.find({
      title: {
        $regex: searchWords.join("|"),
        $options: "i",
      },
    }).distinct("_id");

    // Status IDs
    const statusIds = await LeadStatus.find({
      title: {
        $regex: searchWords.join("|"),
        $options: "i",
      },
    }).distinct("_id");

    // User IDs
    const userIds = await User.find({
      name: {
        $regex: searchWords.join("|"),
        $options: "i",
      },
    }).distinct("_id");

    query.$or = [
      {
        name: {
          $regex: searchWords.join("|"),
          $options: "i",
        },
      },
      {
        phone: {
          $regex: searchWords.join("|"),
          $options: "i",
        },
      },
      {
        email: {
          $regex: searchWords.join("|"),
          $options: "i",
        },
      },
      {
        leadCode: {
          $regex: searchWords.join("|"),
          $options: "i",
        },
      },
      {
        remark: {
          $regex: searchWords.join("|"),
          $options: "i",
        },
      },
      {
        comment: {
          $regex: searchWords.join("|"),
          $options: "i",
        },
      },
      {
        currentStatus: {
          $regex: searchWords.join("|"),
          $options: "i",
        },
      },

      { action: { $in: actionIds } },
      { status: { $in: statusIds } },
      { assignTo: { $in: userIds } },
    ];
  }

  // Date Filter
  if (fromDate || toDate) {
    query.leadDate = {};

    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      query.leadDate.$gte = from;
    }

    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      query.leadDate.$lte = to;
    }
  }

  if (
    req.user.role === "Admin" &&
    assignTo &&
    mongoose.Types.ObjectId.isValid(assignTo)
  ) {
    query.assignTo = assignTo;
  }

  // Status Filter
  if (status && mongoose.Types.ObjectId.isValid(status)) {
    query.status = status;
  }

  // Action Filter
  if (action && mongoose.Types.ObjectId.isValid(action)) {
    query.action = action;
  }

  // Platform Filter
  if (platformId) {
    query.platform = Number(platformId);
  }

  // Current Status Filter
  if (currentStatus) {
    query.currentStatus = {
      $regex: currentStatus,
      $options: "i",
    };
  }

  // Assigned / Unassigned Filter
  if (req.user.role === "Admin") {
    if (assigned === "yes") {
      query.assignTo = { $ne: null };
    }

    if (assigned === "no") {
      query.assignTo = null;
    }
  }

  // Sorting
  let sortObj = {};

  if (sortBy === "recent") {
    sortObj = { createdAt: -1 };
  } else if (sortBy === "oldest") {
    sortObj = { createdAt: 1 };
  } else if (sortBy === "name") {
    sortObj = { name: 1 };
  }

  // Total Count
  const totalLeads = await Leads.countDocuments(query);

  let leadQuery = Leads.find(query)
    .populate({
      path: "assignTo",
      select: "name email role mobileNumber",
    })
    .populate({
      path: "action",
      select: "title",
    })
    .populate({
      path: "actionResult",
      select: "title",
    })
    .populate({
      path: "status",
      select: "title",
    })
    .populate({
      path: "prevAction",
      select: "title",
    })
    .populate({
      path: "prevActionResult",
      select: "title",
    })
    .populate({
      path: "prevStatus",
      select: "title",
    })
    .populate({
      path: "nextAction",
      select: "title",
    })
    .sort(sortObj);

  if (isPagination === "true") {
    leadQuery = leadQuery
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));
  }

  const leads = await leadQuery;
const platforms = await Platform.find().select("title PlatformId");

const leadsWithPlatform = leads.map((lead) => {
  const leadObj = lead.toObject();

  leadObj.platform = platforms.find(
    (p) => p.PlatformId === lead.platform
  ) || null;

  return leadObj;
});
  res.status(200).json(
    new apiResponse(
      200,
      {
        // leads,
              leads: leadsWithPlatform,

        totalLeads,
        totalPages:
          isPagination === "true" ? Math.ceil(totalLeads / Number(limit)) : 1,
        currentPage: Number(page),
      },
      "Leads fetched successfully",
    ),
  );
});

const getLeadById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const lead = await Leads.findById(id)
    .populate("assignTo", "name email phone gender occupation profilepic")
    .populate("action", "title")
    .populate("status", "title")
    .populate("prevAction", "title")
    .populate("prevStatus", "title");

  if (!lead) {
    return res.status(404).json(new apiResponse(404, null, "Lead not found"));
  }

  res.status(200).json(new apiResponse(200, lead, "Lead fetched successfully"));
});

const assignLeads12 = asyncHandler(async (req, res) => {
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

    // Log assignment in history
    const historyLogs = leadIds.map((leadId) => ({
      leadId: leadId,
      employeeId: employeeId,
      actionType: "Lead Assigned Manually",
      status: "Assigned",
      comment: `Assigned to employee ${employeeId}`,
      performedBy: req.user?._id || null,
      performedAt: new Date(),
    }));

    await LeadHistory.insertMany(historyLogs);

    return res
      .status(200)
      .json(
        new apiResponse(
          200,
          updatedLeads,
          `Leads assigned manually to employee successfully`,
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

    // Log auto assignment in history
    const historyLogs = leadIds.map((leadId, index) => ({
      leadId: leadId,
      employeeId: employeeIds[index % employeeIds.length],
      actionType: "Lead Assigned Auto",
      status: "Assigned",
      comment: "Auto-assigned via round-robin",
      performedBy: req.user?._id || null,
      performedAt: new Date(),
    }));

    await LeadHistory.insertMany(historyLogs);

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

const assignLeads = asyncHandler(async (req, res) => {
  const { type, employeeId, employeeIds, leadIds } = req.body;

  if (!type || !["manual", "auto"].includes(type)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid assignment type"));
  }

  // ===========================
  // Manual Assignment
  // ===========================
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

    // Get existing lead data
    const leads = await Leads.find({
      _id: { $in: leadIds },
    });

    // Update assignment
    const updatedLeads = await Leads.updateMany(
      { _id: { $in: leadIds } },
      {
        $set: {
          assignTo: employeeId,
        },
      }
    );

    // History
    const historyLogs = leads.map((lead) => ({
      leadId: lead._id,
      employeeId,
      action: lead.action,
      actionResult: lead.actionResult,
      status: lead.status,
      prevAction: lead.prevAction,
      prevActionResult: lead.prevActionResult,
      prevStatus: lead.prevStatus,
      nextAction: lead.nextAction,
      currentStatus: lead.currentStatus,
      siteVisitDate: lead.siteVisitDate,
      followUpDate: lead.followUpDate,
      followUpTime: lead.followUpTime,
      remark: lead.remark,
      comment: `Lead assigned to employee`,
      performedBy: req.user._id,
      performedAt: new Date(),
    }));

    await LeadHistory.insertMany(historyLogs);

    return res.status(200).json(
      new apiResponse(
        200,
        updatedLeads,
        "Leads assigned manually successfully"
      )
    );
  }

  // ===========================
  // Auto Assignment
  // ===========================
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

    const leads = await Leads.find({
      _id: { $in: leadIds },
    });

    const updates = leadIds.map((leadId, index) => ({
      updateOne: {
        filter: { _id: leadId },
        update: {
          assignTo: employeeIds[index % employeeIds.length],
        },
      },
    }));

    const result = await Leads.bulkWrite(updates);

    // History
    const historyLogs = leads.map((lead, index) => ({
      leadId: lead._id,
      employeeId: employeeIds[index % employeeIds.length],
      action: lead.action,
      actionResult: lead.actionResult,
      status: lead.status,
      prevAction: lead.prevAction,
      prevActionResult: lead.prevActionResult,
      prevStatus: lead.prevStatus,
      nextAction: lead.nextAction,
      currentStatus: lead.currentStatus,
      siteVisitDate: lead.siteVisitDate,
      followUpDate: lead.followUpDate,
      followUpTime: lead.followUpTime,
      remark: lead.remark,
      comment: "Lead auto assigned",
      performedBy: req.user._id,
      performedAt: new Date(),
    }));

    await LeadHistory.insertMany(historyLogs);

    return res.status(200).json(
      new apiResponse(
        200,
        result,
        "Leads assigned automatically successfully"
      )
    );
  }
});

const getLeadCountByStatus = asyncHandler(async (req, res) => {
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

const getLeadCountByCurrentStatus = asyncHandler(async (req, res) => {
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
    const lead = await Leads.findById(leadId);

    if (!lead) {
      return res.status(404).json(new apiResponse(404, null, "Lead not found"));
    }

    const previousAssign = lead.assignTo || null;

    lead.assignTo = userId;
    await lead.save();

    await LeadHistory.create({
      leadId: lead._id,
      employeeId: userId,
      actionType: "Lead Transferred",
      previousStatus: lead.status || null,
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
    const matchStage = {};

    // Telecaller => only own leads
    if (req.user?.roll === "Telecaller") {
      matchStage.assignTo = new mongoose.Types.ObjectId(req.user._id);
    }

    // Last 10 minutes leads
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const [stats, totalLeads, recentLeads] = await Promise.all([
      Leads.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: "$currentStatus",
            total: { $sum: 1 },
          },
        },
      ]),
      Leads.countDocuments(matchStage),
      Leads.countDocuments({
        ...matchStage,
        createdAt: { $gte: tenMinutesAgo },
      }),
    ]);

    const formatted = {
      TotalLead: totalLeads,
      TotalFreshLead: 0,
      TotalResentLead: recentLeads,
      ScheduledTotal: 0,
      PendingTotal: 0,
      TotalSitevisit: 0,
      TotalQualified: 0,
      TotalOpen: 0,
      TotalScraped: 0,
    };

    stats.forEach((item) => {
      const status = String(item._id || "")
        .trim()
        .toLowerCase();

      switch (status) {
        case "fresh":
          formatted.TotalFreshLead += item.total;
          break;
        case "followup":
        case "follow up":
        case "follow-up":
          formatted.ScheduledTotal += item.total;
          break;
        case "pending":
          formatted.PendingTotal += item.total;
          break;
        case "meeting":
        case "meeting sch":
        case "meeting sch.":
        case "site visit":
          formatted.TotalSitevisit += item.total;
          break;
        case "qualified":
          formatted.TotalQualified += item.total;
          break;
        case "open":
          formatted.TotalOpen += item.total;
          break;
        case "scraped":
          formatted.TotalScraped += item.total;
          break;
        default:
          break;
      }
    });

    return res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error("❌ Dashboard Stats Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

const getLeadStatusStats12 = asyncHandler(async (req, res) => {
  // Total Leads
  const totalLeads = await Leads.countDocuments();

  // Status Wise Count
  const statusWise = await Leads.aggregate([
    {
      $lookup: {
        from: "leadstatuses",
        localField: "status",
        foreignField: "_id",
        as: "status",
      },
    },
    {
      $unwind: {
        path: "$status",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: {
          $ifNull: ["$status.title", "Fresh"],
        },
        count: {
          $sum: 1,
        },
      },
    },
    {
      $project: {
        _id: 0,
        status: "$_id",
        count: 1,
      },
    },
    {
      $sort: {
        count: -1,
      },
    },
  ]);

  return res.status(200).json(
    new apiResponse(
      200,
      {
        all: totalLeads,
        statusWise,
      },
      "Lead status statistics fetched successfully",
    ),
  );
});

const getLeadStatusStats123 = asyncHandler(async (req, res) => {
  const totalLeads = await Leads.countDocuments();

  const statusWise = await Leads.aggregate([
    {
      $lookup: {
        from: "leadstatuses",
        localField: "status",
        foreignField: "_id",
        as: "status",
      },
    },
    {
      $unwind: {
        path: "$status",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: {
          $ifNull: ["$status.title", "Fresh"],
        },
        count: {
          $sum: 1,
        },
      },
    },
    {
      $project: {
        _id: 0,
        status: "$_id",
        count: 1,
      },
    },
    {
      $sort: {
        count: -1,
      },
    },
  ]);

  // Add All Status
  statusWise.unshift({
    status: "All",
    count: totalLeads,
  });

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        statusWise,
        "Lead status statistics fetched successfully",
      ),
    );
});

const getLeadStatusStats1234 = asyncHandler(async (req, res) => {
  const totalLeads = await Leads.countDocuments();

  const statusWise = await Leads.aggregate([
    {
      $lookup: {
        from: "leadstatuses",
        localField: "status",
        foreignField: "_id",
        as: "status",
      },
    },
    {
      $unwind: {
        path: "$status",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: {
          $ifNull: ["$status.title", "Fresh"],
        },
        count: {
          $sum: 1,
        },
      },
    },
    {
      $project: {
        _id: 0,
        status: "$_id",
        count: 1,
      },
    },
    {
      $sort: {
        count: -1,
      },
    },
  ]);

  // Today's Updated Leads Count
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const recentCount = await Leads.countDocuments({
    updatedAt: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  });

  // Add All
  statusWise.unshift({
    status: "All",
    count: totalLeads,
  });

  // Add Recent
  statusWise.splice(1, 0, {
    status: "Recent",
    count: recentCount,
  });

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        statusWise,
        "Lead status statistics fetched successfully",
      ),
    );
});

const getLeadStatusStats12345 = asyncHandler(async (req, res) => {
  const totalLeads = await Leads.countDocuments();

  const statusWise = await Leads.aggregate([
    {
      $lookup: {
        from: "leadstatuses",
        localField: "status",
        foreignField: "_id",
        as: "status",
      },
    },
    {
      $unwind: {
        path: "$status",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: {
          $ifNull: ["$status.title", "Fresh"],
        },
        count: {
          $sum: 1,
        },
      },
    },
    {
      $project: {
        _id: 0,
        status: "$_id",
        count: 1,
      },
    },
    {
      $sort: {
        count: -1,
      },
    },
  ]);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  // Today's Updated Leads
  const recentCount = await Leads.countDocuments({
    updatedAt: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  });

  // Today's Follow Up Leads
  const followUpTodayCount = await Leads.countDocuments({
    followUpDate: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  });

  // Add All
  statusWise.unshift({
    status: "All",
    count: totalLeads,
  });

  // Add Recent
  statusWise.splice(1, 0, {
    status: "Recent",
    count: recentCount,
  });

  // Add Today Follow Up
  statusWise.splice(2, 0, {
    status: "Today Follow Up",
    count: followUpTodayCount,
  });

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        statusWise,
        "Lead status statistics fetched successfully",
      ),
    );
});

const getLeadStatusStats = asyncHandler(async (req, res) => {
  // Total Leads
  const assignedFilter = {
    assignTo: req.user._id,
  };


  const totalLeads = await Leads.countDocuments(assignedFilter);

  // Status Wise Count
  const statusWise = await Leads.aggregate([
    {
      $match: assignedFilter,
    },
    {
      $lookup: {
        from: "leadstatuses",
        localField: "status",
        foreignField: "_id",
        as: "status",
      },
    },
    {
      $unwind: {
        path: "$status",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: {
          $ifNull: ["$status.title", "Fresh"],
        },
        count: {
          $sum: 1,
        },
      },
    },
    {
      $project: {
        _id: 0,
        status: "$_id",
        count: 1,
      },
    },
    {
      $sort: {
        count: -1,
      },
    },
  ]);

  // Today Start & End
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  // Recent (Updated Today)
  const recentCount = await Leads.countDocuments({
    ...assignedFilter,
    updatedAt: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  });

  // Today's Follow Up
  const followUpTodayCount = await Leads.countDocuments({
    ...assignedFilter,
    followUpDate: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  });

  // Pending Follow Up
  // Follow-up date today se pehle ki ho
  const pendingCount = await Leads.countDocuments({
    ...assignedFilter,
    followUpDate: {
      $ne: null,
      $lt: startOfDay,
    },
  });

  // Add Custom Dashboard Stats
  statusWise.unshift(
    {
      status: "All",
      count: totalLeads,
    },
    {
      status: "Recent",
      count: recentCount,
    },
    {
      status: "Follow Up",
      count: followUpTodayCount,
    },
    {
      status: "Pending",
      count: pendingCount,
    },
  );

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        statusWise,
        "Lead status statistics fetched successfully",
      ),
    );
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
  getLeadCountByCurrentStatus,
  updateStatus,
  transferSingleLead,
  getDashboardStats,
  getLeadStatusStats,
};

