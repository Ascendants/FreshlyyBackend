const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');
const { ObjectId } = require('mongodb');

exports.getHello = async (req, res, next) => {
	console.log('Hello');
	res.status(200).json({ message: 'Hello' });
};

exports.getDashboard = async (req, res, next) => {
	// const data = {
	// 	fname: 'Nadun',
	// 	lname: 'Fernando',
	// 	imageUrl:
	// 		'https://firebasestorage.googleapis.com/v0/b/freshlyyimagestore.appspot.com/o/UserImages%2Fkom.jpg?alt=media&token=49a88f0c-ab79-4d84-8ddb-ada16a2b0101',
	// };
	const orders = await Order.find({ farmer: req.user._id }); //gives all orders belonging to farmer;
	const products = Product.find({ farmer: req.user._id });
	res.status(200).json({ message: 'Success', user: req.user });
};
