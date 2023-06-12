const Product = require('../models/Product');
const User = require('../models/User');
const { ObjectId } = require('mongodb');
const admin = require('../firebase/firebase');
const { json } = require('body-parser');

exports.getProduct = async (req, res, next) => {
  try {
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
  } catch (err) {
    res.status(500).json({ message: 'Something went wrong', error: err });
  }
};
exports.createUser = async (req, res, next) => {
  const user = new User({
    fname: 'Komuthu',
    lname: 'Fernando',
    gender: 'M',
    dob: new Date('2000-05-08'),
    email: 'komuthu@freshlyy.com',
    nic: '2000709088123',
    bAddress: '96/1A, Temple Road, Nawala. 10101',
    accessLevel: 'Farmer',
    customer: {
      cart: [
        {
          farmer: ObjectId('63b6b5d2ce65a7b5a2671383'),
          distance: 2.5,
          costPerKM: 150,
          items: [{ item: ObjectId('63b6b9929ad79279b814928f'), qty: 5 }],
        },
        // {
        // 	farmer: ObjectId('63b6b5d2ce65a7b5a2671383'),
        // 	distance: 2,
        // 	costPerKM: 100,
        // 	items: [
        // 		{ item: ObjectId('63b6b9929ad79279b814928f'), qty: 1 },
        // 		{ item: ObjectId('63b6b84bac5c2ccb31a8f56f'), qty: 4 },
        // 	],
        // },
      ],
    },
  });
  await user.save();
  res.status(201).json({ message: 'Success' });
};
exports.createProduct = async (req, res, next) => {
  const user = await User.findOne({ email: 'komuthu@freshlyy.com' });
  const product = new Product({
    title: 'Sri Lankan Jackfruit',
    status: 'Paused',
    description: 'These are fresh jackfruits dug up from my fresh garden.',
    price: 1000,
    overallRating: 3,
    minQtyIncrement: 0.5,
    unit: 'KG',
    farmer: user,
    qtyAvailable: 40,
    imageUrls: [
      'https://firebasestorage.googleapis.com/v0/b/freshlyyimagestore.appspot.com/o/ProductImages%2FJackfruit_hanging.jpg?alt=media&token=3fab3b13-82b9-4ba8-b76f-3ea84bc1ceec',
    ],
  });
  product.publicUrl = (
    product.title.replace(/ /g, '_') +
    '_' +
    ObjectId(product)
  ).toLowerCase();
  await product.save();
  return res.status(200).json({ message: 'Product Added' });
};
exports.getHello = (req, res, next) => {
  console.log('hello');
  return res.status(200).json({ message: 'Hello There' });
};
