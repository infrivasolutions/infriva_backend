import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    clientName: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    company: {
      type: String,
      trim: true,
    },

    service: {
      type: String,
      required: true,
      trim: true,
    },

    budget: {
      type: String,
      trim: true,
    },

    message: {
      type: String,
      trim: true,
    },

    source: {
      type: String,
      enum: ["Website", "Meta Ads", "Manual", "WhatsApp", "Referral", "Other"],
      default: "Website",
    },

    metaLeadId: {
      type: String,
      trim: true,
    },

    campaignName: {
      type: String,
      trim: true,
    },

    adName: {
      type: String,
      trim: true,
    },

    formName: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ["New", "Contacted", "Qualified", "Proposal Sent", "Won", "Lost"],
      default: "New",
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    priority: {
      type: String,
      enum: ["Hot", "Warm", "Cold"],
      default: "Warm",
    },

    followUpDate: {
      type: Date,
    },

    notes: [
      {
        text: {
          type: String,
          required: true,
        },
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true },
);

leadSchema.index({ phone: 1 });
leadSchema.index({ source: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ priority: 1 });
leadSchema.index({ followUpDate: 1 });
leadSchema.index({ assignedTo: 1 });

leadSchema.index(
  { metaLeadId: 1 },
  {
    unique: true,
    sparse: true,
  },
);

export default mongoose.model("Lead", leadSchema);
