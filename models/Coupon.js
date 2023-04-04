const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const couponSchema = new Schema({
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
    type: String,
    required: true,
  },
  eDate: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Active', 'Deactivate'],
    default: 'Pending',
  },
});
module.exports = mongoose.model('Coupon', couponSchema);
