import Client from "../models/Client.js";
import User from "../models/User.js";
import { ROLES } from "../constants/roles.js";

const canManageAllClients = (user) => {
  return [ROLES.ADMIN, ROLES.ADS_MANAGER].includes(user?.role);
};

const isDeveloper = (user) => {
  return user?.role === ROLES.DEVELOPER;
};

const validateAssignedUser = async (assignedTo) => {
  if (!assignedTo) return null;

  const user = await User.findById(assignedTo);

  if (!user) {
    throw new Error("Assigned user not found");
  }

  const allowedRoles = [ROLES.DEVELOPER, ROLES.ADS_MANAGER];

  if (!allowedRoles.includes(user.role)) {
    throw new Error("Client can be assigned only to developer or ads manager");
  }

  if (user.isActive === false) {
    throw new Error("Cannot assign client to inactive user");
  }

  return user._id;
};

const checkClientAccess = (req, client) => {
  if (canManageAllClients(req.user)) return true;

  if (
    isDeveloper(req.user) &&
    String(client.assignedTo?._id || client.assignedTo) === String(req.user._id)
  ) {
    return true;
  }

  return false;
};

export const getClients = async (req, res) => {
  try {
    const filter = {};

    if (isDeveloper(req.user)) {
      filter.assignedTo = req.user._id;
    }

    const clients = await Client.find(filter)
      .populate(
        "lead",
        "clientName phone email service source budget status createdAt",
      )
      .populate("assignedTo", "name email role")
      .populate("assignedBy", "name email role")
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: clients.length,
      data: clients,
    });
  } catch (error) {
    console.error("Get Clients Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const getClientById = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id)
      .populate(
        "lead",
        "clientName phone email company service budget message source status priority createdAt",
      )
      .populate("assignedTo", "name email role")
      .populate("assignedBy", "name email role")
      .populate("createdBy", "name email role");

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    if (!checkClientAccess(req, client)) {
      return res.status(403).json({
        success: false,
        message: "You can access only assigned clients",
      });
    }

    return res.status(200).json({
      success: true,
      data: client,
    });
  } catch (error) {
    console.error("Get Client By ID Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const updateClient = async (req, res) => {
  try {
    if (!canManageAllClients(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Only admin and ads manager can update clients",
      });
    }

    const allowedFields = [
      "clientName",
      "companyName",
      "email",
      "phone",
      "status",
      "assignedTo",
    ];

    const updateData = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (req.body.assignedTo !== undefined) {
      updateData.assignedTo = await validateAssignedUser(req.body.assignedTo);
      updateData.assignedBy = req.user._id;
    }

    const client = await Client.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate(
        "lead",
        "clientName phone email company service budget message source status priority createdAt",
      )
      .populate("assignedTo", "name email role")
      .populate("assignedBy", "name email role")
      .populate("createdBy", "name email role");

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Client updated successfully",
      data: client,
    });
  } catch (error) {
    console.error("Update Client Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};
