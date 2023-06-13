const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const schema = new Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now(),
  },
  report: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model('DailyTaskReport', schema);
