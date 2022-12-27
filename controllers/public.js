const Product = require('../models/Product');
const User = require('../models/User');
const Farmer = require('../models/Farmer');
const Location = require('../models/Location');
const { ObjectId } = require('mongodb');

exports.getProduct = async (req, res, next) => {
  const purl = req.params.purl;
  const product = await Product.findOne({
    publicUrl: purl,
  });
  const farmer = await User.findOne(product.farmer);
  const data = {
    ...product._doc,
    farmerName: farmer.fname,
    farmerImage: farmer.profilePicUrl,
  };
  res.status(200).json({ message: 'Success', product: data });
};
exports.createUser = async (req, res, next) => {
  const user = new User({
    fname: 'Haritha',
    lname: 'Hasathcharu',
    gender: 'M',
    dob: new Date('2000-05-09'),
    email: 'haritha@hasathcharu.com',
    nic: '200013555544',
    bAddress: 'A/31,Samurdhi Mw, Yodha Mw, Siddamulla. 10304',
    farmer: new Farmer({
      occupation: 'Student',
      hasVehicle: true,
      maxDeliDistance: 3,
      deliveryCharge: 100,
      nicUrl: 'null',
      saleLocation: [
        new Location({
          name: 'Home',
          latitude: 6.817222,
          longitude: 79.953802,
        }),
      ],
    }),
  });
  await user.save();
  res.status(201).json({ message: 'Success' });
};
exports.createProduct = async (req, res, next) => {
  const user = await User.findOne({ email: 'haritha@hasathcharu.com' });
  const product = new Product({
    title: 'Sri Lankan Carrots',
    status: 'Live',
    description:
      "I dug these bad boys up just today morning from my farm. I'll deliver them for you real quick so that the freshness of them will be intact!",
    price: 1250,
    overallRating: 4,
    minQtyIncrement: 0.5,
    unit: 'KG',
    farmer: user,
    imageUrls: [
      'https://firebasestorage.googleapis.com/v0/b/freshlyyimagestore.appspot.com/o/ProductImages%2FP001_1.jpg?alt=media&token=eb80b75a-b8e9-4b54-9e31-f4e4f40e9faa',
      'https://firebasestorage.googleapis.com/v0/b/freshlyyimagestore.appspot.com/o/ProductImages%2FP001_2.jpg?alt=media&token=80fed965-d9e7-42de-b90b-911d96f8e279',
      'https://firebasestorage.googleapis.com/v0/b/freshlyyimagestore.appspot.com/o/ProductImages%2FP001_3.jpg?alt=media&token=5281e933-bcb7-48f6-955d-034d2b53fd35',
    ],
  });
  product.publicUrl = (
    product.title.replace(/ /g, '_') +
    '_' +
    ObjectId(user)
  ).toLowerCase();
  await product.save();
  return res.status(200).json({ message: 'Product Added' });
};
exports.getHello = (req, res, next) => {
  console.log('hello');
  return res.status(200).json({ message: 'Hello There' });
};
