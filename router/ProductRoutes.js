import { Router } from "express";
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  restoreProduct,
  permanentDeleteProduct,
} from "../controllers/ProductController.js";
import { verifyJWT } from "../middlewares/authTypeMiddleware.js";

const routes = Router();

/* ==========================
   PRODUCTS
========================== */

routes
  .route("/")
  .get(verifyJWT, getAllProducts)
  .post(verifyJWT, createProduct);

routes.route("/:id/restore").patch(verifyJWT, restoreProduct);
routes.route("/:id/permanent").delete(verifyJWT, permanentDeleteProduct);

routes
  .route("/:id")
  .get(verifyJWT, getProductById)
  .patch(verifyJWT, updateProduct)
  .delete(verifyJWT, deleteProduct);

export default routes;
