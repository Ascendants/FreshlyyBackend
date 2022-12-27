const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Location = require('./Location');
const Product = require('./Product');

const farmerSchema = new Schema({
  occupation: {
    type: String,
    required: true,
  },
  hasVehicle: {
    type: Boolean,
    required: true,
    default: false,
  },
  maxDeliDistance: {
    type: Number,
    required: true,
    default: 0,
  },
  nicUrl: {
    type: String,
    required: true,
  },
  deliveryCharge: {
    type: Number,
    required: true,
    default: 50,
  },
  saleLocation: {
    type: [Location.schema],
    required: true,
  },
});
module.exports = mongoose.model('Farmer', farmerSchema);
