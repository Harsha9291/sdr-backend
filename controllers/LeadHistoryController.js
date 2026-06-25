import LeadHistory from "../models/LeadHistory.model.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import mongoose from "mongoose";

const addLeadHistory = asyncHandler(async (req, res) => {
  try {
    const {
      leadId,
      employeeId,
      actionType,
      status,
      previousStatus,
      comment,
      performedBy,
    } = req.body;

    if (!leadId || !actionType) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "leadId and actionType are required"));
    }

    const leadHistory = await LeadHistory.create({
      leadId,
      employeeId,
      actionType,
      status,
      previousStatus,
      comment,
      performedBy,
      performedAt: new Date(),
    });

    res
      .status(201)
      .json(
        new apiResponse(201, leadHistory, "Lead history added successfully")
      );
  } catch (error) {
    res
      .status(500)
      .json(
        new apiResponse(
          500,
          null,
          `Error adding lead history: ${error.message}`
        )
      );
  }
});

const getAllLeadHistory = asyncHandler(async (req, res) => {
  const {
    search,
    leadId,
    employeeId,
    performedBy,
    action,
    actionResult,
    status,
    currentStatus,
    startDate,
    endDate,
    page = 1,
    limit = 10,
    pagination = "true",
  } = req.query;

  const filter = {};

  // Lead Filter
  if (leadId && mongoose.Types.ObjectId.isValid(leadId)) {
    filter.leadId = leadId;
  }

  // Employee Filter
  if (
    employeeId &&
    mongoose.Types.ObjectId.isValid(employeeId)
  ) {
    filter.employeeId = employeeId;
  }

  // Performed By Filter
  if (
    performedBy &&
    mongoose.Types.ObjectId.isValid(performedBy)
  ) {
    filter.performedBy = performedBy;
  }

  // Action Filter
  if (
    action &&
    mongoose.Types.ObjectId.isValid(action)
  ) {
    filter.action = action;
  }

  // Action Result Filter
  if (
    actionResult &&
    mongoose.Types.ObjectId.isValid(actionResult)
  ) {
    filter.actionResult = actionResult;
  }

  // Status Filter
  if (
    status &&
    mongoose.Types.ObjectId.isValid(status)
  ) {
    filter.status = status;
  }

  // Current Status Filter
  if (currentStatus) {
    filter.currentStatus = {
      $regex: currentStatus,
      $options: "i",
    };
  }

  // Date Filter
  if (startDate || endDate) {
    filter.performedAt = {};

    if (startDate) {
      const from = new Date(startDate);
      from.setHours(0, 0, 0, 0);
      filter.performedAt.$gte = from;
    }

    if (endDate) {
      const to = new Date(endDate);
      to.setHours(23, 59, 59, 999);
      filter.performedAt.$lte = to;
    }
  }

  // Global Search
  if (search) {
    const words = search.trim().split(/\s+/);

    const leadIds = await Leads.find({
      $or: [
        { name: { $regex: words.join("|"), $options: "i" } },
        { phone: { $regex: words.join("|"), $options: "i" } },
        { email: { $regex: words.join("|"), $options: "i" } },
        { leadCode: { $regex: words.join("|"), $options: "i" } },
      ],
    }).distinct("_id");

    const userIds = await User.find({
      name: {
        $regex: words.join("|"),
        $options: "i",
      },
    }).distinct("_id");

    const actionIds = await LeadAction.find({
      title: {
        $regex: words.join("|"),
        $options: "i",
      },
    }).distinct("_id");

    const actionResultIds =
      await LeadActionResult.find({
        title: {
          $regex: words.join("|"),
          $options: "i",
        },
      }).distinct("_id");

    const statusIds = await LeadStatus.find({
      title: {
        $regex: words.join("|"),
        $options: "i",
      },
    }).distinct("_id");

    filter.$or = [
      { comment: { $regex: words.join("|"), $options: "i" } },
      { remark: { $regex: words.join("|"), $options: "i" } },
      {
        currentStatus: {
          $regex: words.join("|"),
          $options: "i",
        },
      },

      { leadId: { $in: leadIds } },

      { employeeId: { $in: userIds } },

      { performedBy: { $in: userIds } },

      { action: { $in: actionIds } },

      { prevAction: { $in: actionIds } },

      { nextAction: { $in: actionIds } },

      { actionResult: { $in: actionResultIds } },

      { prevActionResult: { $in: actionResultIds } },

      { status: { $in: statusIds } },

      { prevStatus: { $in: statusIds } },
    ];
  }

  const totalRecords =
    await LeadHistory.countDocuments(filter);

  let query = LeadHistory.find(filter)
    .populate({
      path: "leadId",
      select:
        "leadCode name phone email currentStatus",
    })
    .populate({
      path: "employeeId",
      select: "name email mobileNumber",
    })
    .populate({
      path: "performedBy",
      select: "name email mobileNumber",
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
    .sort({ performedAt: -1 });

  if (pagination === "true") {
    query = query
      .skip((page - 1) * limit)
      .limit(Number(limit));
  }

  const histories = await query;

  return res.status(200).json(
    new apiResponse(
      200,
      {
        histories,
        totalRecords,
        totalPages:
          pagination === "true"
            ? Math.ceil(totalRecords / limit)
            : 1,
        currentPage: Number(page),
      },
      "Lead history fetched successfully"
    )
  );
});

const getLeadHistoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid history ID"));
    }

    const history = await LeadHistory.findById(id)
      .populate("leadId", "name phone email")
      .populate("employeeId", "name email phone")
      .populate("performedBy", "name email phone");

    if (!history) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Lead history not found"));
    }

    res
      .status(200)
      .json(new apiResponse(200, history, "Lead history fetched successfully"));
  } catch (error) {
    res
      .status(500)
      .json(
        new apiResponse(500, null, `Error fetching history: ${error.message}`)
      );
  }
});

const getLeadHistoryByLead = asyncHandler(async (req, res) => {
  const { leadId } = req.params;

  const {
    page = 1,
    limit = 10,
    pagination = "true",
    search,
    employeeId,
    performedBy,
    action,
    actionResult,
    status,
    currentStatus,
    startDate,
    endDate,
  } = req.query;

  if (!mongoose.Types.ObjectId.isValid(leadId)) {
    return res
      .status(400)
      .json(
        new apiResponse(
          400,
          null,
          "Invalid lead ID"
        )
      );
  }

  const filter = {
    leadId,
  };

  // Employee Filter
  if (
    employeeId &&
    mongoose.Types.ObjectId.isValid(employeeId)
  ) {
    filter.employeeId = employeeId;
  }

  // Performed By Filter
  if (
    performedBy &&
    mongoose.Types.ObjectId.isValid(performedBy)
  ) {
    filter.performedBy = performedBy;
  }

  // Action Filter
  if (
    action &&
    mongoose.Types.ObjectId.isValid(action)
  ) {
    filter.action = action;
  }

  // Action Result Filter
  if (
    actionResult &&
    mongoose.Types.ObjectId.isValid(actionResult)
  ) {
    filter.actionResult = actionResult;
  }

  // Status Filter
  if (
    status &&
    mongoose.Types.ObjectId.isValid(status)
  ) {
    filter.status = status;
  }

  // Current Status Filter
  if (currentStatus) {
    filter.currentStatus = {
      $regex: currentStatus,
      $options: "i",
    };
  }

  // Date Filter
  if (startDate || endDate) {
    filter.performedAt = {};

    if (startDate) {
      const from = new Date(startDate);
      from.setHours(0, 0, 0, 0);
      filter.performedAt.$gte = from;
    }

    if (endDate) {
      const to = new Date(endDate);
      to.setHours(23, 59, 59, 999);
      filter.performedAt.$lte = to;
    }
  }

  // Global Search
  if (search) {
    const words = search.trim().split(/\s+/);

    const userIds = await User.find({
      name: {
        $regex: words.join("|"),
        $options: "i",
      },
    }).distinct("_id");

    const actionIds = await LeadAction.find({
      title: {
        $regex: words.join("|"),
        $options: "i",
      },
    }).distinct("_id");

    const actionResultIds =
      await LeadActionResult.find({
        title: {
          $regex: words.join("|"),
          $options: "i",
        },
      }).distinct("_id");

    const statusIds = await LeadStatus.find({
      title: {
        $regex: words.join("|"),
        $options: "i",
      },
    }).distinct("_id");

    filter.$or = [
      {
        comment: {
          $regex: words.join("|"),
          $options: "i",
        },
      },
      {
        remark: {
          $regex: words.join("|"),
          $options: "i",
        },
      },
      {
        currentStatus: {
          $regex: words.join("|"),
          $options: "i",
        },
      },

      { employeeId: { $in: userIds } },
      { performedBy: { $in: userIds } },

      { action: { $in: actionIds } },
      { prevAction: { $in: actionIds } },
      { nextAction: { $in: actionIds } },

      {
        actionResult: {
          $in: actionResultIds,
        },
      },
      {
        prevActionResult: {
          $in: actionResultIds,
        },
      },

      { status: { $in: statusIds } },
      { prevStatus: { $in: statusIds } },
    ];
  }

  const totalRecords =
    await LeadHistory.countDocuments(filter);

  let query = LeadHistory.find(filter)
    .populate({
      path: "leadId",
      select:
        "leadCode name phone email currentStatus platform leadDate",
    })
    .populate({
      path: "employeeId",
      select:
        "name email mobileNumber role",
    })
    .populate({
      path: "performedBy",
      select:
        "name email mobileNumber role",
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
    .sort({
      performedAt: -1,
    });

  if (pagination === "true") {
    query = query
      .skip((page - 1) * limit)
      .limit(Number(limit));
  }

  const histories = await query;

  return res.status(200).json(
    new apiResponse(
      200,
      {
        histories,
        totalRecords,
        totalPages:
          pagination === "true"
            ? Math.ceil(
              totalRecords / Number(limit)
            )
            : 1,
        currentPage: Number(page),
      },
      "Lead history fetched successfully"
    )
  );
});

const deleteLeadHistory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid history ID"));
    }

    const deleted = await LeadHistory.findByIdAndDelete(id);

    if (!deleted) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Lead history not found"));
    }

    res
      .status(200)
      .json(new apiResponse(200, deleted, "Lead history deleted successfully"));
  } catch (error) {
    res
      .status(500)
      .json(
        new apiResponse(500, null, `Error deleting history: ${error.message}`)
      );
  }
});

export {
  addLeadHistory,
  getAllLeadHistory,
  getLeadHistoryById,
  getLeadHistoryByLead,
  deleteLeadHistory,
};
