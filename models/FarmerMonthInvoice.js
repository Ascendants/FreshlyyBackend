const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const farmerMonthInvoiceSchema = new Schema({
  farmerId: {
    type: ObjectId,
    required: true,
  },
  farmerName: {
    type: String,
    required: true,
  },
  farmerEmail: {
    type: String,
    required: true,
  },
  farmerAddress: {
    type: String,
    required: true,
  },
  invoiceId: {
    type: String,
    required: true,
    unique: true,
  },
  totalEarnings: {
    //total earnings
    type: Number,
    required: true,
    default: 0,
  },
  commissionAmount: {
    type: Number,
    required: true,
    default: 0,
  },
  cashInHand: {
    type: Number,
    required: true,
    default: 0,
  },
  orders: {
    type: [ObjectId],
    default: [],
  },
  date: {
    type: new Schema(
      {
        month: {
          type: Number,
          required: true,
        },
        year: {
          type: Number,
          required: true,
        },
      },
      { _id: false }
    ),
    required: true,
    default: {
      month: new Date().getMonth(),
      year: new Date().getFullYear(),
    },
  },
  status: {
    type: String,
    required: true,
    default: 'Active',
    enum: ['Active', 'Closed'],
  },
});

module.exports = mongoose.model('FarmerMonthInvoice', farmerMonthInvoiceSchema);
