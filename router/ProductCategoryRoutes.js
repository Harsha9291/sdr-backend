import { Router } from "express";
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/ProductCategoryController.js";
import { verifyJWT } from "../middlewares/authTypeMiddleware.js";

const routes = Router();

/* ==========================
   PRODUCT CATEGORIES
========================== */

routes
  .route("/")
  .get(verifyJWT, getAllCategories)
  .post(verifyJWT, createCategory);

routes
  .route("/:id")
  .get(verifyJWT, getCategoryById)
  .patch(verifyJWT, updateCategory)
  .delete(verifyJWT, deleteCategory);

export default routes;
