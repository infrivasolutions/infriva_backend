import express from "express";
import {
  receiveMetaLead,
  verifyMetaWebhook,
} from "../controllers/meta.controller.js";

const metaRoutes = express.Router();

metaRoutes.get("/webhook", verifyMetaWebhook);
metaRoutes.post("/webhook", receiveMetaLead);

export default metaRoutes;
