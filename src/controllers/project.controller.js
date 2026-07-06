import Project from "../models/Project.js";
import Client from "../models/Client.js";
import { ROLES } from "../constants/roles.js";

const parseBudget = (value) => {
  if (value === undefined || value === null || value === "") return 0;

  if (typeof value === "number") return value;

  const cleaned = String(value).replace(/[^\d.]/g, "");
  return Number(cleaned) || 0;
};

const populateProject = (query) => {
  return query
    .populate("client", "clientName companyName phone email")
    .populate("assignedTo", "name email role")
    .populate("activity.createdBy", "name email role");
};

export const getProjects = async (req, res) => {
  try {
    const user = req.user;

    const filter = {};

    if (user.role === ROLES.DEVELOPER || user.role === "developer") {
      filter.assignedTo = user._id;
    }

    const projects = await populateProject(
      Project.find(filter).sort({ createdAt: -1 }),
    );

    return res.status(200).json({
      success: true,
      count: projects.length,
      data: projects,
    });
  } catch (error) {
    console.error("Get Projects Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const createProject = async (req, res) => {
  try {
    const {
      client,
      projectName,
      service,
      budget,
      startDate,
      deadline,
      status,
      assignedTo,
      notes,
      description,
    } = req.body;

    if (!client) {
      return res.status(400).json({
        success: false,
        message: "Client is required",
      });
    }

    if (!projectName || !projectName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Project name is required",
      });
    }

    const existingClient = await Client.findById(client);

    if (!existingClient) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    const project = await Project.create({
      client,
      projectName: projectName.trim(),
      service,
      budget: parseBudget(budget),
      startDate: startDate || undefined,
      deadline: deadline || undefined,
      status: status || "Not Started",
      assignedTo: assignedTo || null,
      notes: notes || description || "",
      activity: [
        {
          action: "PROJECT_CREATED",
          message: "Project created.",
          createdBy: req.user?._id,
        },
      ],
    });

    const populatedProject = await populateProject(
      Project.findById(project._id),
    );

    return res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: populatedProject,
    });
  } catch (error) {
    console.error("Create Project Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const getProjectById = async (req, res) => {
  try {
    const user = req.user;

    const filter = {
      _id: req.params.id,
    };

    if (user.role === ROLES.DEVELOPER || user.role === "developer") {
      filter.assignedTo = user._id;
    }

    const project = await populateProject(Project.findOne(filter));

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error("Get Project By ID Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const oldStatus = project.status;

    const allowedFields = [
      "client",
      "projectName",
      "service",
      "budget",
      "startDate",
      "deadline",
      "status",
      "assignedTo",
      "notes",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === "budget") {
          project[field] = parseBudget(req.body[field]);
        } else if (field === "assignedTo" && req.body[field] === "") {
          project[field] = null;
        } else if (
          ["startDate", "deadline"].includes(field) &&
          req.body[field] === ""
        ) {
          project[field] = undefined;
        } else {
          project[field] = req.body[field];
        }
      }
    });

    if (req.body.description !== undefined && req.body.notes === undefined) {
      project.notes = req.body.description;
    }

    if (req.body.status && req.body.status !== oldStatus) {
      project.activity.push({
        action: "STATUS_UPDATED",
        message: `Status changed from ${oldStatus} to ${req.body.status}.`,
        createdBy: req.user?._id,
      });
    } else {
      project.activity.push({
        action: "PROJECT_UPDATED",
        message: "Project details updated.",
        createdBy: req.user?._id,
      });
    }

    await project.save();

    const updatedProject = await populateProject(Project.findById(project._id));

    return res.status(200).json({
      success: true,
      message: "Project updated successfully",
      data: updatedProject,
    });
  } catch (error) {
    console.error("Update Project Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error("Delete Project Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};
