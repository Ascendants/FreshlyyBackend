const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const couponSchema = new Schema(
  {
    userEmail: {
      type: String,
      required: true,
    },
    presentage: {
      type: String,
      required: true,
    },
    cCode: {
      type: String,
      required: true,
    },
    cDate: {
      type: Date,
      required: true,
    },
    eDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Active", "Deactivate"],
      default: "Pending",
    },
  },
);
module.exports = mongoose.model('Coupon', couponSchema);