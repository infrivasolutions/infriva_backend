import Task from "../models/Task.js";
import Project from "../models/Project.js";
import { ROLES } from "../constants/roles.js";

const populateTask = (query) => {
  return query
    .populate({
      path: "project",
      select: "projectName client service status deadline",
      populate: {
        path: "client",
        select: "clientName companyName phone email",
      },
    })
    .populate("assignedTo", "name email role");
};

export const getTasks = async (req, res) => {
  try {
    const user = req.user;

    const filter = {};

    if (user.role === ROLES.DEVELOPER || user.role === "developer") {
      filter.assignedTo = user._id;
    }

    const tasks = await populateTask(Task.find(filter).sort({ createdAt: -1 }));

    return res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    console.error("Get Tasks Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const createTask = async (req, res) => {
  try {
    const {
      project,
      title,
      description,
      assignedTo,
      status,
      priority,
      dueDate,
    } = req.body;

    if (!project) {
      return res.status(400).json({
        success: false,
        message: "Project is required",
      });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Task title is required",
      });
    }

    const existingProject = await Project.findById(project);

    if (!existingProject) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const task = await Task.create({
      project,
      title: title.trim(),
      description,
      assignedTo: assignedTo || null,
      status: status || "Todo",
      priority: priority || "Medium",
      dueDate: dueDate || null,
    });

    const populatedTask = await populateTask(Task.findById(task._id));

    return res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: populatedTask,
    });
  } catch (error) {
    console.error("Create Task Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const getTaskById = async (req, res) => {
  try {
    const user = req.user;

    const filter = {
      _id: req.params.id,
    };

    if (user.role === ROLES.DEVELOPER || user.role === "developer") {
      filter.assignedTo = user._id;
    }

    const task = await populateTask(Task.findOne(filter));

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error("Get Task By ID Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const updateTask = async (req, res) => {
  try {
    const allowedFields = [
      "project",
      "title",
      "description",
      "assignedTo",
      "status",
      "priority",
      "dueDate",
    ];

    const updateData = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    if (updateData.assignedTo === "") {
      updateData.assignedTo = null;
    }

    if (updateData.dueDate === "") {
      updateData.dueDate = null;
    }

    const task = await Task.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const populatedTask = await populateTask(Task.findById(task._id));

    return res.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: populatedTask,
    });
  } catch (error) {
    console.error("Update Task Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Delete Task Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};
