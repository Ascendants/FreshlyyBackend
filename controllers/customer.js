const Product = require('../models/Product');
const User = require('../models/User');
const Farmer = require('../models/Farmer');
const Location = require('../models/Location');
const { ObjectId } = require('mongodb');

exports.putOrder = async (req, res, next) => {
  res.status(200).json({ message: 'Success', product: data });
};
