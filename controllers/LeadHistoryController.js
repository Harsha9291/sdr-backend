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
  const { leadId, employeeId, actionType, status, startDate, endDate } =
    req.query;

  try {
    const filter = {};

    // ✅ Use mongoose.isValidObjectId() & mongoose.Types.ObjectId() (no 'new')
    if (leadId && mongoose.isValidObjectId(leadId)) {
      filter.leadId = mongoose.Types.ObjectId(leadId);
    }

    if (employeeId && mongoose.isValidObjectId(employeeId)) {
      filter.employeeId = mongoose.Types.ObjectId(employeeId);
    }

    if (actionType) filter.actionType = actionType;
    if (status) filter.status = status;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const histories = await LeadHistory.find(filter)
      .populate("leadId", "name phone email")
      .populate("employeeId", "name email phone")
      .populate("performedBy", "name email phone")
      .sort({ createdAt: -1 });

    return res
      .status(200)
      .json(
        new apiResponse(200, histories, "Lead history fetched successfully")
      );
  } catch (error) {
    console.error("Error fetching lead history:", error);
    return res
      .status(500)
      .json(
        new apiResponse(
          500,
          null,
          `Error fetching lead history: ${error.message}`
        )
      );
  }
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

  try {
    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid lead ID"));
    }

    const histories = await LeadHistory.find({ leadId })
      .populate("employeeId", "name email phone")
      .populate("performedBy", "name email phone")
      .sort({ createdAt: -1 });

    res
      .status(200)
      .json(
        new apiResponse(
          200,
          histories,
          "Lead history for this lead fetched successfully"
        )
      );
  } catch (error) {
    res
      .status(500)
      .json(
        new apiResponse(
          500,
          null,
          `Error fetching lead history: ${error.message}`
        )
      );
  }
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
