import Product from "../models/Product.modal.js";
import StockTransaction from "../models/StockTransaction.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import mongoose from "mongoose";

/* ──────────────────────────────────────────────
   STOCK IN
   POST /api/stock/in
────────────────────────────────────────────── */
const stockIn = asyncHandler(async (req, res) => {
  const { productId, quantity, remark, transactionDate } = req.body;

  if (!productId) {
    return res.status(400).json(new apiResponse(400, null, "Product is required"));
  }
  if (!quantity || quantity <= 0) {
    return res.status(400).json(new apiResponse(400, null, "Quantity must be greater than 0"));
  }

  const product = await Product.findById(productId);
  if (!product || product.isDeleted) {
    return res.status(404).json(new apiResponse(404, null, "Product not found"));
  }

  const stockBefore = product.currentStock;
  const stockAfter = stockBefore + Number(quantity);

  // Update product stock
  product.currentStock = stockAfter;
  await product.save();

  // Create transaction record
  const transaction = await StockTransaction.create({
    product: productId,
    type: "IN",
    quantity: Number(quantity),
    stockBefore,
    stockAfter,
    remark: remark?.trim() || "",
    transactionDate: transactionDate || new Date(),
    createdBy: req.user?._id,
  });

  await transaction.populate("product", "name productCode unit");

  return res
    .status(201)
    .json(new apiResponse(201, { transaction, currentStock: stockAfter }, "Stock added successfully"));
});

/* ──────────────────────────────────────────────
   STOCK OUT
   POST /api/stock/out
────────────────────────────────────────────── */
const stockOut = asyncHandler(async (req, res) => {
  const { productId, quantity, remark, transactionDate } = req.body;

  if (!productId) {
    return res.status(400).json(new apiResponse(400, null, "Product is required"));
  }
  if (!quantity || quantity <= 0) {
    return res.status(400).json(new apiResponse(400, null, "Quantity must be greater than 0"));
  }

  const product = await Product.findById(productId);
  if (!product || product.isDeleted) {
    return res.status(404).json(new apiResponse(404, null, "Product not found"));
  }

  if (product.currentStock < Number(quantity)) {
    return res
      .status(400)
      .json(
        new apiResponse(
          400,
          null,
          `Insufficient stock. Available: ${product.currentStock}, Requested: ${quantity}`
        )
      );
  }

  const stockBefore = product.currentStock;
  const stockAfter = stockBefore - Number(quantity);

  // Update product stock
  product.currentStock = stockAfter;
  await product.save();

  // Create transaction record
  const transaction = await StockTransaction.create({
    product: productId,
    type: "OUT",
    quantity: Number(quantity),
    stockBefore,
    stockAfter,
    remark: remark?.trim() || "",
    transactionDate: transactionDate || new Date(),
    createdBy: req.user?._id,
  });

  await transaction.populate("product", "name productCode unit");

  return res
    .status(201)
    .json(new apiResponse(201, { transaction, currentStock: stockAfter }, "Stock removed successfully"));
});

/* ──────────────────────────────────────────────
   GET STOCK TRANSACTIONS (with filters)
   GET /api/stock/transactions?productId=&type=IN|OUT&startDate=&endDate=&page=&limit=
────────────────────────────────────────────── */
const getTransactions = asyncHandler(async (req, res) => {
  const { productId, type, startDate, endDate, page = 1, limit = 20 } = req.query;

  const filter = {};

  if (productId) filter.product = productId;
  if (type && ["IN", "OUT"].includes(type)) filter.type = type;

  if (startDate || endDate) {
    filter.transactionDate = {};
    if (startDate) filter.transactionDate.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.transactionDate.$lte = end;
    }
  }

  const skip = (Number(page) - 1) * Number(limit);
  const total = await StockTransaction.countDocuments(filter);

  const transactions = await StockTransaction.find(filter)
    .populate("product", "name productCode unit")
    .populate("createdBy", "name email")
    .sort({ transactionDate: -1, createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  return res.status(200).json(
    new apiResponse(
      200,
      {
        transactions,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
      "Transactions fetched successfully"
    )
  );
});

/* ──────────────────────────────────────────────
   STOCK REPORT – summary per product
   GET /api/stock/report?startDate=&endDate=&category=
────────────────────────────────────────────── */
const getStockReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, category } = req.query;

  // Build date match for transactions
  const txMatch = {};
  if (startDate || endDate) {
    txMatch.transactionDate = {};
    if (startDate) txMatch.transactionDate.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      txMatch.transactionDate.$lte = end;
    }
  }

  // Product filter
  const productFilter = { isDeleted: false };
  if (category) productFilter.category = new mongoose.Types.ObjectId(category);

  const products = await Product.find(productFilter)
    .populate("category", "name")
    .sort({ name: 1 });

  // For each product aggregate IN/OUT totals in date range
  const productIds = products.map((p) => p._id);

  const aggregation = await StockTransaction.aggregate([
    {
      $match: {
        product: { $in: productIds },
        ...txMatch,
      },
    },
    {
      $group: {
        _id: { product: "$product", type: "$type" },
        totalQty: { $sum: "$quantity" },
      },
    },
  ]);

  // Map aggregation results to a lookup object
  const txMap = {};
  aggregation.forEach((item) => {
    const pid = item._id.product.toString();
    if (!txMap[pid]) txMap[pid] = { IN: 0, OUT: 0 };
    txMap[pid][item._id.type] = item.totalQty;
  });

  // Build report rows
  const report = products.map((p) => {
    const pid = p._id.toString();
    const totalIn = txMap[pid]?.IN || 0;
    const totalOut = txMap[pid]?.OUT || 0;
    return {
      _id: p._id,
      productCode: p.productCode,
      name: p.name,
      category: p.category,
      unit: p.unit,
      price: p.price,
      currentStock: p.currentStock,
      minStockLevel: p.minStockLevel,
      totalIn,
      totalOut,
      lowStock: p.currentStock <= p.minStockLevel,
    };
  });

  // Overall summary
  const summary = {
    totalProducts: products.length,
    lowStockProducts: report.filter((r) => r.lowStock).length,
    totalStockIn: report.reduce((s, r) => s + r.totalIn, 0),
    totalStockOut: report.reduce((s, r) => s + r.totalOut, 0),
  };

  return res
    .status(200)
    .json(new apiResponse(200, { report, summary }, "Stock report fetched successfully"));
});

/* ──────────────────────────────────────────────
   GET CURRENT STOCK LEVELS (quick view)
   GET /api/stock/current
────────────────────────────────────────────── */
const getCurrentStock = asyncHandler(async (req, res) => {
  const { category, lowStock } = req.query;

  const filter = { isDeleted: false };
  if (category) filter.category = category;

  const products = await Product.find(filter)
    .populate("category", "name")
    .sort({ name: 1 });

  let result = products;
  if (lowStock === "true") {
    result = products.filter((p) => p.currentStock <= p.minStockLevel);
  }

  return res
    .status(200)
    .json(new apiResponse(200, result, "Stock levels fetched successfully"));
});

export { stockIn, stockOut, getTransactions, getStockReport, getCurrentStock };
