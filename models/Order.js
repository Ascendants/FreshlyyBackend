const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Location = require('./Location');
const orderSchema = new Schema({
  farmer: {
    type: ObjectId,
    required: true,
  },
  customer: {
    type: ObjectId,
    required: true,
  },
  isDelivery: {
    type: Boolean,
    required: true,
    default: false,
  },
  deliveryDistance: {
    type: Number,
  },
  deliveryCostPerKM: {
    type: Number,
  },
  deliveryLocation: {
    type: Location,
  },
  farmerRating: {
    type: Number,
    default: -1,
  },
  deliveryRating: {
    type: Number,
  },
  orderUpdate: {
    type: new Schema(
      {
        placed: Date,
        payment: Date,
        processed: Date,
        shipped: Date,
        delivered: Date,
        pickedUp: Date,
        cancelled: Date,
        failed: Date,
      },
      { _id: false }
    ),
    required: true,
    default: {
      placed: new Date(),
      payment: null,
      processed: null,
      shipped: null,
      delivered: null,
      pickedUp: null,
      cancelled: null,
      failed: null,
    },
  },
  items: [
    new Schema(
      {
        uPrice: {
          type: Number,
          required: true,
        },
        qty: {
          type: Number,
          required: true,
        },
        commission: {
          type: Number,
          required: true,
        },
        itemId: {
          type: ObjectId,
          required: true,
        },
      },
      { _id: false }
    ),
  ],
  totalPrice: {
    type: Number,
    required: true,
    default: 0,
  },
  totalDeliveryCharge: {
    type: Number,
  },
  payment: [
    new Schema({
      type: {
        type: String,
        required: true,
        default: 'cod',
      },
      cardNo: {
        type: String,
      },
      couponCode: {
        type: String,
      },
      amount: {
        type: Number,
        required: true,
      },
      status: {
        type: String,
        required: true,
      },
    }),
  ],
});
module.exports = mongoose.model('Order', orderSchema);