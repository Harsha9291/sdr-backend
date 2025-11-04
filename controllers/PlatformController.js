import Platform from "../models/Platform.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import mongoose from "mongoose";

// Add single platform
const addPlatform = asyncHandler(async (req, res) => {
  try {
    const { title } = req.body;

    if (!title) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Platform title is required"));
    }

    // Check if platform already exists
    const existing = await Platform.findOne({ title: title.trim() });
    if (existing) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Platform already exists"));
    }

    const newPlatform = await Platform.create({ title: title.trim() });

    res
      .status(201)
      .json(new apiResponse(201, newPlatform, "Platform created successfully"));
  } catch (error) {
    res
      .status(500)
      .json(
        new apiResponse(500, null, `Error creating platform: ${error.message}`)
      );
  }
});

// Bulk add platforms
const bulkAddPlatforms = asyncHandler(async (req, res) => {
  const platforms = req.body.platforms;

  if (!Array.isArray(platforms) || platforms.length === 0) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid or empty platforms array"));
  }

  try {
    // Remove duplicates in the request
    const uniquePlatforms = platforms.filter(
      (item, index, self) =>
        index ===
        self.findIndex(
          (t) =>
            t.title?.trim().toLowerCase() === item.title?.trim().toLowerCase()
        )
    );

    // Check existing platforms in DB
    const existingTitles = await Platform.find({
      title: { $in: uniquePlatforms.map((p) => p.title) },
    }).distinct("title");

    // Filter out existing
    const newPlatforms = uniquePlatforms.filter(
      (p) => !existingTitles.includes(p.title)
    );

    if (newPlatforms.length === 0) {
      return res
        .status(200)
        .json(new apiResponse(200, [], "All platforms already exist"));
    }

    // Insert new platforms
    const inserted = await Platform.insertMany(
      newPlatforms.map((p) => ({ title: p.title.trim() })),
      { ordered: false }
    );

    res
      .status(201)
      .json(
        new apiResponse(
          201,
          { totalReceived: platforms.length, insertedCount: inserted.length },
          `${inserted.length} new platforms added successfully`
        )
      );
  } catch (error) {
    res
      .status(500)
      .json(new apiResponse(500, null, `Bulk insert error: ${error.message}`));
  }
});

// Get all platforms
const getAllPlatforms = asyncHandler(async (req, res) => {
  const { search, sortBy = "recent" } = req.query;

  let query = {};
  if (search) {
    const regex = new RegExp(search, "i");
    query.title = regex;
  }

  let platformsQuery = Platform.find(query);

  // Sorting
  if (sortBy === "recent")
    platformsQuery = platformsQuery.sort({ createdAt: -1 });
  else if (sortBy === "oldest")
    platformsQuery = platformsQuery.sort({ createdAt: 1 });

  const platforms = await platformsQuery;

  res
    .status(200)
    .json(new apiResponse(200, platforms, "Platforms fetched successfully"));
});

// Get platform by ID
const getPlatformById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid platform ID"));
  }

  const platform = await Platform.findById(id);

  if (!platform) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Platform not found"));
  }

  res
    .status(200)
    .json(new apiResponse(200, platform, "Platform fetched successfully"));
});

// Update platform
const updatePlatform = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid platform ID"));
  }

  const platform = await Platform.findById(id);
  if (!platform) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Platform not found"));
  }

  if (title) platform.title = title.trim();

  await platform.save();

  res
    .status(200)
    .json(new apiResponse(200, platform, "Platform updated successfully"));
});

// Delete platform
const deletePlatform = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid platform ID"));
  }

  const platform = await Platform.findById(id);
  if (!platform) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Platform not found"));
  }

  await Platform.findByIdAndDelete(id);

  res
    .status(200)
    .json(new apiResponse(200, null, "Platform deleted successfully"));
});

export {
  addPlatform,
  bulkAddPlatforms,
  getAllPlatforms,
  getPlatformById,
  updatePlatform,
  deletePlatform,
};
