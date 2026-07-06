import express from "express";
import { protect } from "../middleware/auth.js";
import { globalSearch } from "../controllers/search.controller.js";

const searchRoutes = express.Router();

searchRoutes.get("/", protect, globalSearch);

export default searchRoutes;
