import Client from "../models/Client.js";
import Lead from "../models/Lead.js";
import User from "../models/User.js";
import { ROLES } from "../constants/roles.js";

const canManageAllLeads = (user) => {
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
    throw new Error("Lead can be assigned only to developer or ads manager");
  }

  if (user.isActive === false) {
    throw new Error("Cannot assign lead to inactive user");
  }

  return user._id;
};

const checkLeadAccess = (req, lead) => {
  if (canManageAllLeads(req.user)) return true;

  if (
    isDeveloper(req.user) &&
    String(lead.assignedTo?._id || lead.assignedTo) === String(req.user._id)
  ) {
    return true;
  }

  return false;
};

export const createLead = async (req, res) => {
  try {
    const {
      clientName,
      phone,
      email,
      company,
      service,
      budget,
      message,
      source,
      metaLeadId,
      campaignName,
      adName,
      formName,
      assignedTo,
    } = req.body;

    if (!clientName || !phone || !service) {
      return res.status(400).json({
        success: false,
        message: "Client Name, Phone and Service are required",
      });
    }

    const existingLead = await Lead.findOne({
      $or: [{ phone }, ...(email ? [{ email: email.toLowerCase() }] : [])],
    });

    if (existingLead) {
      return res.status(409).json({
        success: false,
        message: "Lead already exists.",
        data: existingLead,
      });
    }

    let finalAssignedTo = null;

    if (assignedTo) {
      if (!canManageAllLeads(req.user)) {
        return res.status(403).json({
          success: false,
          message: "Only admin and ads manager can assign leads",
        });
      }

      finalAssignedTo = await validateAssignedUser(assignedTo);
    }

    const lead = await Lead.create({
      clientName,
      phone,
      email,
      company,
      service,
      budget,
      message,
      source: source || "Website",

      metaLeadId,
      campaignName,
      adName,
      formName,

      assignedTo: finalAssignedTo,
      assignedBy: finalAssignedTo ? req.user?._id : null,
      createdBy: req.user?._id || null,
    });

    const populatedLead = await Lead.findById(lead._id)
      .populate("assignedTo", "name email role")
      .populate("assignedBy", "name email role")
      .populate("createdBy", "name email role")
      .populate("notes.addedBy", "name role");

    return res.status(201).json({
      success: true,
      message: "Lead Created Successfully",
      data: populatedLead,
    });
  } catch (error) {
    console.error("Create Lead Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const getLeads = async (req, res) => {
  try {
    const filter = {};

    if (isDeveloper(req.user)) {
      filter.assignedTo = req.user._id;
    }

    const leads = await Lead.find(filter)
      .populate("assignedTo", "name email role")
      .populate("assignedBy", "name email role")
      .populate("createdBy", "name email role")
      .populate("notes.addedBy", "name role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: leads.length,
      data: leads,
    });
  } catch (error) {
    console.error("Get Leads Error:", error);

    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate("assignedTo", "name email role")
      .populate("assignedBy", "name email role")
      .populate("createdBy", "name email role")
      .populate("notes.addedBy", "name role");

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    if (!checkLeadAccess(req, lead)) {
      return res.status(403).json({
        success: false,
        message: "You can access only assigned leads",
      });
    }

    res.status(200).json({
      success: true,
      data: lead,
    });
  } catch (error) {
    console.error("Get Lead Error:", error);

    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const addLeadNote = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Note text is required",
      });
    }

    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    if (!checkLeadAccess(req, lead)) {
      return res.status(403).json({
        success: false,
        message: "You can add note only on assigned leads",
      });
    }

    lead.notes.push({
      text,
      addedBy: req.user?._id,
    });

    await lead.save();

    const updatedLead = await Lead.findById(req.params.id)
      .populate("assignedTo", "name email role")
      .populate("assignedBy", "name email role")
      .populate("createdBy", "name email role")
      .populate("notes.addedBy", "name role");

    return res.status(200).json({
      success: true,
      message: "Note added successfully",
      data: updatedLead,
    });
  } catch (error) {
    console.error("Add Lead Note Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const updateLead = async (req, res) => {
  try {
    const allowedFields = ["status", "priority", "followUpDate", "assignedTo"];

    const existingLead = await Lead.findById(req.params.id);

    if (!existingLead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    if (!canManageAllLeads(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Only admin and ads manager can update or assign leads",
      });
    }

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

    const lead = await Lead.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("assignedTo", "name email role")
      .populate("assignedBy", "name email role")
      .populate("createdBy", "name email role")
      .populate("notes.addedBy", "name role");

    return res.status(200).json({
      success: true,
      message: "Lead updated successfully",
      data: lead,
    });
  } catch (error) {
    console.error("Update Lead Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const convertLeadToClient = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    if (!canManageAllLeads(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Only admin and ads manager can convert leads",
      });
    }

    if (lead.status === "Lost") {
      return res.status(400).json({
        success: false,
        message: "Lost lead cannot be converted to client",
      });
    }

    const duplicateConditions = [{ lead: lead._id }];

    if (lead.phone) {
      duplicateConditions.push({ phone: lead.phone });
    }

    if (lead.email) {
      duplicateConditions.push({ email: lead.email });
    }

    const existingClient = await Client.findOne({
      $or: duplicateConditions,
    });

    if (existingClient) {
      return res.status(400).json({
        success: false,
        message: "Lead already converted to client",
        data: existingClient,
      });
    }

    const client = await Client.create({
      lead: lead._id,
      companyName: lead.company,
      clientName: lead.clientName,
      email: lead.email,
      phone: lead.phone,
      assignedTo: lead.assignedTo,
    });

    lead.status = "Won";

    lead.notes.push({
      text: "Lead converted to client.",
      addedBy: req.user?._id,
    });

    await lead.save();

    res.status(201).json({
      success: true,
      message: "Lead converted to client successfully",
      data: client,
    });
  } catch (error) {
    console.error("Convert Lead Error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};
