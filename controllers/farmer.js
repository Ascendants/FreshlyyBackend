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

exports.insertProduct = async (req, res, next) => {
	const user = await User.findOne({ email: 'komuthu@freshlyy.com' });
	console.log(req.body);
	const { price, quantity, description,title, minQtyIncrement } = req.body;
	const newProduct = new Product({
		title:title,
		status: 'Paused',
		description: description,
		price: price,
		overallRating: 3,
		minQtyIncrement: minQtyIncrement,
		unit: 'KG',
		farmer:user,
		qtyAvailable: quantity,
		imageUrls: [
			'https://firebasestorage.googleapis.com/v0/b/freshlyyimagestore.appspot.com/o/ProductImages%2FJackfruit_hanging.jpg?alt=media&token=3fab3b13-82b9-4ba8-b76f-3ea84bc1ceec',
		],
	});
	newProduct.publicUrl = (
		newProduct.title.replace(/ /g, '_') +
		'_' +
		ObjectId(newProduct)
	).toLowerCase();
	newProduct.save((err, savedProduct) => {
		if (err) {
		  console.error(err);
		  res.status(500).send('Error saving product');
		} else {
		  res.status(200).json(savedProduct);
		}
	  });
};