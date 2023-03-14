const Product = require('../models/Product');
const Bank = require('../models/Bank');
const User = require('../models/User');
const Order = require('../models/Order');
const { ObjectId } = require('mongodb');
const { validationResult } = require('express-validator');

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
exports.getBanks = async (req, res, next) => {
  const banks = await Bank.find();
  res.status(200).json({ message: 'Success', banks: banks });
};

exports.postCreateBank = async (req, res, next) => {
  const bank = new Bank({
    BankName: 'Union Bank',
    BankAccountNumFormat: /\d{16}/,
  });
  bank.save();

  res.status(200).json({ message: 'Success' });
};

exports.postSaveAccount = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(422).json({ message: 'Vaildation Error' });
  try {
    const { bankId, AccountName, AccountNumber } = req.body;
    const bank = await Bank.findById(bankId);
    if (!bank) {
      return res.status(422).json({ message: 'Bank not found' });
    }
    if (!new RegExp(bank.BankAccountNumFormat).test(AccountNumber)) {
      return res.status(422).json({ message: 'Invalid account number' });
    }
    const account = {
      Bank: bank._id,
      AccountName: AccountName,
      AccountNumber: AccountNumber,
    };
    // console.log(req.user);
    req.user.farmer.bankAccount = account;
    req.user.save();
    res.status(200).json({ message: 'Success' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
};
