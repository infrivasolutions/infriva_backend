import express from "express";
import {
  createUser,
  deleteUser,
  getUserById,
  getUsers,
  updateUser,
} from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.js";
import { authorizeRoles } from "../middleware/role.js";
import { ROLES } from "../constants/roles.js";

const userRoutes = express.Router();

userRoutes.get(
  "/",
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.ADS_MANAGER),
  getUsers,
);

userRoutes.post("/", protect, authorizeRoles(ROLES.ADMIN), createUser);

userRoutes.get(
  "/:id",
  protect,
  authorizeRoles(ROLES.ADMIN, ROLES.ADS_MANAGER),
  getUserById,
);

userRoutes.put("/:id", protect, authorizeRoles(ROLES.ADMIN), updateUser);

userRoutes.delete("/:id", protect, authorizeRoles(ROLES.ADMIN), deleteUser);

export default userRoutes;
