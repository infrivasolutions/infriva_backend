import express from "express";
import {
  getClientById,
  getClients,
  updateClient,
} from "../controllers/client.controller.js";
import { protect } from "../middleware/auth.js";
import { authorizeRoles } from "../middleware/role.js";
import { ROLES } from "../constants/roles.js";

const clientRoutes = express.Router();

clientRoutes.get(
  "/",
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.ADS_MANAGER, ROLES.DEVELOPER),
  getClients,
);

clientRoutes.get(
  "/:id",
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.ADS_MANAGER, ROLES.DEVELOPER),
  getClientById,
);

clientRoutes.put(
  "/:id",
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.ADS_MANAGER),
  updateClient,
);

export default clientRoutes;
