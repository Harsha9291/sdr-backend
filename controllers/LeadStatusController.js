import LeadStatus from "../models/LeadStatus.modal.js";
import LeadActionResult from "../models/LeadActionResult.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import mongoose from "mongoose";

const addLeadStatus = asyncHandler(async (req, res) => {
  const { title, leadActionResult } = req.body;

  if (!title || !leadActionResult) {
    return res.status(400).json(
      new apiResponse(
        400,
        null,
        "title and leadActionResult are required"
      )
    );
  }

  if (!mongoose.Types.ObjectId.isValid(leadActionResult)) {
    return res.status(400).json(
      new apiResponse(400, null, "Invalid leadActionResult ID")
    );
  }

  const leadActionResultExists = await LeadActionResult.findById(
    leadActionResult
  );

  if (!leadActionResultExists) {
    return res.status(404).json(
      new apiResponse(404, null, "Lead Action Result not found")
    );
  }

  const newStatus = await LeadStatus.create({
    title: title.trim(),
    leadActionResult,
  });

  const populatedStatus = await LeadStatus.findById(newStatus._id)
    .populate({
      path: "leadActionResult",
      populate: {
        path: "leadAction",
        select: "title LeadActionId",
      },
    });

  return res.status(201).json(
    new apiResponse(
      201,
      populatedStatus,
      "Lead status created successfully"
    )
  );
});

const bulkAddLeadStatuses = asyncHandler(async (req, res) => {
  const statuses = req.body.statuses;

  if (!Array.isArray(statuses) || statuses.length === 0) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid or empty statuses array"));
  }

  // Remove duplicate titles in request
  const unique = statuses.filter(
    (item, i, arr) =>
      i ===
      arr.findIndex(
        (v) =>
          v.title?.trim().toLowerCase() === item.title?.trim().toLowerCase()
      )
  );

  // Validate leadActionResult IDs
  for (const status of unique) {
    if (!status.title?.trim()) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Title is required"));
    }

    if (!status.leadActionResult) {
      return res
        .status(400)
        .json(
          new apiResponse(
            400,
            null,
            `leadActionResult is required for '${status.title}'`
          )
        );
    }

    if (!mongoose.Types.ObjectId.isValid(status.leadActionResult)) {
      return res
        .status(400)
        .json(
          new apiResponse(
            400,
            null,
            `Invalid leadActionResult ID for '${status.title}'`
          )
        );
    }

    const exists = await LeadActionResult.findById(status.leadActionResult);

    if (!exists) {
      return res
        .status(404)
        .json(
          new apiResponse(
            404,
            null,
            `Lead Action Result not found for '${status.title}'`
          )
        );
    }
  }

  // Check existing titles
  const existingTitles = await LeadStatus.find({
    title: {
      $in: unique.map((s) => s.title.trim()),
    },
  }).distinct("title");

  const toInsert = unique.filter(
    (s) => !existingTitles.includes(s.title.trim())
  );

  if (toInsert.length === 0) {
    return res
      .status(200)
      .json(new apiResponse(200, [], "All lead statuses already exist"));
  }

  const inserted = await LeadStatus.insertMany(
    toInsert.map((s) => ({
      title: s.title.trim(),
      leadActionResult: s.leadActionResult,
    })),
    { ordered: false }
  );

  const populatedStatuses = await LeadStatus.find({
    _id: { $in: inserted.map((item) => item._id) },
  }).populate({
    path: "leadActionResult",
    populate: {
      path: "leadAction",
      select: "title LeadActionId",
    },
  });

  return res.status(201).json(
    new apiResponse(
      201,
      {
        totalReceived: statuses.length,
        insertedCount: inserted.length,
        data: populatedStatuses,
      },
      `${inserted.length} new lead statuses added successfully`
    )
  );
});

const getAllLeadStatuses = asyncHandler(async (req, res) => {
  const {
    search,
    sortBy = "recent",
    action,
    isPagination = "true",
    page = 1,
    limit = 10,
  } = req.query;

  const query = {};

  // Search filter
  if (search) {
    query.title = new RegExp(search, "i");
  }

  // Action filter
  if (action && mongoose.Types.ObjectId.isValid(action)) {
    query.leadActionResult = action;
  }

  let q = LeadStatus.find(query);

  // Sorting
  if (sortBy === "recent") q.sort({ createdAt: -1 });
  if (sortBy === "oldest") q.sort({ createdAt: 1 });

  // Pagination logic
  const shouldPaginate = isPagination === "true";

  let total = await LeadStatus.countDocuments(query);

  if (shouldPaginate) {
    const skip = (Number(page) - 1) * Number(limit);
    q = q.skip(skip).limit(Number(limit));
  }

  const data = await q.populate("leadActionResult", "title");

  return res.status(200).json(
    new apiResponse(
      200,
      {
        total,
        page: shouldPaginate ? Number(page) : null,
        limit: shouldPaginate ? Number(limit) : null,
        totalPages: shouldPaginate ? Math.ceil(total / Number(limit)) : 1,
        data,
      },
      "Lead statuses fetched successfully"
    )
  );
});

const getLeadStatusById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid lead status ID"));
  }

  const data = await LeadStatus.findById(id).populate("leadActionResult", "title");

  if (!data) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Lead status not found"));
  }

  res
    .status(200)
    .json(new apiResponse(200, data, "Lead status fetched successfully"));
});

const updateLeadStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, leadActionResult } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid lead status ID"));
  }

  const data = await LeadStatus.findById(id);
  if (!data) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Lead status not found"));
  }

  if (title) data.title = title.trim();
  if (leadActionResult) data.leadActionResult = leadActionResult;

  await data.save();

  res
    .status(200)
    .json(new apiResponse(200, data, "Lead status updated successfully"));
});

const deleteLeadStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid lead status ID"));
  }

  const data = await LeadStatus.findById(id);
  if (!data) {
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
