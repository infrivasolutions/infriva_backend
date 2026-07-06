import express from "express";
import {
  getMyProfile,
  loginUser,
  registerUser,
  updateMyProfile,
} from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.js";

const authRoutes = express.Router();

authRoutes.post("/register", registerUser);
authRoutes.post("/login", loginUser);

authRoutes.get("/me", protect, getMyProfile);
authRoutes.put("/me", protect, updateMyProfile);

export default authRoutes;
