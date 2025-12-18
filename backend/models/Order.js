// backend/models/Order.js
const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    receivingOrg: {
      type: String,
      default: "default", // ключ приёмной организации
    },
    wasteType: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      enum: ["ton", "m3", "bag"],
      default: "ton",
    },
    address: {
      type: String,
      required: true,
    },
    desiredDateTime: {
      type: String, // пока строка, можно сделать Date
    },
    comment: {
      type: String,
    },
    status: {
      type: String,
      enum: ["new", "accepted", "in_progress", "completed", "canceled"],
      default: "new",
    },
    tariffPerUnit: {
      type: Number,
    },
    totalPrice: {
      type: Number,
    },

    // на будущее
    clientId: {
      type: String,
    },
    driverId: {
      type: String,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

module.exports = mongoose.model("Order", OrderSchema);
