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
    require: true,
  },
  payRef: {
    type: String,
    default: null,
  },
  payable: {
    type: Boolean,
    default: false,
  },
  update: {
    type: new Schema(
      {
        created: Date,
        received: Date,
        cleared: Date,
      },
      { _id: false }
    ),
    required: true,
    default: {
      created: Date.now(),
      received: null,
      cleared: null,
    },
  },
});

module.exports = mongoose.model('PayoutRequest', payoutRequestSchema);
