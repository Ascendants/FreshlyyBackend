const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const configSchema = new Schema({
  siteCommission: {
    type: Number,
    required: true,
    default: 0.1,
  },
});
module.exports = mongoose.model('Config', configSchema);
