import Client from "../models/Client.js";
import Quotation from "../models/Quotation.js";
import { ROLES } from "../constants/roles.js";

const populateQuotation = (query) => {
  return query
    .populate("client", "clientName companyName phone email lead")
    .populate("lead", "clientName phone email service source status")
    .populate("convertedToProject", "projectName status")
    .populate("createdBy", "name email role");
};

export const getQuotations = async (req, res) => {
  try {
    const quotations = await populateQuotation(
      Quotation.find().sort({ createdAt: -1 }),
    );

    return res.status(200).json({
      success: true,
      count: quotations.length,
      data: quotations,
    });
  } catch (error) {
    console.error("Get Quotations Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const createQuotation = async (req, res) => {
  try {
    const {
      client,
      lead,
      title,
      items,
      discount,
      tax,
      status,
      notes,
      validTill,
    } = req.body;

    if (!client) {
      return res.status(400).json({
        success: false,
        message: "Client is required",
      });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Quotation title is required",
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one quotation item is required",
      });
    }

    const existingClient = await Client.findById(client);

    if (!existingClient) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    const cleanItems = items
      .filter((item) => item?.title?.trim())
      .map((item) => ({
        title: item.title.trim(),
        description: item.description || "",
        price: Number(item.price || 0),
      }));

    if (cleanItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one valid item is required",
      });
    }

    const quotation = await Quotation.create({
      client,
      lead: lead || existingClient.lead || null,
      title: title.trim(),
      items: cleanItems,
      discount: Number(discount || 0),
      tax: Number(tax || 0),
      status: status || "Draft",
      notes,
      validTill: validTill || null,
      createdBy: req.user?._id,
    });

    const populatedQuotation = await populateQuotation(
      Quotation.findById(quotation._id),
    );

    return res.status(201).json({
      success: true,
      message: "Quotation created successfully",
      data: populatedQuotation,
    });
  } catch (error) {
    console.error("Create Quotation Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const getQuotationById = async (req, res) => {
  try {
    const quotation = await populateQuotation(
      Quotation.findById(req.params.id),
    );

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: quotation,
    });
  } catch (error) {
    console.error("Get Quotation Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const updateQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    const allowedFields = [
      "client",
      "lead",
      "title",
      "items",
      "discount",
      "tax",
      "status",
      "notes",
      "validTill",
      "convertedToProject",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === "items") {
          quotation.items = req.body.items
            .filter((item) => item?.title?.trim())
            .map((item) => ({
              title: item.title.trim(),
              description: item.description || "",
              price: Number(item.price || 0),
            }));
        } else if (["discount", "tax"].includes(field)) {
          quotation[field] = Number(req.body[field] || 0);
        } else if (
          ["validTill", "lead", "convertedToProject"].includes(field)
        ) {
          quotation[field] = req.body[field] || null;
        } else {
          quotation[field] = req.body[field];
        }
      }
    });

    await quotation.save();

    const updatedQuotation = await populateQuotation(
      Quotation.findById(quotation._id),
    );

    return res.status(200).json({
      success: true,
      message: "Quotation updated successfully",
      data: updatedQuotation,
    });
  } catch (error) {
    console.error("Update Quotation Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const deleteQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findByIdAndDelete(req.params.id);

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Quotation deleted successfully",
    });
  } catch (error) {
    console.error("Delete Quotation Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};
