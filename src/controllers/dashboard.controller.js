import Client from "../models/Client.js";
import Lead from "../models/Lead.js";
import Project from "../models/Project.js";
import Quotation from "../models/Quotation.js";
import Task from "../models/Task.js";
import User from "../models/User.js";

const getDateRange = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const next7Days = new Date(today);
  next7Days.setDate(today.getDate() + 7);
  next7Days.setHours(23, 59, 59, 999);

  return { today, next7Days };
};

export const getDashboardAnalytics = async (req, res) => {
  try {
    const user = req.user;

    if (user.role !== "admin" && user.role !== "ads-manager") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view analytics",
      });
    }

    const [totalLeads, wonLeads, sourceStats, statusStats] = await Promise.all([
      Lead.countDocuments(),

      Lead.countDocuments({
        status: "Won",
      }),

      Lead.aggregate([
        {
          $group: {
            _id: { $ifNull: ["$source", "Unknown"] },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
      ]),

      Lead.aggregate([
        {
          $group: {
            _id: { $ifNull: ["$status", "Unknown"] },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
      ]),
    ]);

    const conversionRate = totalLeads
      ? Number(((wonLeads / totalLeads) * 100).toFixed(2))
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalLeads,
        wonLeads,
        conversionRate,
        sourceStats,
        statusStats,
      },
    });
  } catch (error) {
    console.error("Dashboard Analytics Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Analytics error",
    });
  }
};

export const getDashboard = async (req, res) => {
  try {
    const user = req.user;
    const { today, next7Days } = getDateRange();

    if (user.role === "admin" || user.role === "ads-manager") {
      const [
        leads,
        clients,
        projects,
        quotations,
        tasks,
        recentLeads,
        upcomingTasks,
      ] = await Promise.all([
        Lead.countDocuments(),
        Client.countDocuments(),
        Project.countDocuments(),
        Quotation.countDocuments(),
        Task.countDocuments(),

        Lead.find()
          .populate("assignedTo", "name email role")
          .sort({ createdAt: -1 })
          .limit(5),

        Task.find({
          status: { $ne: "Done" },
          dueDate: { $gte: today, $lte: next7Days },
        })
          .populate("project", "projectName status")
          .populate("assignedTo", "name email role")
          .sort({ dueDate: 1 })
          .limit(8),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          role: user.role,
          cards: {
            leads,
            clients,
            projects,
            quotations,
            tasks,
          },
          recentLeads,
          upcomingTasks,
        },
      });
    }

    const [
      myProjects,
      myTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      recentTasks,
      upcomingTasks,
    ] = await Promise.all([
      Project.countDocuments({ assignedTo: user._id }),

      Task.countDocuments({ assignedTo: user._id }),

      Task.countDocuments({
        assignedTo: user._id,
        status: "Done",
      }),

      Task.countDocuments({
        assignedTo: user._id,
        status: { $ne: "Done" },
      }),

      Task.countDocuments({
        assignedTo: user._id,
        status: { $ne: "Done" },
        dueDate: { $lt: today },
      }),

      Task.find({ assignedTo: user._id })
        .populate("project", "projectName status")
        .sort({ createdAt: -1 })
        .limit(6),

      Task.find({
        assignedTo: user._id,
        status: { $ne: "Done" },
        dueDate: { $gte: today, $lte: next7Days },
      })
        .populate("project", "projectName status")
        .sort({ dueDate: 1 })
        .limit(8),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        role: user.role,
        cards: {
          myProjects,
          myTasks,
          completedTasks,
          pendingTasks,
          overdueTasks,
        },
        recentTasks,
        upcomingTasks,
      },
    });
  } catch (error) {
    console.error("Dashboard Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Dashboard Error",
    });
  }
};

export const getTeamWorkload = async (req, res) => {
  try {
    const { today } = getDateRange();

    const users = await User.find({ isActive: true })
      .select("name email phone role isActive")
      .sort({ createdAt: -1 });

    const workload = await Promise.all(
      users.map(async (user) => {
        const [totalTasks, completedTasks, pendingTasks, overdueTasks] =
          await Promise.all([
            Task.countDocuments({
              assignedTo: user._id,
            }),

            Task.countDocuments({
              assignedTo: user._id,
              status: "Done",
            }),

            Task.countDocuments({
              assignedTo: user._id,
              status: { $ne: "Done" },
            }),

            Task.countDocuments({
              assignedTo: user._id,
              status: { $ne: "Done" },
              dueDate: { $lt: today },
            }),
          ]);

        return {
          user,
          totalTasks,
          completedTasks,
          pendingTasks,
          overdueTasks,
        };
      }),
    );

    return res.status(200).json({
      success: true,
      data: workload,
    });
  } catch (error) {
    console.error("Team Workload Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Team workload error",
    });
  }
};

export const getTeamMemberWorkload = async (req, res) => {
  try {
    const { today } = getDateRange();
    const { userId } = req.params;
    const user = await User.findById(userId).select(
      "name email phone role isActive createdAt",
    );
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Team member not found" });
    }
    const tasks = await Task.find({ assignedTo: userId })
      .populate({
        path: "project",
        select: "projectName service status deadline client",
        populate: {
          path: "client",
          select: "clientName companyName phone email",
        },
      })
      .sort({ dueDate: 1, createdAt: -1 });
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(
      (task) => task.status === "Done",
    ).length;
    const pendingTasks = tasks.filter((task) => task.status !== "Done").length;
    const overdueTasks = tasks.filter((task) => {
      if (!task.dueDate || task.status === "Done") return false;
      return new Date(task.dueDate) < today;
    }).length;
    return res
      .status(200)
      .json({
        success: true,
        data: {
          user,
          stats: { totalTasks, completedTasks, pendingTasks, overdueTasks },
          tasks,
        },
      });
  } catch (error) {
    console.error("Team Member Workload Error:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: error.message || "Team member workload error",
      });
  }
};
