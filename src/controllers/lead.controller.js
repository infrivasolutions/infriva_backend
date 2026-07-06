import Client from "../models/Client.js";
import Lead from "../models/Lead.js";

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

    const lead = await Lead.create({
      clientName,
      phone,
      email,
      company,
      service,
      budget,
      message,
      source: source || "Website",

      // Meta Ads optional fields
      metaLeadId,
      campaignName,
      adName,
      formName,
    });

    return res.status(201).json({
      success: true,
      message: "Lead Created Successfully",
      data: lead,
    });
  } catch (error) {
    console.error("Create Lead Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getLeads = async (req, res) => {
  try {
    const leads = await Lead.find()
      .populate("assignedTo", "name email role")
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
      .populate("notes.addedBy", "name role");

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
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

    lead.notes.push({
      text,
      addedBy: req.user?._id,
    });

    await lead.save();

    const updatedLead = await Lead.findById(req.params.id)
      .populate("assignedTo", "name email role")
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

    const updateData = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const lead = await Lead.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("assignedTo", "name email role")
      .populate("notes.addedBy", "name role");

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lead updated successfully",
      data: lead,
    });
  } catch (error) {
    console.error("Update Lead Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
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
