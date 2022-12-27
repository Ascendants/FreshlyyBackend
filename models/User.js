const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Farmer = require('./Farmer');
const Customer = require('./Customer');
const Administrator = require('./Administrator');
const userSchema = new Schema({
  fname: {
    type: String,
    required: true,
  },
  lname: {
    type: String,
    required: true,
  },
  gender: {
    type: String,
    required: true,
    default: 'O',
  },
  dob: {
    type: Date,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  nic: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    required: true,
    default: 'Active',
  },
  profilePicUrl: {
    type: String,
    required: true,
    default:
      'https://firebasestorage.googleapis.com/v0/b/freshlyyimagestore.appspot.com/o/UserImages%2Fuser.svg?alt=media&token=e71a192a-5c46-4025-b1f9-1391c7ad05ac',
  },
  bAddress: {
    type: String,
    required: true,
  },
  farmer: {
    type: Farmer.schema,
  },
  customer: {
    type: Customer.schema,
  },
  administrator: {
    type: Administrator.schema,
  },
  dateAdded: {
    type: Date,
    required: true,
    default: () => Date.now(),
  },
});

module.exports = mongoose.model('User', userSchema);
