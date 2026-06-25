import Integration from "../models/Intigration.modal.js";
import Platform from "../models/Platform.modal.js";

import mongoose from "mongoose";
import { asyncHandler } from "../utils/asynchandler.js";
import { apiResponse } from "../utils/apiResponse.js";

const addIntegration = asyncHandler(async (req, res) => {
  try {
    const { platform, googleSheetUrl, fetchTime, status } = req.body;

    if (!platform) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Platform is required"));
    }

    if (!mongoose.Types.ObjectId.isValid(platform)) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid Platform ID"));
    }

    const platformExists = await Platform.findById(platform);

    if (!platformExists) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Platform not found"));
    }

    const integration = await Integration.create({
      platform,
      googleSheetUrl,
      fetchTime,
      status,
    });

    const populatedIntegration = await Integration.findById(
      integration._id
    ).populate("platform");

    res
      .status(201)
      .json(
        new apiResponse(
          201,
          populatedIntegration,
          "Integration created successfully"
        )
      );
  } catch (error) {
    res
      .status(500)
      .json(
        new apiResponse(
          500,
          null,
          `Error creating integration: ${error.message}`
        )
      );
  }
});

const getAllIntegrations = asyncHandler(async (req, res) => {
  const {
    search,
    platform,
    status,
    sortBy = "recent",
    page = 1,
    limit = 10,
    pagination = "true",
  } = req.query;

  const query = {};

  // Platform filter
  if (platform && mongoose.Types.ObjectId.isValid(platform)) {
    query.platform = platform;
  }

  // Status filter
  if (status !== undefined) {
    query.status = status === "true";
  }

  // Search by platform title
  if (search) {
    const platforms = await Platform.find({
      title: { $regex: search, $options: "i" },
    }).select("_id");

    query.platform = {
      $in: platforms.map((item) => item._id),
    };
  }

  let integrationsQuery = Integration.find(query).populate("platform");

  // Sorting
  if (sortBy === "recent") {
    integrationsQuery = integrationsQuery.sort({ createdAt: -1 });
  } else if (sortBy === "oldest") {
    integrationsQuery = integrationsQuery.sort({ createdAt: 1 });
  }

  const totalRecords = await Integration.countDocuments(query);

  // Pagination
  if (pagination === "true") {
    const skip = (Number(page) - 1) * Number(limit);

    integrationsQuery = integrationsQuery
      .skip(skip)
      .limit(Number(limit));
  }

  const integrations = await integrationsQuery;

  return res.status(200).json(
    new apiResponse(
      200,
      {
        integrations,
        totalRecords,
        currentPage: Number(page),
        totalPages: Math.ceil(totalRecords / Number(limit)),
        limit: Number(limit),
      },
      "Integrations fetched successfully"
    )
  );
});

const getIntegrationById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid Integration ID"));
  }

  const integration = await Integration.findById(id).populate("platform");

  if (!integration) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Integration not found"));
  }

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        integration,
        "Integration fetched successfully"
      )
    );
});

const updateIntegration = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { platform, googleSheetUrl, fetchTime, status } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid Integration ID"));
  }

  const integration = await Integration.findById(id);

  if (!integration) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Integration not found"));
  }

  if (platform) {
    if (!mongoose.Types.ObjectId.isValid(platform)) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid Platform ID"));
    }

    const platformExists = await Platform.findById(platform);

    if (!platformExists) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Platform not found"));
    }

    integration.platform = platform;
  }

  if (googleSheetUrl !== undefined)
    integration.googleSheetUrl = googleSheetUrl;

  if (fetchTime !== undefined) integration.fetchTime = fetchTime;

  if (status !== undefined) integration.status = status;

  await integration.save();

  const updatedIntegration = await Integration.findById(
    integration._id
  ).populate("platform");

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        updatedIntegration,
        "Integration updated successfully"
      )
    );
});

const deleteIntegration = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid Integration ID"));
  }

  const integration = await Integration.findById(id);

  if (!integration) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Integration not found"));
  }

  await Integration.findByIdAndDelete(id);

  res
    .status(200)
    .json(new apiResponse(200, null, "Integration deleted successfully"));
});

export {
  addIntegration,
  getAllIntegrations,
  getIntegrationById,
  updateIntegration,
  deleteIntegration,
};