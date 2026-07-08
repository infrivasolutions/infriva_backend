import express from "express";
import {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  addLeadNote,
  convertLeadToClient,
} from "../controllers/lead.controller.js";
import { protect } from "../middleware/auth.js";
import { authorizeRoles } from "../middleware/role.js";
import { ROLES } from "../constants/roles.js";

const leadRoutes = express.Router();

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

leadRoutes.post(
  "/:id/notes",
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.ADS_MANAGER, ROLES.DEVELOPER),
  addLeadNote,
);

export default leadRoutes;
