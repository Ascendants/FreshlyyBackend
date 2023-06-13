const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Order = require('./Order');
const User = require('./User');
const reviewSchema = new Schema({});
module.exports = mongoose.model('Review', reviewSchema);
