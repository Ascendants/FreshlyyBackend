const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');
const { ObjectId } = require('mongodb');

exports.getHello = async (req, res, next) => {
	console.log('Hello');
	res.status(200).json({ message: 'Hello' });
};


//Geting all the farmer's dashboard data
exports.getDashboard = async (req, res, next) => {
  
	const liveProducts = await Product.countDocuments({ farmer: req.user._id, status: 'Live' });
	const pendingProducts = await Product.countDocuments({ farmer: req.user._id, status: 'Quarantined' });
	
	const pastOrders = await Order.countDocuments({ farmer: req.user._id, 'orderUpdate.closed': {$ne : null} }); 
	const newOrders = await Order.countDocuments({
		farmer: req.user._id,
		$or: [
			{'orderUpdate.processed': {$ne : null}},
			{'orderUpdate.shipped': {$ne : null}},
			{'orderUpdate.delivered': {$ne : null}},
			{'orderUpdate.pickedUp': {$ne : null}},
			{'orderUpdate.cancelled': {$ne : null}},
			{'orderUpdate.failed': {$ne : null}},
			{'orderUpdate.closed': {$ne : null}},
		],
		'orderUpdate.placed': {$ne : null},
		'orderUpdate.payment': {$ne : null},
	});

	// console.log(newOrders);
  res.status(200).json({ message: 'Success', user: req.user, liveProducts, pendingProducts, pastOrders, newOrders});
};