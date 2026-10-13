import Product from "../models/Product.modal.js";
import ProductCategory from "../models/ProductCategory.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";

/* ──────────────────────────────────────────────
   GET ALL PRODUCTS (excludes soft-deleted by default)
   GET /api/product?search=&category=&showDeleted=true
────────────────────────────────────────────── */
const getAllProducts = asyncHandler(async (req, res) => {
  const { search, category, showDeleted } = req.query;

  const filter = {};

  if (showDeleted === "true") {
    // show all including deleted – admin view
  } else {
    filter.isDeleted = false;
  }

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { productCode: { $regex: search, $options: "i" } },
    ];
  }

  if (category) {
    filter.category = category;
  }

  const products = await Product.find(filter)
    .populate("category", "name")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new apiResponse(200, products, "Products fetched successfully"));
});

/* ──────────────────────────────────────────────
   GET SINGLE PRODUCT
   GET /api/product/:id
────────────────────────────────────────────── */
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate("category", "name");
  if (!product) {
    return res.status(404).json(new apiResponse(404, null, "Product not found"));
  }
  return res
    .status(200)
    .json(new apiResponse(200, product, "Product fetched successfully"));
});

/* ──────────────────────────────────────────────
   CREATE PRODUCT
   POST /api/product
────────────────────────────────────────────── */
const createProduct = asyncHandler(async (req, res) => {
  const { name, category, description, unit, price, minStockLevel } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json(new apiResponse(400, null, "Product name is required"));
  }
  if (!category) {
    return res.status(400).json(new apiResponse(400, null, "Category is required"));
  }

  // Validate category exists
  const cat = await ProductCategory.findById(category);
  if (!cat) {
    return res.status(400).json(new apiResponse(400, null, "Invalid category"));
  }

  // Duplicate check: same name + same category (case-insensitive), ignore deleted
  const duplicate = await Product.findOne({
    name: { $regex: `^${name.trim()}$`, $options: "i" },
    category,
    isDeleted: false,
  });
  if (duplicate) {
    return res
      .status(400)
      .json(
        new apiResponse(
          400,
          null,
          `Product "${name.trim()}" already exists in this category`
        )
      );
  }

  const product = await Product.create({
    name: name.trim(),
    category,
    description: description?.trim() || "",
    unit: unit?.trim() || "pcs",
    price: price || 0,
    minStockLevel: minStockLevel || 0,
    currentStock: 0,
  });

  const populated = await product.populate("category", "name");

  return res
    .status(201)
    .json(new apiResponse(201, populated, "Product created successfully"));
});

/* ──────────────────────────────────────────────
   UPDATE PRODUCT
   PATCH /api/product/:id
────────────────────────────────────────────── */
const updateProduct = asyncHandler(async (req, res) => {
  const { name, category, description, unit, price, minStockLevel, isActive } = req.body;

  const product = await Product.findById(req.params.id);
  if (!product || product.isDeleted) {
    return res.status(404).json(new apiResponse(404, null, "Product not found"));
  }

  if (category) {
    const cat = await ProductCategory.findById(category);
    if (!cat) {
      return res.status(400).json(new apiResponse(400, null, "Invalid category"));
    }
    product.category = category;
  }

  // Duplicate check on update: exclude current product
  const effectiveName = name !== undefined ? name.trim() : product.name;
  const effectiveCategory = category || product.category.toString();

  const duplicate = await Product.findOne({
    _id: { $ne: product._id },
    name: { $regex: `^${effectiveName}$`, $options: "i" },
    category: effectiveCategory,
    isDeleted: false,
  });
  if (duplicate) {
    return res
      .status(400)
      .json(
        new apiResponse(
          400,
          null,
          `Product "${effectiveName}" already exists in this category`
        )
      );
  }

  if (name !== undefined) product.name = name.trim();
  if (description !== undefined) product.description = description.trim();
  if (unit !== undefined) product.unit = unit.trim();
  if (price !== undefined) product.price = price;
  if (minStockLevel !== undefined) product.minStockLevel = minStockLevel;
  if (isActive !== undefined) product.isActive = isActive;

  await product.save();
  const populated = await product.populate("category", "name");

  return res
    .status(200)
    .json(new apiResponse(200, populated, "Product updated successfully"));
});

/* ──────────────────────────────────────────────
   SOFT DELETE PRODUCT
   DELETE /api/product/:id
────────────────────────────────────────────── */
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product || product.isDeleted) {
    return res.status(404).json(new apiResponse(404, null, "Product not found"));
  }

  product.isDeleted = true;
  await product.save();

  return res
    .status(200)
    .json(new apiResponse(200, null, "Product deleted successfully"));
});

/* ──────────────────────────────────────────────
   RESTORE SOFT-DELETED PRODUCT
   PATCH /api/product/:id/restore
────────────────────────────────────────────── */
const restoreProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json(new apiResponse(404, null, "Product not found"));
  }

  product.isDeleted = false;
  await product.save();

  return res
    .status(200)
    .json(new apiResponse(200, product, "Product restored successfully"));
});

/* ──────────────────────────────────────────────
   PERMANENT DELETE PRODUCT (only allowed if already soft-deleted)
   DELETE /api/product/:id/permanent
────────────────────────────────────────────── */
const permanentDeleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json(new apiResponse(404, null, "Product not found"));
  }

  if (!product.isDeleted) {
    return res
      .status(400)
      .json(
        new apiResponse(
          400,
          null,
          "Only soft-deleted products can be permanently deleted"
        )
      );
  }

  await Product.findByIdAndDelete(req.params.id);

  return res
    .status(200)
    .json(new apiResponse(200, null, "Product permanently deleted"));
});

export {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  restoreProduct,
  permanentDeleteProduct,
};
