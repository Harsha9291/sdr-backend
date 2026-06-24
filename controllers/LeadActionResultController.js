import LeadActionResult from "../models/LeadActionResult.modal.js";
import LeadAction from "../models/LeadAction.modal.js";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asynchandler.js";
import { apiResponse } from "../utils/apiResponse.js";

const addLeadActionResult = asyncHandler(async (req, res) => {
  try {
    const { LeadAction, title } = req.body;

    if (!LeadAction || !title) {
      return res
        .status(400)
        .json(
          new apiResponse(
            400,
            null,
            "LeadAction and title are required"
          )
        );
    }

    if (!mongoose.Types.ObjectId.isValid(LeadAction)) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid LeadAction ID"));
    }

    const leadActionExists = await LeadAction.findById(LeadAction);

    if (!leadActionExists) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "LeadAction not found"));
    }

    const result = await LeadActionResult.create({
      LeadAction,
      title: title.trim(),
    });

    const populatedResult = await LeadActionResult.findById(
      result._id
    ).populate("LeadAction");

    res
      .status(201)
      .json(
        new apiResponse(
          201,
          populatedResult,
          "Lead Action Result created successfully"
        )
      );
  } catch (error) {
    res
      .status(500)
      .json(
        new apiResponse(
          500,
          null,
          `Error creating Lead Action Result: ${error.message}`
        )
      );
  }
});

const getAllLeadActionResults = asyncHandler(async (req, res) => {
  const {
    search,
    leadAction,
    sortBy = "recent",
    page = 1,
    limit = 10,
    pagination = "true",
  } = req.query;

  let query = {};

  if (leadAction && mongoose.Types.ObjectId.isValid(leadAction)) {
    query.LeadAction = leadAction;
  }

  if (search) {
    query.title = {
      $regex: search,
      $options: "i",
    };
  }

  let resultQuery = LeadActionResult.find(query).populate(
    "LeadAction",
    "title LeadActionId"
  );

  // Sorting
  if (sortBy === "recent") {
    resultQuery = resultQuery.sort({ createdAt: -1 });
  } else if (sortBy === "oldest") {
    resultQuery = resultQuery.sort({ createdAt: 1 });
  }

  // If pagination=false return all records
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

  res.status(200).json(
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
    "LeadAction",
    "title LeadActionId"
  );

  if (!result) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Lead Action Result not found"));
  }

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        result,
        "Lead Action Result fetched successfully"
      )
    );
});

const updateLeadActionResult = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { LeadAction, title, status } = req.body;

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

  if (LeadAction) {
    if (!mongoose.Types.ObjectId.isValid(LeadAction)) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid LeadAction ID"));
    }

    const leadActionExists = await LeadAction.findById(LeadAction);

    if (!leadActionExists) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "LeadAction not found"));
    }

    result.LeadAction = LeadAction;
  }

  if (title !== undefined) {
    result.title = title.trim();
  }

  if (status !== undefined) {
    result.status = status;
  }

  await result.save();

  const updatedResult = await LeadActionResult.findById(id).populate(
    "LeadAction",
    "title LeadActionId"
  );

  res
    .status(200)
    .json(
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

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        null,
        "Lead Action Result deleted successfully"
      )
    );
});

export {
  addLeadActionResult,
  getAllLeadActionResults,
  getLeadActionResultById,
  updateLeadActionResult,
  deleteLeadActionResult,
};