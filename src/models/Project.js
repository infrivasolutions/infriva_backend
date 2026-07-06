import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },

    projectName: {
      type: String,
      required: true,
      trim: true,
    },

    service: {
      type: String,
      trim: true,
    },

    budget: {
      type: Number,
      default: 0,
    },

    startDate: Date,
    deadline: Date,

    status: {
      type: String,
      enum: ["Not Started", "In Progress", "On Hold", "Completed", "Cancelled"],
      default: "Not Started",
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    activity: [
      {
        action: String,
        message: String,
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    notes: String,
  },
  { timestamps: true },
);

export default mongoose.model("Project", projectSchema);
