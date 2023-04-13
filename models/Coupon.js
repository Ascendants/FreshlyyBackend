const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const couponSchema = new Schema({
  farmerEmail: {
    type: String,
  },
  percentage: {
    type: Number,
  },
  amount: {
    type: Number,
  },
  cCode: {
    type: String,
    required: true,
  },
  cDate: {
    type: String,
    required: true,
  },
  eDate: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Active', 'Inactive'],
    default: 'Pending',
  },
  type: {
    type: String,
    enum: ['Default', 'Farmer', 'Loyalty'],
    default: 'Default',
  },
});
module.exports = mongoose.model('Coupon', couponSchema);
