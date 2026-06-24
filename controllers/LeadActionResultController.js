import LeadActionResult from "../models/LeadActionResult.modal.js";
import LeadAction from "../models/LeadAction.modal.js";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asynchandler.js";
import { apiResponse } from "../utils/apiResponse.js";

const addLeadActionResult = asyncHandler(async (req, res) => {
  const { leadAction, title } = req.body;

  if (!leadAction || !title) {
    return res.status(400).json(
      new apiResponse(
        400,
        null,
        "leadAction and title are required"
      )
    );
  }

  if (!mongoose.Types.ObjectId.isValid(leadAction)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid leadAction ID"));
  }

  const leadActionExists = await LeadAction.findById(leadAction);

  if (!leadActionExists) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Lead Action not found"));
  }

  // Duplicate check
  const existingResult = await LeadActionResult.findOne({
    leadAction,
    title: title.trim(),
  });

  if (existingResult) {
    return res.status(409).json(
      new apiResponse(
        409,
        null,
        "This title already exists for the selected Lead Action"
      )
    );
  }

  const result = await LeadActionResult.create({
    leadAction,
    title: title.trim(),
  });

  const populatedResult = await LeadActionResult.findById(
    result._id
  ).populate("leadAction", "title LeadActionId");

  return res.status(201).json(
    new apiResponse(
      201,
      populatedResult,
      "Lead Action Result created successfully"
    )
  );
});

const getAllLeadActionResults = asyncHandler(async (req, res) => {
  const {
    search,
    leadAction,
    sortBy = "order",
    page = 1,
    limit = 10,
    pagination = "true",
  } = req.query;

  const query = {};

  if (leadAction && mongoose.Types.ObjectId.isValid(leadAction)) {
    query.leadAction = leadAction;
  }

  if (search) {
    query.title = {
      $regex: search,
      $options: "i",
    };
  }

  let resultQuery = LeadActionResult.find(query).populate(
    "leadAction",
    "title LeadActionId"
  );

  // Sorting
  if (sortBy === "recent") {
    resultQuery = resultQuery.sort({ createdAt: -1 });
  } else if (sortBy === "oldest") {
    resultQuery = resultQuery.sort({ createdAt: 1 });
  } else {
    // Default sorting by order
    resultQuery = resultQuery.sort({
      order: 1,
      createdAt: 1,
    });
  }

  // Without pagination
  if (pagination === "false") {
    const results = await resultQuery;

    return res.status(200).json(
      new apiResponse(
        200,
        {
          data: results,
          totalRecords: results.length,
        },
        "Lead Action Results fetched successfully"
      )
    );
  }

  const pageNumber = Math.max(1, parseInt(page));
  const limitNumber = Math.max(1, parseInt(limit));

  const totalRecords = await LeadActionResult.countDocuments(query);

  const results = await resultQuery
    .skip((pageNumber - 1) * limitNumber)
    .limit(limitNumber);

  const totalPages = Math.ceil(totalRecords / limitNumber);

  return res.status(200).json(
    new apiResponse(
      200,
      {
        data: results,
        pagination: {
          currentPage: pageNumber,
          totalPages,
          totalRecords,
          limit: limitNumber,
          hasNextPage: pageNumber < totalPages,
          hasPrevPage: pageNumber > 1,
        },
      },
      "Lead Action Results fetched successfully"
    )
  );
});

const getLeadActionResultById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid ID"));
  }

  const result = await LeadActionResult.findById(id).populate(
    "leadAction",
    "title LeadActionId"
  );

  if (!result) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Lead Action Result not found"));
  }

  return res.status(200).json(
    new apiResponse(
      200,
      result,
      "Lead Action Result fetched successfully"
    )
  );
});

const updateLeadActionResult = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { leadAction, title, status } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid ID"));
  }

  const result = await LeadActionResult.findById(id);

  if (!result) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Lead Action Result not found"));
  }

  if (leadAction) {
    if (!mongoose.Types.ObjectId.isValid(leadAction)) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid Lead Action ID"));
    }

    const leadActionExists = await LeadAction.findById(leadAction);

    if (!leadActionExists) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Lead Action not found"));
    }

    result.leadAction = leadAction;
  }

  if (title !== undefined) {
    result.title = title.trim();
  }

  if (status !== undefined) {
    result.status = status;
  }

  await result.save();

  const updatedResult = await LeadActionResult.findById(id).populate(
    "leadAction",
    "title LeadActionId"
  );

  return res.status(200).json(
    new apiResponse(
      200,
      updatedResult,
      "Lead Action Result updated successfully"
    )
  );
});

const deleteLeadActionResult = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid ID"));
  }

  const result = await LeadActionResult.findById(id);

  if (!result) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Lead Action Result not found"));
  }

  await LeadActionResult.findByIdAndDelete(id);

  return res.status(200).json(
    new apiResponse(
      200,
      null,
      "Lead Action Result deleted successfully"
    )
  );
});

const reorderLeadActionResults = asyncHandler(async (req, res) => {
  const { leadActionResults } = req.body;

  if (
    !Array.isArray(leadActionResults) ||
    leadActionResults.length === 0
  ) {
    return res.status(400).json(
      new apiResponse(
        400,
        null,
        "leadActionResults array is required"
      )
    );
  }

  const bulkOps = leadActionResults.map((id, index) => ({
    updateOne: {
      filter: { _id: id },
      update: {
        $set: {
          order: index + 1,
        },
      },
    },
  }));

  await LeadActionResult.bulkWrite(bulkOps);

  const updatedResults = await LeadActionResult.find()
    .populate("leadAction", "title")
    .sort({ order: 1 });

  return res.status(200).json(
    new apiResponse(
      200,
      updatedResults,
      "Lead Action Results reordered successfully"
    )
  );
});

export {
  addLeadActionResult,
  getAllLeadActionResults,
  getLeadActionResultById,
  updateLeadActionResult,
  deleteLeadActionResult,
  reorderLeadActionResults
};