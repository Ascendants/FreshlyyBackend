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
const Notification = require('../models/Notification');
const FarmerPayment = require('../models/FarmerPayment');

const { validationResult } = require('express-validator');
const FarmerMonthInvoice = require('../models/FarmerMonthInvoice');

exports.getHello = async (req, res, next) => {
  console.log('Hello');
  res.status(200).json({ message: 'Hello' });
};

//Geting all the farmer's dashboard data
// exports.getDashboard = async (req, res, next) => {
// const data = {
// 	fname: 'Nadun',
// 	lname: 'Fernando',
// 	imageUrl:
// 		'https://firebasestorage.googleapis.com/v0/b/freshlyyimagestore.appspot.com/o/UserImages%2Fkom.jpg?alt=media&token=49a88f0c-ab79-4d84-8ddb-ada16a2b0101',
// };
// const orders = await Order.find({ farmer: req.user._id }); //gives all orders belonging to farmer;
// const products = await Product.find({ farmer: req.user._id });
// res.status(200).json({ message: 'Success', user: req.user });

// };

exports.getDashboard = async (req, res, next) => {
  const liveProducts = await Product.countDocuments({
    farmer: req.user._id,
    status: 'Live',
  });
  const pendingProducts = await Product.countDocuments({
    farmer: req.user._id,
    status: 'Quarantined',
  });

  const pastOrders = await Order.countDocuments({
    farmer: req.user._id,
    'orderUpdate.closed': { $ne: null },
  });
  const newOrders = await Order.countDocuments({
    farmer: req.user._id,
    $or: [
      { 'orderUpdate.processed': { $ne: null } },
      { 'orderUpdate.shipped': { $ne: null } },
      { 'orderUpdate.delivered': { $ne: null } },
      { 'orderUpdate.pickedUp': { $ne: null } },
      { 'orderUpdate.cancelled': { $ne: null } },
      { 'orderUpdate.failed': { $ne: null } },
      { 'orderUpdate.closed': { $ne: null } },
    ],
    'orderUpdate.placed': { $ne: null },
    'orderUpdate.payment': { $ne: null },
  });

  // console.log(newOrders);
  res
    .status(200)
    .json({
      message: 'Success',
      user: req.user,
      liveProducts,
      pendingProducts,
      pastOrders,
      newOrders,
    });
};

exports.insertProduct = async (req, res, next) => {
  const { price, qtyAvailable, description, title, minQtyIncrement, images } =
    req.body;
  if (images?.length === 0) {
    return res.status(400).json({ message: 'Please upload atleast one image' });
  }
  const newProduct = new Product({
    title: title,
    status: 'Paused',
    description: description,
    price: price,
    overallRating: 3,
    minQtyIncrement: minQtyIncrement,
    unit: 'KG',
    farmer: req.user._id,
    qtyAvailable: qtyAvailable,
    imageUrls: images,
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
    const productId = req.params.productId;
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

exports.updateProductDetails = async (req, res, next) => {
  const user = await User.findOne({ email: req.user._id });
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
  const { name, number, issue, desc, email, orderId } = req.body;
  const userEmail = req.user.email;

  const newSupportTicket = new SupportTicket({
    userEmail: userEmail,
    name: name,
    number: number,
    issue: issue,
    description: desc,
    email: email,
    orderId: orderId,
  });

  newSupportTicket.save((err, ticket) => {
    if (err) {
      console.log(err);
      res.status(500).json({ message: 'Can not save data', error: err });
    } else {
      console.log('success');
      res.status(200).json({ message: 'Success', id: ticket._id });
    }
  });
};

exports.getSupportTicket = async (req, res) => {
  const ticketId = req.params.id;
  console.log(ticketId);
  try {
    const supportTicket = await SupportTicket.findById(ticketId);
    res.status(200).json({ message: 'Success', supportTicket: supportTicket });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: 'Error fetching supportTicket from database' });
  }
};

exports.getSupportTickets = async (req, res) => {
  try {
    const supportTickets = await SupportTicket.find({});
    res.status(200).json({ message: 'Success', supportTicket: supportTickets });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: 'Error fetching supportTickets from database' });
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
  console.log('hello');
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

exports.verifyCouponCode = async (req, res, next) => {
  console.log('hiii');
  const cCode = req.body.cCode;
  console.log(cCode);
  try {
    const coupon = await Coupon.find({ cCode: cCode });
    // console.log(coupon);
    if (coupon.length > 0) {
      res.status(200).json({
        message: 'Code is already in the database',
        cCode: cCode,
        isExist: true,
      });
    } else {
      res
        .status(200)
        .json({ message: 'Code is unique', cCode: cCode, isExist: false });
    }
  } catch (error) {
    console.log(error);
  }
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
    const payoutRequests = await PayoutRequest.find({
      farmerId: req.user._id,
    }).sort({ _id: -1 });
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
      status: 'Closed',
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

exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({
      user: req.user._id,
      customer: false,
    }).sort({ _id: -1 });
    const data = [];
    for (let notification of notifications) {
      data.push({
        id: notification._id,
        title: notification.title,
        body: notification.body,
        created: moment(notification.update.created).format('DD-MM-YYYY'),
        read: notification.read,
      });
      if (notification.read == null) {
        notification.read = Date.now();
      }
      notification.save();
    }
    res.status(200).json({ message: 'Success', notifications: data });
  } catch (err) {
    logger(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
};

exports.getInvoice = async (req, res, next) => {
  try {
    const invoice = await FarmerMonthInvoice.findOne({
      invoiceId: req.params.invoiceId,
      status: 'Closed',
    }).sort({ _id: -1 });
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    const invoiceData = {
      invoiceId: invoice.invoiceId,
      farmerAddress: invoice.farmerAddress,
      farmerName: invoice.farmerName,
      farmerEmail: invoice.farmerEmail,
      cashInHand: invoice.cashInHand || 0,
      commissionAmount: invoice.commissionAmount || 0,
      farmerId: invoice.farmerId,
      totalEarnings: invoice.totalEarnings || 0,
      couponCharges: invoice.couponCharges || 0,
      date: moment(
        invoice.date.month + 1 + '/' + invoice.date.year,
        'MM/YYYY'
      ).format('MMMM YYYY'),
      orders: [],
    };
    for (let orderId of invoice.orders) {
      const order = await Order.findById(orderId);
      invoiceData.orders.push({
        id: order._id,
        date: moment(order.orderUpdate.placed).format('DD-MM-YYYY'),
        nItems: order.items.length,
        subTotal: order.totalPrice,
        deliveryCharge: order.totalDeliveryCharge,
        total: order.totalPrice + order.totalDeliveryCharge,
        commission: order.commission,
      });
    }
    res.status(200).json({ message: 'Success', invoice: invoiceData });
  } catch (err) {
    logger(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
};

exports.postSettlementIntent = async (req, res, next) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET);
    const paymentMethods = await stripe.paymentMethods.list({
      customer: req.user.stripeId,
      type: 'card',
    });
    const cards = [];
    paymentMethods.data.forEach((method) => {
      const brand =
        method.card.brand.charAt(0).toUpperCase() + method.card.brand.slice(1);
      let cardNo = '**** **** **** ' + method.card.last4;
      if (brand == 'Amex') {
        cardNo = '**** ****** *' + method.card.last4;
      }
      cards.push({
        cardId: method.id,
        cardName: brand + ' ' + method.card.last4,
        cardNo: cardNo,
        cardType: brand,
        cardExp: method.card.exp_month + '/' + (method.card.exp_year % 2000),
      });
    });
    const farmerPayment = new FarmerPayment({
      farmerId: req.user._id,
      amount: req.user.farmer.withdrawable * -1,
      farmerName: req.user.fname + ' ' + req.user.lname,
      farmerEmail: req.user.email,
      farmerAddress: req.user.bAddress,
    });
    await farmerPayment.save();
    res.status(200).json({
      message: 'Success',
      settlementIntent: {
        id: farmerPayment._id,
        amount: farmerPayment.amount,
      },
      cards: cards,
    });
  } catch (err) {
    logger(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
};

exports.postSettleAccount = async (req, res, next) => {
  const payFrom = req.body.payFrom;
  const saveCard = req.body.saveCard;
  const farmerPaymentId = req.body.farmerPayment;
  const session = await mongoose.startSession();
  if (!payFrom || !farmerPaymentId) {
    res.status(400).json({ message: 'Bad Request' });
    return;
  }

  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET);
    session.startTransaction(); //uses mongoose transactions to roll back anytime an error occurs
    const farmerPayment = await FarmerPayment.findOne({
      _id: farmerPaymentId,
      status: 'Pending',
      paymentDate: null,
    }).session(session);
    if (!farmerPayment) {
      throw new Error('Invalid farmer payment');
    }
    const paymentIntent = await stripe.paymentIntents.create({
      amount: farmerPayment.amount * 100,
      currency: 'lkr',
      customer: req.user.stripeId,
      confirm: true,
      payment_method: payFrom,
    });
    farmerPayment.paymentDate = Date.now();
    farmerPayment.status = 'Success';
    farmerPayment.payRef = paymentIntent.id;

    await farmerPayment.save({ session });
    if (!saveCard) {
      await stripe.paymentMethods.detach(payFrom);
    }
    req.user.farmer.withdrawable += farmerPayment.amount;
    await req.user.save({ session });
    await session.commitTransaction();
    res.status(200).json({ message: 'Success' });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: error.message });
    logger(error);
    return;
  }
};
exports.getOrderDetails = async (req, res, next) => {
  const orderId = req.params.orderId;
  try {
    const order = await Order.findOne({
      _id: orderId,
      'orderUpdate.failed': { $eq: null },
      farmer: req.user._id,
    });
    if (!order) {
      throw new Error('Order Not Found');
    }

    const orderData = order.toObject();
    const customer = await User.findById(orderData.customer);
    orderData['customerName'] = customer.fname + ' ' + customer.lname;
    for (item in orderData.items) {
      const itemData = await Product.findById(orderData.items[item].itemId);

      orderData.items[item] = {
        ...orderData.items[item],
        imageUri: itemData.imageUrls[0],
        title: itemData.title,
      };
    }
    res.status(200).json({ message: 'Success', order: orderData });
  } catch (error) {
    logger(error);
    if (error.message == 'Order Not Found') {
      res.status(404).json({ message: error.message });
      return;
    }
    res.status(500).json({ message: error.message });
    return;
  }
};
exports.postUpdateOrderStatus = async (req, res, next) => {
  const orderId = req.params.orderId;
  try {
    const order = await Order.findOne({
      _id: orderId,
      'orderUpdate.failed': { $eq: null },
      'orderUpdate.cancelled': { $eq: null },
      farmer: req.user._id,
    });
    if (!order) {
      throw new Error('Order Not Found');
    }
    const status = req.body.status;
    if (order.orderUpdate.cancelled) {
      throw new Error('Order Cancelled');
    }
    if (!order.orderUpdate.payment) {
      throw new Error('Order Not Paid');
    }
    switch (status) {
      case 'processed':
        if (order.orderUpdate.processed) {
          throw new Error('Order Already Processed');
        }
        order.orderUpdate.processed = Date.now();
        break;
      case 'shipped':
        if (order.orderUpdate.shipped) {
          throw new Error('Order Already Shipped');
        }
        order.orderUpdate.shipped = Date.now();
        break;
      case 'delivered':
        if (order.orderUpdate.delivered) {
          throw new Error('Order Already Delivered');
        }
        order.orderUpdate.delivered = Date.now();
        break;
    }
    await order.save();
    const orderData = order.toObject();
    for (item in orderData.items) {
      const itemData = await Product.findById(orderData.items[item].itemId);

      orderData.items[item] = {
        ...orderData.items[item],
        imageUri: itemData.imageUrls[0],
        title: itemData.title,
      };
    }
    res.status(200).json({ message: 'Success', order: orderData });
  } catch (error) {
    logger(error);
    res.status(500).json({ message: error.message });
    return;
  }
};
