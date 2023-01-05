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
    title: 'Green Beans',
    status: 'Live',
    description:
      'I plucked them freshly today morning. These are the best green beans you can get on the platform',
    price: 500,
    overallRating: 3,
    minQtyIncrement: 0.5,
    unit: 'KG',
    farmer: user,
    imageUrls: [
      'https://firebasestorage.googleapis.com/v0/b/freshlyyimagestore.appspot.com/o/ProductImages%2Fpexels-yulia-rozanova-3004798.jpg?alt=media&token=6d37f317-93fb-4e41-bae8-d07380424f62',
      'https://firebasestorage.googleapis.com/v0/b/freshlyyimagestore.appspot.com/o/ProductImages%2Fpexels-antony-trivet-12974525%202.jpg?alt=media&token=e69399ba-fd6c-4b57-80cc-2971e8591200',
      'https://firebasestorage.googleapis.com/v0/b/freshlyyimagestore.appspot.com/o/ProductImages%2Fpexels-andrÃ©-beltrame-1680585%202.jpg?alt=media&token=99581525-51de-4997-bd2a-d000be5a1e26',
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
