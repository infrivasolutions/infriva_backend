import express from "express";
import {
  createQuotation,
  deleteQuotation,
  getQuotationById,
  getQuotations,
  updateQuotation,
} from "../controllers/quotation.controller.js";
import { protect } from "../middleware/auth.js";
import { authorizeRoles } from "../middleware/role.js";
import { ROLES } from "../constants/roles.js";

const quotationRoutes = express.Router();

quotationRoutes.get(
  "/",
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.ADS_MANAGER, ROLES.DEVELOPER),
  getQuotations,
);

quotationRoutes.post(
  "/",
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.ADS_MANAGER),
  createQuotation,
);

quotationRoutes.get(
  "/:id",
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.ADS_MANAGER, ROLES.DEVELOPER),
  getQuotationById,
);

quotationRoutes.put(
  "/:id",
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.ADS_MANAGER),
  updateQuotation,
);

quotationRoutes.delete(
  "/:id",
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.ADS_MANAGER),
  deleteQuotation,
);

export default quotationRoutes;
