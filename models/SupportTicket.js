const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const supportTicketSchema = new Schema(
  {
    userEmail: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    number: {
      type: Number,
      required: true,
    },
    issue: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Processing", "Complete"],
      default: "Pending",
    },
  },
);
module.exports = mongoose.model('SupportTicket', supportTicketSchema);