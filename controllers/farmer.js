const Product = require('../models/Product');
const User = require('../models/User');
const moment = require('moment');
const Order = require('../models/Order');
const { ObjectId } = require('mongodb');
const Bank = require('../models/Bank');
const SupportTicket = require('../models/SupportTicket');
const Coupon = require('../models/Coupon');
const { logger } = require('../util/logger');
const PayoutRequest = require('../models/PayoutRequest');
const mongoose = require('mongoose');

const { validationResult } = require('express-validator');
const FarmerMonthInvoice = require('../models/FarmerMonthInvoice');

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
  const { price, qtyAvailable, description, title, minQtyIncrement } = req.body;
  const newProduct = new Product({
    title: title,
    status: 'Paused',
    description: description,
    price: price,
    overallRating: 3,
    minQtyIncrement: minQtyIncrement,
    unit: 'KG',
    farmer: user,
    qtyAvailable: qtyAvailable,
    imageUrls: [
      {
        imageUrl:
          'https://firebasestorage.googleapis.com/v0/b/freshlyyimagestore.appspot.com/o/ProductImages%2FP001_1.jpg?alt=media&token=eb80b75a-b8e9-4b54-9e31-f4e4f40e9faa',
        placeholder: '#9c7954',
      },
    ],
  });

  if (minQtyIncrement >= qtyAvailable) {
    return res
      .status(400)
      .json({ message: 'minQtyIncrement should be less than qtyAvailable' });
  }
  if (!isNaN(parseFloat(title))) {
    return res.status(400).json({ message: 'Title should not be a number' });
  }
  if (isNaN(price) || isNaN(qtyAvailable)) {
    res.status(400).json({ message: 'Price and quantity must be numbers' });
    return;
  }
  newProduct.publicUrl = (
    newProduct.title.replace(/ /g, '_') +
    '_' +
    ObjectId(newProduct)
  ).toLowerCase();
  newProduct.save((err, savedProduct) => {
    if (err) {
      console.error(err);
      res.status(500).send({ message: 'Error saving product' });
    } else {
      res.status(200).json({ message: 'Success', product: savedProduct });
    }
  });
};
exports.getSellingProduct = async (req, res) => {
  try {
    console.log('hii');
    // console.log(req.productId);
    const productId = '63f4d385b1a06dad48ec25ba';
    const product = await Product.findById(productId);
    console.log(product);
    res.status(200).json({ message: 'Success', product: product });
  } catch (error) {
    console.log(error);
  }
};

// exports.updateproductdetails = async (req, res, next) => {
//   async function updateProduct(productId, updatedFields) {
//     try {
//       // find the product by ID
//       const product = await Product.findById(productId);

//       // update the product with new values
//       Object.assign(product, updatedFields);

//       // save the updated product to the database
//       await product.save();

//       console.log("Product updated successfully!");
//     } catch (err) {
//       console.error(err);
//     }
//   }
async function updateProduct(productId, updatedFields) {
  try {
    const product = await Product.findByIdAndUpdate(productId, updatedFields);

    if (!product) {
      throw new Error('Product not found');
    }

    return product;
  } catch (err) {
    throw err;
  }
}

exports.updateproductdetails = async (req, res, next) => {
  const user = await User.findOne({ email: 'komuthu@freshlyy.com' });
  // console.log(req.body);
  console.log(req.params.productId);

  try {
    const productId = req.params.productId;
    const updatedFields = req.body;
    console.log(productId);
    console.log(updatedFields);
    await updateProduct(productId, updatedFields);
    res.status(200).json({ message: 'Product updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating product' });
  }
};

//   // usage
//   const productId = "63f4d385b1a06dad48ec25ba";
//   const updatedFields = {
//     title: title,
//     status: "Paused",
//     description: description,
//     price: price,
//     overallRating: 3,
//     minQtyIncrement: minQtyIncrement,
//     unit: "KG",
//     farmer: user,
//     qtyAvailable: qtyAvailable,
//     imageUrls: [
//       {
//         imageUrl:
//           "https://firebasestorage.googleapis.com/v0/b/freshlyyimagestore.appspot.com/o/ProductImages%2FP001_1.jpg?alt=media&token=eb80b75a-b8e9-4b54-9e31-f4e4f40e9faa",
//         placeholder: "#9c7954",
//       },
//     ],
//   };
//   updateProduct(productId, updatedFields);
// };

exports.supportTicket = (req, res, next) => {
  // console.log(req.body);
  const { name, number, issue, desc } = req.body;
  const userEmail = req.user.email;

  const newSupportTicket = new SupportTicket({
    userEmail: userEmail,
    name: name,
    number: number,
    issue: issue,
    description: desc,
  });

  newSupportTicket.save((err, ticket) => {
    if (err) {
      console.log(err);
      res.status(500).send('Error saving data');
    } else {
      console.log('success');
      res.status(200).json({ message: 'Success', id: ticket._id });
    }
  });
};

exports.getSupportTicket = async (req, res) => {
  try {
    // console.log('hii');
    const supportTickets = await SupportTicket.find({});
    res.status(200).json({ message: 'Success', supportTicket: supportTickets });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: 'Error fetching supportTicket from database' });
  }
};

exports.updateSupportTicket = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const supportTicket = await SupportTicket.findByIdAndUpdate(
      { _id: id },
      { status },
      { new: true }
    );
    res.json(supportTicket);
  } catch (error) {
    console.log(error);
    res.status(500).send('Error updating supportTicket');
  }
};

exports.deleteSupportTicket = async (req, res) => {
  const { id } = req.params;
  try {
    await SupportTicket.findOneAndDelete({ _id: id });
    res.sendStatus(204);
  } catch (error) {
    console.log(error);
    res.status(500).send('Error deleting supportTicket');
  }
};

exports.createCoupon = (req, res, next) => {
  // console.log(req.body);
  const { presentage, cCode, cDate, eDate } = req.body;
  const userEmail = req.user.email;

  const newCoupon = new Coupon({
    userEmail: userEmail,
    presentage: presentage,
    cCode: cCode,
    cDate: cDate,
    eDate: eDate,
  });

  newCoupon.save((err) => {
    if (err) {
      console.log(err);
      res.status(500).send('Error saving data');
    } else {
      console.log('success');
      res.status(200).json({ message: 'Success' });
    }
  });
};
exports.getBanks = async (req, res, next) => {
  try {
    const banks = await Bank.find();
    res.status(200).json({ message: 'Success', banks: banks });
  } catch (err) {
    logger(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
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

exports.getEarnings = async (req, res, next) => {
  const updatedDate = new Date(req.user.farmer.lastBalanceUpdate);
  try {
    let bank = null;
    let accountNumber = null;
    if (req.user.farmer.bankAccount) {
      bank = (await Bank.findById(req.user.farmer.bankAccount.Bank)).BankName;
      accountNumber =
        req.user.farmer.bankAccount.AccountNumber.slice(0, -4).replace(
          /./g,
          '*'
        ) + req.user.farmer.bankAccount.AccountNumber.slice(-4);
    }
    data = {
      totalEarnings: req.user.farmer.accTotalEarnings,
      commissionCharged: req.user.farmer.accCommissionCharges,
      cashInHand: req.user.farmer.accCashEarnings,
      withdrawable: req.user.farmer.withdrawable,
      couponCharges: req.user.farmer.accCouponCharges,
      lastUpdate:
        moment(updatedDate).format('DD-MM-YYYY') +
        ' at ' +
        moment(updatedDate).format('HH:mm'),
      couponCharges: req.user.farmer.accCouponCharges,
      isWithdrawable: req.user.farmer.withdrawable > 2000,
      hasBankAccount: req.user.farmer.bankAccount != null,
      bank: bank,
      bankAccountNum: accountNumber,
      negativeSince: req.user.farmer.negativeBalanceSince
        ? moment(new Date(req.user.farmer.negativeBalanceSince)).format(
            'DD-MM-YYYY'
          )
        : null,
    };
    res.status(200).json({ message: 'Success', earnings: data });
  } catch (err) {
    logger(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
};

exports.postPayoutRequest = async (req, res, next) => {
  if (req.user.farmer.withdrawable < 2000) {
    return res.status(403).json({ message: 'Insufficient Balance' });
  }
  const session = await mongoose.startSession();
  try {
    const payoutRequest = new PayoutRequest({
      farmerId: req.user._id,
      amount: req.user.farmer.withdrawable,
      farmerName: req.user.fname + ' ' + req.user.lname,
      farmerEmail: req.user.email,
      farmerAddress: req.user.bAddress,
      account: req.user.farmer.bankAccount,
    });
    req.user.farmer.withdrawable = 0;
    await session.withTransaction(async () => {
      await payoutRequest.save({ session: session });
      await req.user.save({ session: session });
    });
    res
      .status(200)
      .json({ message: 'Success', payoutRequestId: payoutRequest._id });
  } catch (err) {
    logger(err);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

exports.changeFarmerFinStatus = async (
  farmerId,
  status,
  session,
  withTransaction = false
) => {
  if (!(status == 'Active' || status == 'Suspended')) {
    return false;
  }
  if (withTransaction) {
    try {
      await session.withTransaction(async () => {
        await Product.updateMany(
          { farmer: farmerId },
          { farmerAvailable: status == 'Active' },
          { session: session }
        );
        await User.findByIdAndUpdate(
          farmerId,
          {
            'farmer.finStatus': status,
          },
          { session: session }
        );
      });
      return true;
    } catch (err) {
      console.log(err);
      return false;
    }
  }
  try {
    await Product.updateMany(
      { farmer: farmerId },
      { farmerAvailable: status == 'Active' },
      { session: session }
    );
    await User.findByIdAndUpdate(
      farmerId,
      {
        'farmer.finStatus': status,
      },
      { session: session }
    );
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
};

exports.getPayoutRequests = async (req, res, next) => {
  try {
    const payoutRequests = await PayoutRequest.find({ farmerId: req.user._id });
    const data = [];
    for (request of payoutRequests) {
      const bank = (await Bank.findById(request.account.Bank)).BankName;
      const accountNumber =
        request.account.AccountNumber.slice(0, -4).replace(/./g, '*') +
        request.account.AccountNumber.slice(-4);
      data.push({
        id: request._id,
        amount: request.amount,
        created: request.update.created
          ? moment(request.update.created).format('DD-MM-YYYY')
          : null,
        acknowledged: request.update.acknowledged
          ? moment(request.update.acknowledged).format('DD-MM-YYYY')
          : null,
        cleared: request.update.cleared
          ? moment(request.update.cleared).format('DD-MM-YYYY')
          : null,
        rejected: request.update.rejected
          ? moment(request.update.rejected).format('DD-MM-YYYY')
          : null,
        rejectionReason: request.rejectionReason,
        payRef: request.payRef,
        bank: bank,
        bankAccountName: request.account.AccountName,
        bankAccountNum: accountNumber,
      });
    }
    res.status(200).json({ message: 'Success', payoutRequests: data });
  } catch (err) {
    logger(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
};
exports.getInvoices = async (req, res, next) => {
  try {
    const invoices = await FarmerMonthInvoice.find({
      farmerId: req.user._id,
      status:'Closed',
    }).sort({ _id: -1 });
    const data = [];
    for (let invoice of invoices) {
      data.push({
        id: invoice.invoiceId,
        month: invoice.date.month,
        year: invoice.date.year,
      });
    }
    res.status(200).json({ message: 'Success', invoices: data });
  } catch (err) {
    logger(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
};
