const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const schema = mongoose.Schema(
  {
    Bank: { type: ObjectId, required: true },
    AccountName: { type: String, required: true },
    AccountNumber: { type: String, required: true },
  },
  { _id: false }
);
module.exports = schema;
