import mongoose from "mongoose";

const quotationItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    price: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { _id: false },
);

const quotationSchema = new mongoose.Schema(
  {
    quotationNo: {
      type: String,
      unique: true,
      trim: true,
    },

    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },

    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    items: [quotationItemSchema],
    
    convertedToProject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },

    subTotal: {
      type: Number,
      default: 0,
    },

    discount: {
      type: Number,
      default: 0,
    },

    tax: {
      type: Number,
      default: 0,
    },

    totalAmount: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["Draft", "Sent", "Accepted", "Rejected"],
      default: "Draft",
    },

    notes: String,
    validTill: Date,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

quotationSchema.pre("save", async function (next) {
  if (!this.quotationNo) {
    this.quotationNo = `QT-${Date.now()}`;
  }

  this.subTotal = this.items.reduce(
    (sum, item) => sum + Number(item.price || 0),
    0,
  );
  this.totalAmount =
    Number(this.subTotal || 0) -
    Number(this.discount || 0) +
    Number(this.tax || 0);

  next();
});

export default mongoose.model("Quotation", quotationSchema);
