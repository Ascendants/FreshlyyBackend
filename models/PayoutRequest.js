const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const BankAccount = require('./BankAccount');
const payoutRequestSchema = new Schema({
  farmerId: {
    type: ObjectId,
    required: true,
  },
  amount: {
    type: Number,
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
  rejectionReason: {
    type: String,
    default: null,
  },
  account: {
    type: BankAccount,
    required: true,
  },
  payRef: {
    type: String,
    default: null,
  },
  update: {
    type: new Schema(
      {
        created: Date,
        acknowledged: Date, // when an admin acknowledges
        cleared: Date,
        rejected: Date,
      },
      { _id: false }
    ),
    required: true,
    default: {
      created: Date.now(),
      acknowledged: null,
      cleared: null,
      rejected: null,
    },
  },
});

module.exports = mongoose.model('PayoutRequest', payoutRequestSchema);
