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
    enum: ['Quarantined', 'Live', 'Paused', 'Deleted'],
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
    type: [
      new Schema(
        {
          imageUrl: {
            type: String,
            required: true,
          },
          placeholder: {
            type: String,
            required: true,
          },
        },
        { _id: false }
      ),
    ],
    required: true,
  },
  qtyAvailable: {
    type: Number,
    required: true,
    min: 0,
  },
  likes:{
    type:[String],
    min:null
  },
});
module.exports = mongoose.model('Product', productSchema);
