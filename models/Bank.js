const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bankSchema = new Schema({
  BankName: {
    type: String,
    required: true,
    unique: true,
  },
  BankAccountNumFormat: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model('Bank', bankSchema);
