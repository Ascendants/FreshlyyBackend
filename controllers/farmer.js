const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');
const SupportTicket = require('../models/SupportTicket');
const Coupon = require('../models/Coupon');

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

exports.supportTicket = (req, res, next) => {
	// console.log(req.body);
	const {name, number, issue, desc} = req.body;
	const userEmail = req.user.email;

	const newSupportTicket = new SupportTicket({
		userEmail: userEmail,
		name: name,
		number: number,
		issue: issue,
		description: desc
	})

	newSupportTicket.save((err, ticket) => {
    if (err) {
      console.log(err);
      res.status(500).send('Error saving data');
    } else {
			console.log("success");
      res.status(200).json({message: "Success", id: ticket._id});
    }
  });
}

exports.getSupportTicket = async (req, res) => {
	try{
		// console.log('hii');
		const supportTickets = await SupportTicket.find({});
		res.status(200).json({message:"Success",supportTicket:supportTickets});
	} catch (error) {
		console.log(error);
		res.status(500).json({message:"Error fetching supportTicket from database"});
	}
}

exports.updateSupportTicket = async (req, res) => {
	const { id } = req.params;
	const { status } = req.body;

	try {
		const supportTicket = await SupportTicket.findByIdAndUpdate({_id: id}, {status}, {new: true});
		res.json(supportTicket);
	} catch (error) {
		console.log(error);
		res.status(500).send("Error updating supportTicket");
	}
}


exports.deleteSupportTicket = async (req, res) => {
	const { id } = req.params;
	try{
		await SupportTicket.findOneAndDelete({_id: id});
		res.sendStatus(204);
	}catch (error) {
		console.log(error);
		res.status(500).send("Error deleting supportTicket");
	}
}

exports.createCoupon = (req, res, next) => {
	// console.log(req.body);
	const {presentage, cCode, cDate, eDate} = req.body;
	const userEmail = req.user.email;

	const newCoupon = new Coupon({
		userEmail: userEmail,
		presentage: presentage,
		cCode: cCode,
		cDate: cDate,
		eDate: eDate
	})

	newCoupon.save((err) => {
    if (err) {
      console.log(err);
      res.status(500).send('Error saving data');
    } else {
			console.log('success');
			res.status(200).json({message: "Success"});
    }
  });
}