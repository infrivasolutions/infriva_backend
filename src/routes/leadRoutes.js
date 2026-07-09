import express from "express";
import multer from "multer";
import {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  addLeadNote,
  convertLeadToClient,
  importLeadsFromExcel,
  deleteLead,
  exportLeadsSheet,
} from "../controllers/lead.controller.js";
import { protect } from "../middleware/auth.js";
import { authorizeRoles } from "../middleware/role.js";
import { ROLES } from "../constants/roles.js";

const leadRoutes = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

leadRoutes.post(
  "/",
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.ADS_MANAGER),
  createLead,
);

leadRoutes.get(
  "/",
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.ADS_MANAGER, ROLES.DEVELOPER),
  getLeads,
);

leadRoutes.post(
  "/import-excel",
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.ADS_MANAGER),
  upload.single("file"),
  importLeadsFromExcel,
);

leadRoutes.get("/export", protect, exportLeadsSheet);

leadRoutes.get(
  "/:id",
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.ADS_MANAGER, ROLES.DEVELOPER),
  getLeadById,
);

leadRoutes.post(
  "/:id/convert",
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.ADS_MANAGER),
  convertLeadToClient,
);

leadRoutes.put(
  "/:id",
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.ADS_MANAGER),
  updateLead,
);

leadRoutes.delete(
  "/:id",
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.ADS_MANAGER),
  deleteLead,
);

leadRoutes.post(
  "/:id/notes",
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.ADS_MANAGER, ROLES.DEVELOPER),
  addLeadNote,
);

export default leadRoutes;
