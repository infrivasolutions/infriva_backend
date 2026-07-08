import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import leadRoutes from "./routes/leadRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import clientRoutes from "./routes/clientRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import quotationRoutes from "./routes/quotationRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import metaRoutes from "./routes/metaRoutes.js";

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",

  "https://infriva-website.vercel.app",
  "https://infriva-crm.vercel.app",

  "https://www.infrivasolutions.com",
  "https://infrivasolutions.com",
  "https://crm.infrivasolutions.com",

  process.env.WEBSITE_URL,
  process.env.CRM_URL,
].filter(Boolean);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

// console.log("WEBSITE_URL =", process.env.WEBSITE_URL);
// console.log("CRM_URL =", process.env.CRM_URL);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(helmet());
app.use(morgan("dev"));

app.use("/api/v1/leads", leadRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/clients", clientRoutes);
app.use("/api/v1/projects", projectRoutes);
app.use("/api/v1/tasks", taskRoutes);
app.use("/api/v1/quotations", quotationRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/search", searchRoutes);
app.use("/api/v1/meta", metaRoutes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Infriva API Running",
  });
});

export default app;
