import ProductCategory from "../models/ProductCategory.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";

/* ──────────────────────────────────────────────
   GET ALL CATEGORIES
   GET /api/product-category?search=
────────────────────────────────────────────── */
const getAllCategories = asyncHandler(async (req, res) => {
  const { search } = req.query;

  const filter = {};
  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }

  const categories = await ProductCategory.find(filter).sort({ createdAt: -1 });
  return res
    .status(200)
    .json(new apiResponse(200, categories, "Categories fetched successfully"));
});

/* ──────────────────────────────────────────────
   GET SINGLE CATEGORY
   GET /api/product-category/:id
────────────────────────────────────────────── */
const getCategoryById = asyncHandler(async (req, res) => {
  const category = await ProductCategory.findById(req.params.id);
  if (!category) {
    return res.status(404).json(new apiResponse(404, null, "Category not found"));
  }
  return res
    .status(200)
    .json(new apiResponse(200, category, "Category fetched successfully"));
});

/* ──────────────────────────────────────────────
   CREATE CATEGORY
   POST /api/product-category
────────────────────────────────────────────── */
const createCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json(new apiResponse(400, null, "Category name is required"));
  }

  const exists = await ProductCategory.findOne({ name: name.trim() });
  if (exists) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Category with this name already exists"));
  }

  const category = await ProductCategory.create({
    name: name.trim(),
    description: description?.trim() || "",
  });

  return res
    .status(201)
    .json(new apiResponse(201, category, "Category created successfully"));
});

/* ──────────────────────────────────────────────
   UPDATE CATEGORY
   PATCH /api/product-category/:id
────────────────────────────────────────────── */
const updateCategory = asyncHandler(async (req, res) => {
  const { name, description, isActive } = req.body;

  const category = await ProductCategory.findById(req.params.id);
  if (!category) {
    return res.status(404).json(new apiResponse(404, null, "Category not found"));
  }

  // Check duplicate name (exclude current)
  if (name && name.trim() !== category.name) {
    const duplicate = await ProductCategory.findOne({ name: name.trim() });
    if (duplicate) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Category with this name already exists"));
    }
  }

  if (name !== undefined) category.name = name.trim();
  if (description !== undefined) category.description = description.trim();
  if (isActive !== undefined) category.isActive = isActive;

  await category.save();

  return res
    .status(200)
    .json(new apiResponse(200, category, "Category updated successfully"));
});

/* ──────────────────────────────────────────────
   DELETE CATEGORY
   DELETE /api/product-category/:id
────────────────────────────────────────────── */
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await ProductCategory.findById(req.params.id);
  if (!category) {
    return res.status(404).json(new apiResponse(404, null, "Category not found"));
  }

  await ProductCategory.findByIdAndDelete(req.params.id);

  return res
    .status(200)
    .json(new apiResponse(200, null, "Category deleted successfully"));
});

export {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
