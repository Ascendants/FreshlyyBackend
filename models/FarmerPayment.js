const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const farmerPaymentSchema = new Schema({
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
  payRef: {
    type: String,
    default: null,
  },
  paymentDate: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    required: true,
    enum: ['Success', 'Failed', 'Pending'],
    default: 'Pending',
  },
});

module.exports = mongoose.model('FarmerPayment', farmerPaymentSchema);
