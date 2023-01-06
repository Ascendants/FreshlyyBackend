const Product = require('../models/Product');
const User = require('../models/User');
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
    fname: 'Harini',
    lname: 'Kavindya',
    gender: 'F',
    dob: new Date('2000-01-09'),
    email: 'harini@freshlyy.com',
    nic: '2000234333544',
    bAddress: 'A/31,Samurdhi Mw, Yodha Mw, Siddamulla. 10304',
    accessLevel: 'Customer',
    customer: {
      cart: [
        {
          farmer: ObjectId('63b6b6b8efe162955b701462'),
          distance: 2.5,
          costPerKM: 150,
          items: [{ item: ObjectId('63b6b7b160d78bea22456aa8'), qty: 2 }],
        },
        {
          farmer: ObjectId('63b6b5d2ce65a7b5a2671383'),
          distance: 2,
          costPerKM: 100,
          items: [
            { item: ObjectId('63b6b9929ad79279b814928f'), qty: 3 },
            { item: ObjectId('63b6b84bac5c2ccb31a8f56f'), qty: 2 },
          ],
        },
      ],
    },
  });
  await user.save();
  res.status(201).json({ message: 'Success' });
};
exports.createProduct = async (req, res, next) => {
  const user = await User.findOne({ email: 'haritha@freshlyy.com' });
  const product = new Product({
    title: 'Sri Lankan Carrots',
    status: 'Live',
    description: 'These are fresh carrots dug up from my fresh garden.',
    price: 1250,
    overallRating: 4,
    minQtyIncrement: 0.5,
    unit: 'KG',
    farmer: user,
    qtyAvailable: 40,
    imageUrls: [
      'https://firebasestorage.googleapis.com/v0/b/freshlyyimagestore.appspot.com/o/ProductImages%2FP001_1.jpg?alt=media&token=eb80b75a-b8e9-4b54-9e31-f4e4f40e9faa',
      'https://firebasestorage.googleapis.com/v0/b/freshlyyimagestore.appspot.com/o/ProductImages%2FP001_2.jpg?alt=media&token=80fed965-d9e7-42de-b90b-911d96f8e279',
      'https://firebasestorage.googleapis.com/v0/b/freshlyyimagestore.appspot.com/o/ProductImages%2FP001_3.jpg?alt=media&token=5281e933-bcb7-48f6-955d-034d2b53fd35',
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
