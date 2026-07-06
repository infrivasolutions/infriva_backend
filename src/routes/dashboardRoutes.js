import express from "express";
import { protect } from "../middleware/auth.js";
import { authorizeRoles } from "../middleware/role.js";
import { ROLES } from "../constants/roles.js";
import {
  getDashboard,
  getDashboardAnalytics,
  getTeamMemberWorkload,
  getTeamWorkload,
} from "../controllers/dashboard.controller.js";

const dashboardRouter = express.Router();

dashboardRouter.get("/", protect, getDashboard);

dashboardRouter.get(
  "/analytics",
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.ADS_MANAGER),
  getDashboardAnalytics,
);

dashboardRouter.get(
  "/team-workload",
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.ADS_MANAGER),
  getTeamWorkload,
);
dashboardRouter.get(
  "/team-workload/:userId",
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.ADS_MANAGER),
  getTeamMemberWorkload,
);

export default dashboardRouter;
