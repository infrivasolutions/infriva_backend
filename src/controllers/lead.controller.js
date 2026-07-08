import XLSX from "xlsx";
import mongoose from "mongoose";
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

const pickExcelValue = (row, keys) => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return String(row[key]).trim();
    }
  }

  return "";
};

const cleanPhoneNumber = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
};

const resolveAssignedUserFromExcel = async (assignedValue) => {
  if (!assignedValue) return null;

  const value = String(assignedValue).trim();

  let user = null;

  if (value.includes("@")) {
    user = await User.findOne({ email: value.toLowerCase() });
  } else if (mongoose.isValidObjectId(value)) {
    user = await User.findById(value);
  }

  if (!user) {
    throw new Error(`Assigned user not found: ${value}`);
  }

  return validateAssignedUser(user._id);
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

export const importLeadsFromExcel = async (req, res) => {
  try {
    if (!canManageAllLeads(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Only admin and ads manager can import leads",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an Excel file",
      });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(worksheet, {
      defval: "",
    });

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: "Excel sheet is empty",
      });
    }

    let created = 0;
    let duplicates = 0;
    let invalid = 0;
    let failed = 0;

    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];

        const clientName = pickExcelValue(row, [
          "Client Name",
          "clientName",
          "Name",
          "name",
          "Full Name",
          "fullName",
        ]);

        const phone = cleanPhoneNumber(
          pickExcelValue(row, [
            "Phone",
            "phone",
            "Mobile",
            "mobile",
            "Contact",
            "contact",
            "Phone Number",
            "phoneNumber",
          ]),
        );

        const email = pickExcelValue(row, [
          "Email",
          "email",
          "Email Address",
          "emailAddress",
        ]).toLowerCase();

        const company = pickExcelValue(row, [
          "Company",
          "company",
          "Company Name",
          "companyName",
          "Business Name",
          "businessName",
        ]);

        const service = pickExcelValue(row, [
          "Service",
          "service",
          "Service Interested",
          "serviceInterested",
          "Requirement",
          "requirement",
        ]);

        const budget = pickExcelValue(row, ["Budget", "budget"]);

        const message = pickExcelValue(row, [
          "Message",
          "message",
          "Note",
          "note",
          "Notes",
          "notes",
          "Remark",
          "remark",
          "Remarks",
          "remarks",
        ]);

        const source =
          pickExcelValue(row, [
            "Source",
            "source",
            "Lead Source",
            "leadSource",
          ]) || "Website";

        const campaignName = pickExcelValue(row, [
          "Campaign Name",
          "campaignName",
          "Campaign",
          "campaign",
        ]);

        const adName = pickExcelValue(row, ["Ad Name", "adName", "Ad", "ad"]);

        const formName = pickExcelValue(row, [
          "Form Name",
          "formName",
          "Form",
          "form",
        ]);

        const assignedValue =
          pickExcelValue(row, [
            "Assigned To",
            "assignedTo",
            "Assigned Email",
            "assignedEmail",
            "Assigned User",
            "assignedUser",
          ]) || req.body.assignedTo;

        if (!clientName || !phone || !service) {
          invalid++;

          errors.push({
            row: i + 2,
            reason: "Client Name, Phone and Service are required",
          });

          continue;
        }

        if (phone.length !== 10) {
          invalid++;

          errors.push({
            row: i + 2,
            reason: "Invalid phone number",
            phone,
          });

          continue;
        }

        const duplicateQuery = [{ phone }];

        if (email) {
          duplicateQuery.push({ email });
        }

        const existingLead = await Lead.findOne({
          $or: duplicateQuery,
        });

        if (existingLead) {
          duplicates++;
          continue;
        }

        let finalAssignedTo = null;

        if (assignedValue) {
          finalAssignedTo = await resolveAssignedUserFromExcel(assignedValue);
        }

        await Lead.create({
          clientName,
          phone,
          email,
          company,
          service,
          budget,
          message,
          source,

          campaignName,
          adName,
          formName,

          assignedTo: finalAssignedTo,
          assignedBy: finalAssignedTo ? req.user?._id : null,
          createdBy: req.user?._id || null,

          notes: [
            {
              text: message
                ? `Imported from Excel. ${message}`
                : "Imported from Excel.",
              addedBy: req.user?._id,
            },
          ],
        });

        created++;
      } catch (rowError) {
        failed++;

        errors.push({
          row: i + 2,
          reason: rowError.message || "Failed to import this row",
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: "Excel import completed",
      totalRows: rows.length,
      created,
      duplicates,
      invalid,
      failed,
      errors,
    });
  } catch (error) {
    console.error("Import Leads Excel Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to import leads from Excel",
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

export const deleteLead = async (req, res) => {
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
        message: "Only admin and ads manager can delete leads",
      });
    }

    const existingClient = await Client.findOne({
      $or: [
        { lead: lead._id },
        ...(lead.phone ? [{ phone: lead.phone }] : []),
        ...(lead.email ? [{ email: lead.email }] : []),
      ],
    });

    if (existingClient) {
      return res.status(400).json({
        success: false,
        message:
          "This lead is already converted to client. Delete client first or keep this lead for record.",
      });
    }

    await Lead.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Lead deleted successfully",
      data: {
        deletedLeadId: req.params.id,
      },
    });
  } catch (error) {
    console.error("Delete Lead Error:", error);

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
