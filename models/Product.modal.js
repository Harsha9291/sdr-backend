import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    productCode: {
      type: String,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductCategory",
      required: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    unit: {
      type: String,
      trim: true,
      default: "pcs", // pcs, kg, ltr, etc.
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    minStockLevel: {
      type: Number,
      default: 0,
      min: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false, // soft delete flag
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Auto-generate productCode before save
ProductSchema.pre("save", function (next) {
  if (!this.productCode) {
    const random = Math.floor(10000 + Math.random() * 90000);
    this.productCode = `PRD-${random}`;
  }
  next();
});

// Compound index: name + category must be unique (case-insensitive handled in controller)
// isDeleted:1 ensures deleted products don't block re-creation with same name
ProductSchema.index({ name: 1, category: 1, isDeleted: 1 });

const Product = mongoose.model("Product", ProductSchema);
export default Product;
