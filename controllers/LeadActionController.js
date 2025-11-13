import LeadAction from "../models/LeadAction.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import mongoose from "mongoose";

// 🟢 Add Single Lead Action
const addLeadAction = asyncHandler(async (req, res) => {
  try {
    const { title } = req.body;

    if (!title) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Lead action title is required"));
    }

    const existing = await LeadAction.findOne({ title: title.trim() });
    if (existing) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Lead action already exists"));
    }

    const newAction = await LeadAction.create({ title: title.trim() });

    res
      .status(201)
      .json(
        new apiResponse(201, newAction, "Lead action created successfully")
      );
  } catch (error) {
    res
      .status(500)
      .json(
        new apiResponse(
          500,
          null,
          `Error creating lead action: ${error.message}`
        )
      );
  }
});

// 🟢 Bulk Add Lead Actions
const bulkAddLeadActions = asyncHandler(async (req, res) => {
  const actions = req.body.actions;

  if (!Array.isArray(actions) || actions.length === 0) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid or empty actions array"));
  }

  try {
    const uniqueActions = actions.filter(
      (item, index, self) =>
        index ===
        self.findIndex(
          (t) =>
            t.title?.trim().toLowerCase() === item.title?.trim().toLowerCase()
        )
    );

    const existingTitles = await LeadAction.find({
      title: { $in: uniqueActions.map((a) => a.title) },
    }).distinct("title");

    const newActions = uniqueActions.filter(
      (a) => !existingTitles.includes(a.title)
    );

    if (newActions.length === 0) {
      return res
        .status(200)
        .json(new apiResponse(200, [], "All lead actions already exist"));
    }

    const inserted = await LeadAction.insertMany(
      newActions.map((a) => ({ title: a.title.trim() })),
      { ordered: false }
    );

    res
      .status(201)
      .json(
        new apiResponse(
          201,
          { totalReceived: actions.length, insertedCount: inserted.length },
          `${inserted.length} new lead actions added successfully`
        )
      );
  } catch (error) {
    res
      .status(500)
      .json(new apiResponse(500, null, `Bulk insert error: ${error.message}`));
  }
});

// 🟡 Get All Lead Actions
const getAllLeadActions = asyncHandler(async (req, res) => {
  const { search, sortBy = "recent" } = req.query;

  let query = {};
  if (search) {
    const regex = new RegExp(search, "i");
    query.title = regex;
  }

  let actionQuery = LeadAction.find(query);

  if (sortBy === "recent") actionQuery = actionQuery.sort({ createdAt: -1 });
  else if (sortBy === "oldest")
    actionQuery = actionQuery.sort({ createdAt: 1 });

  const actions = await actionQuery;

  res
    .status(200)
    .json(new apiResponse(200, actions, "Lead actions fetched successfully"));
});

// 🟡 Get Lead Action by ID
const getLeadActionById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid lead action ID"));
  }

  const action = await LeadAction.findById(id);

  if (!action) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Lead action not found"));
  }

  res
    .status(200)
    .json(new apiResponse(200, action, "Lead action fetched successfully"));
});

// 🟠 Update Lead Action
const updateLeadAction = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, status } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid lead action ID"));
  }

  const action = await LeadAction.findById(id);
  if (!action) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Lead action not found"));
  }

  if (title) action.title = title.trim();
  if (status !== undefined) action.status = status;

  await action.save();

  res
    .status(200)
    .json(new apiResponse(200, action, "Lead action updated successfully"));
});

// 🔴 Delete Lead Action
const deleteLeadAction = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid lead action ID"));
  }

  const action = await LeadAction.findById(id);
  if (!action) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Lead action not found"));
  }

  await LeadAction.findByIdAndDelete(id);

  res
    .status(200)
    .json(new apiResponse(200, null, "Lead action deleted successfully"));
});

export {
  addLeadAction,
  bulkAddLeadActions,
  getAllLeadActions,
  getLeadActionById,
  updateLeadAction,
  deleteLeadAction,
};
