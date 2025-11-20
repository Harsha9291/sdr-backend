import LeadRate from "../models/LeadRate.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import mongoose from "mongoose";

// -------------------------------------------------------
// ADD SINGLE LEAD RATE
// -------------------------------------------------------
const addLeadRate = asyncHandler(async (req, res) => {
  const { title, actionStatus } = req.body;

  if (!title) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Title is required"));
  }

  const newRate = await LeadRate.create({
    title: title.trim(),
    actionStatus: actionStatus || null,
  });

  res
    .status(201)
    .json(new apiResponse(201, newRate, "Lead rate created successfully"));
});

// -------------------------------------------------------
// BULK ADD LEAD RATES
// -------------------------------------------------------
const bulkAddLeadRates = asyncHandler(async (req, res) => {
  const rates = req.body.rates;

  if (!Array.isArray(rates) || rates.length === 0) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid or empty rates array"));
  }

  // Remove duplicate titles inside request
  const unique = rates.filter(
    (item, i, arr) =>
      i ===
      arr.findIndex(
        (v) =>
          v.title?.trim().toLowerCase() === item.title?.trim().toLowerCase()
      )
  );

  // Existing titles in DB
  const existingTitles = await LeadRate.find({
    title: { $in: unique.map((s) => s.title.trim()) },
  }).distinct("title");

  const toInsert = unique.filter(
    (s) => !existingTitles.includes(s.title.trim())
  );

  if (toInsert.length === 0) {
    return res
      .status(200)
      .json(new apiResponse(200, [], "All lead rates already exist"));
  }

  const inserted = await LeadRate.insertMany(
    toInsert.map((s) => ({
      title: s.title.trim(),
      actionStatus: s.actionStatus || null,
    })),
    { ordered: false }
  );

  res
    .status(201)
    .json(
      new apiResponse(
        201,
        { totalReceived: rates.length, insertedCount: inserted.length },
        `${inserted.length} new lead rates added successfully`
      )
    );
});

// -------------------------------------------------------
// GET ALL LEAD RATES
// -------------------------------------------------------
const getAllLeadRates = asyncHandler(async (req, res) => {
  const {
    search,
    sortBy = "recent",
    actionStatus,
    isPagination = "true",
    page = 1,
    limit = 10,
  } = req.query;

  const query = {};

  // Search filter
  if (search) {
    query.title = new RegExp(search, "i");
  }

  // ActionStatus filter
  if (actionStatus && mongoose.Types.ObjectId.isValid(actionStatus)) {
    query.actionStatus = actionStatus;
  }

  let q = LeadRate.find(query);

  // Sorting
  if (sortBy === "recent") q.sort({ createdAt: -1 });
  if (sortBy === "oldest") q.sort({ createdAt: 1 });

  const shouldPaginate = isPagination === "true";

  const total = await LeadRate.countDocuments(query);

  if (shouldPaginate) {
    const skip = (Number(page) - 1) * Number(limit);
    q = q.skip(skip).limit(Number(limit));
  }

  const data = await q.populate("actionStatus");

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
      "Lead rates fetched successfully"
    )
  );
});

// -------------------------------------------------------
// GET LEAD RATE BY ID
// -------------------------------------------------------
const getLeadRateById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid ID format"));
  }

  const data = await LeadRate.findById(id).populate("actionStatus");

  if (!data) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Lead rate not found"));
  }

  return res
    .status(200)
    .json(new apiResponse(200, data, "Lead rate fetched successfully"));
});

// -------------------------------------------------------
// UPDATE LEAD RATE
// -------------------------------------------------------
const updateLeadRate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, actionStatus } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid ID format"));
  }

  const data = await LeadRate.findById(id);
  if (!data) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Lead rate not found"));
  }

  if (title) data.title = title.trim();
  if (actionStatus) data.actionStatus = actionStatus;

  await data.save();

  return res
    .status(200)
    .json(new apiResponse(200, data, "Lead rate updated successfully"));
});

// -------------------------------------------------------
// DELETE LEAD RATE
// -------------------------------------------------------
const deleteLeadRate = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid ID format"));
  }

  const data = await LeadRate.findById(id);
  if (!data) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Lead rate not found"));
  }

  await LeadRate.findByIdAndDelete(id);

  return res
    .status(200)
    .json(new apiResponse(200, null, "Lead rate deleted successfully"));
});

export {
  addLeadRate,
  bulkAddLeadRates,
  getAllLeadRates,
  getLeadRateById,
  updateLeadRate,
  deleteLeadRate,
};
