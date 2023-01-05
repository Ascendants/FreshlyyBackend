const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const productSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
    default: 'Quarantined',
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  overallRating: {
    type: Number,
    required: false,
    default: 0,
  },
  minQtyIncrement: {
    type: Number,
    required: true,
    default: 0.5,
  },
  unit: {
    type: String,
    default: 'KG',
    required: true,
  },
  farmer: {
    type: ObjectId,
    required: true,
  },
  publicUrl: {
    type: String,
    required: true,
    unique: true,
  },
  dateAdded: {
    type: Date,
    required: true,
    default: () => Date.now(),
  },
  imageUrls: {
    type: [String],
    required: true,
  },
});
module.exports = mongoose.model('Product', productSchema);