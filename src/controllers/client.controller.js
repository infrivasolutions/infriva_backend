import Client from "../models/Client.js";

export const getClients = async (req, res) => {
  try {
    const clients = await Client.find()
      .populate(
        "lead",
        "clientName phone email service source budget status createdAt",
      )
      .populate("assignedTo", "name email role")
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
      .populate("assignedTo", "name email role");

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
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
