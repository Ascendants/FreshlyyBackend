const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const payoutRequestSchema = new Schema({
  farmerId: {
    type: ObjectId,
    required: true,
  },
  amount: {
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
      },
      { _id: false }
    ),
    required: true,
    default: {
      created: Date.now(),
      acknowledged: null,
      cleared: null,
    },
  },
});

module.exports = mongoose.model('PayoutRequest', payoutRequestSchema);
