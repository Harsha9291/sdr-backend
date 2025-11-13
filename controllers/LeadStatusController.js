import LeadStatus from "../models/LeadStatus.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import mongoose from "mongoose";

// ✅ Add single lead status
const addLeadStatus = asyncHandler(async (req, res) => {
  try {
    const { title, status } = req.body;

    if (!title) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Lead status title is required"));
    }

    // Check if already exists
    const existing = await LeadStatus.findOne({ title: title.trim() });
    if (existing) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Lead status already exists"));
    }

    const newStatus = await LeadStatus.create({
      title: title.trim(),
      status: status ?? true,
    });

    res
      .status(201)
      .json(
        new apiResponse(201, newStatus, "Lead status created successfully")
      );
  } catch (error) {
    res
      .status(500)
      .json(
        new apiResponse(
          500,
          null,
          `Error creating lead status: ${error.message}`
        )
      );
  }
});

// ✅ Bulk add lead statuses
const bulkAddLeadStatuses = asyncHandler(async (req, res) => {
  const statuses = req.body.statuses;

  if (!Array.isArray(statuses) || statuses.length === 0) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid or empty statuses array"));
  }

  try {
    // Remove duplicates in request
    const uniqueStatuses = statuses.filter(
      (item, index, self) =>
        index ===
        self.findIndex(
          (t) =>
            t.title?.trim().toLowerCase() === item.title?.trim().toLowerCase()
        )
    );

    // Check existing in DB
    const existingTitles = await LeadStatus.find({
      title: { $in: uniqueStatuses.map((s) => s.title.trim()) },
    }).distinct("title");

    // Filter out existing
    const newStatuses = uniqueStatuses.filter(
      (s) => !existingTitles.includes(s.title.trim())
    );

    if (newStatuses.length === 0) {
      return res
        .status(200)
        .json(new apiResponse(200, [], "All lead statuses already exist"));
    }

    // Insert new
    const inserted = await LeadStatus.insertMany(
      newStatuses.map((s) => ({
        title: s.title.trim(),
        status: s.status ?? true,
      })),
      { ordered: false }
    );

    res.status(201).json(
      new apiResponse(
        201,
        {
          totalReceived: statuses.length,
          insertedCount: inserted.length,
        },
        `${inserted.length} new lead statuses added successfully`
      )
    );
  } catch (error) {
    res
      .status(500)
      .json(new apiResponse(500, null, `Bulk insert error: ${error.message}`));
  }
});

// ✅ Get all lead statuses
const getAllLeadStatuses = asyncHandler(async (req, res) => {
  const { search, sortBy = "recent" } = req.query;

  let query = {};
  if (search) {
    const regex = new RegExp(search, "i");
    query.title = regex;
  }

  let leadStatusQuery = LeadStatus.find(query);

  // Sorting
  if (sortBy === "recent")
    leadStatusQuery = leadStatusQuery.sort({ createdAt: -1 });
  else if (sortBy === "oldest")
    leadStatusQuery = leadStatusQuery.sort({ createdAt: 1 });

  const leadStatuses = await leadStatusQuery;

  res
    .status(200)
    .json(
      new apiResponse(200, leadStatuses, "Lead statuses fetched successfully")
    );
});

// ✅ Get single lead status by ID
const getLeadStatusById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid lead status ID"));
  }

  const leadStatus = await LeadStatus.findById(id);

  if (!leadStatus) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Lead status not found"));
  }

  res
    .status(200)
    .json(new apiResponse(200, leadStatus, "Lead status fetched successfully"));
});

// ✅ Update lead status
const updateLeadStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, status } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid lead status ID"));
  }

  const leadStatus = await LeadStatus.findById(id);
  if (!leadStatus) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Lead status not found"));
  }

  if (title) leadStatus.title = title.trim();
  if (typeof status === "boolean") leadStatus.status = status;

  await leadStatus.save();

  res
    .status(200)
    .json(new apiResponse(200, leadStatus, "Lead status updated successfully"));
});

// ✅ Delete lead status
const deleteLeadStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid lead status ID"));
  }

  const leadStatus = await LeadStatus.findById(id);
  if (!leadStatus) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Lead status not found"));
  }

  await LeadStatus.findByIdAndDelete(id);

  res
    .status(200)
    .json(new apiResponse(200, null, "Lead status deleted successfully"));
});

export {
  addLeadStatus,
  bulkAddLeadStatuses,
  getAllLeadStatuses,
  getLeadStatusById,
  updateLeadStatus,
  deleteLeadStatus,
};
