const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const reportSchema = new Schema({
  farmerId: {
    type: ObjectId,
    required: true,
  },
  customerId: {
    type: ObjectId,
    required: true,
  },
  report: {
    type: String,
  },
});
module.exports = mongoose.model('Report', reportSchema);
