import Client from "../models/Client.js";
import Lead from "../models/Lead.js";
import Project from "../models/Project.js";
import Quotation from "../models/Quotation.js";
import Task from "../models/Task.js";

export const globalSearch = async (req, res) => {
  try {
    const user = req.user;
    const q = String(req.query.q || req.query.query || "").trim();

    if (!q) {
      return res.status(200).json({
        success: true,
        data: {
          leads: [],
          clients: [],
          projects: [],
          quotations: [],
          tasks: [],
        },
      });
    }

    const regex = new RegExp(q, "i");

    const isDeveloper = user.role === "developer";

    const projectFilter = isDeveloper
      ? {
          assignedTo: user._id,
          $or: [{ projectName: regex }, { service: regex }, { notes: regex }],
        }
      : {
          $or: [{ projectName: regex }, { service: regex }, { notes: regex }],
        };

    const taskFilter = isDeveloper
      ? {
          assignedTo: user._id,
          $or: [{ title: regex }, { description: regex }, { status: regex }],
        }
      : {
          $or: [{ title: regex }, { description: regex }, { status: regex }],
        };

    const [leads, clients, projects, quotations, tasks] = await Promise.all([
      isDeveloper
        ? []
        : Lead.find({
            $or: [
              { clientName: regex },
              { phone: regex },
              { email: regex },
              { company: regex },
              { service: regex },
              { source: regex },
              { status: regex },
            ],
          })
            .select(
              "clientName phone email company service source status createdAt",
            )
            .sort({ createdAt: -1 })
            .limit(8),

      isDeveloper
        ? []
        : Client.find({
            $or: [
              { clientName: regex },
              { companyName: regex },
              { phone: regex },
              { email: regex },
            ],
          })
            .select("clientName companyName phone email createdAt")
            .sort({ createdAt: -1 })
            .limit(8),

      Project.find(projectFilter)
        .populate("client", "clientName companyName")
        .populate("assignedTo", "name role")
        .select(
          "projectName service status budget deadline client assignedTo createdAt",
        )
        .sort({ createdAt: -1 })
        .limit(8),

      isDeveloper
        ? []
        : Quotation.find({
            $or: [{ quotationNo: regex }, { title: regex }, { status: regex }],
          })
            .populate("client", "clientName companyName")
            .select("quotationNo title status totalAmount client createdAt")
            .sort({ createdAt: -1 })
            .limit(8),

      Task.find(taskFilter)
        .populate("project", "projectName")
        .populate("assignedTo", "name role")
        .select("title status priority dueDate project assignedTo createdAt")
        .sort({ createdAt: -1 })
        .limit(8),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        leads,
        clients,
        projects,
        quotations,
        tasks,
      },
    });
  } catch (error) {
    console.error("Global Search Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Search error",
    });
  }
};
