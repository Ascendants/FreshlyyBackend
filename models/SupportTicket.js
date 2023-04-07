const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const supportTicketSchema = new Schema({
  userEmail: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: false,
  },
  number: {
    type: Number,
    required: false,
  },
  issue: {
    type: String,
    required: false,
  },
  description: {
    type: String,
    required: false,
  },
  email: {
    type: String,
    required: false,
  },
  orderId: {
    type: ObjectId,
    required: false,
  },
  status: {
    type: String,
    enum: ['Pending', 'Processing', 'Complete'],
    default: 'Pending',
  },
  date: {
    type: Date,
    default: () => Date.now(),
  },
});
module.exports = mongoose.model('SupportTicket', supportTicketSchema);
