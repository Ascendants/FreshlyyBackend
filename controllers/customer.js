const Product = require('../models/Product');
const { validationResult } = require('express-validator');
const { logger } = require('../util/logger');
const User = require('../models/User');
const Order = require('../models/Order');
const mongoose = require('mongoose');
const moment = require('moment');
const { ObjectId } = require('mongodb');
const cron = require('node-cron');
const cardTypes = {
  visa: /^4[0-9]{12}(?:[0-9]{3})?$/,
  master:
    /^(5[1-5][0-9]{14}|2(22[1-9][0-9]{12}|2[3-9][0-9]{13}|[3-6][0-9]{14}|7[0-1][0-9]{13}|720[0-9]{12}))$/,
  amex: /^3[47][0-9]{13}$/,
};

const cancelOrder = async (orderId) => {
  if (!orderId) {
    return { status: 422, message: 'Validation Error' };
  }
  const stripe = require('stripe')(process.env.STRIPE_SECRET);
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const order = await Order.findById(orderId);
    if (!order) {
      return { status: 404, message: 'Order not found' };
    }
    if (order.orderUpdate.processed != null) {
      return { status: 403, message: 'Not possible to cancel at this moment' };
    }
    if (order.orderUpdate.cancelled != null) {
      return { status: 403, message: 'Already Cancelled' };
    }
    if (order.orderUpdate.failed != null) {
      return { status: 403, message: 'Failed Order. No need to cancel.' };
    }
    for (item of order.items) {
      const result = await Product.findOneAndUpdate(
        {
          _id: item.itemId,
        },
        {
          $inc: { qtyAvailable: item.qty },
        },
        { new: true, session: session }
      );
      if (!result) {
        throw new Error('Failed to update product quantity');
      }
    }
    for (let i in order.payment) {
      if (order.payment[i].status == 'Failed') {
        continue;
      }
      if (order.payment[i].type == 'Coupon') {
        //coupon management
      } else if (order.payment[i].type == 'COD') {
        order.payment[i].status = 'Refunded';
      } else if (order.payment[i].type == 'Card') {
        let refund;
        try {
          refund = await stripe.refunds.create({
            payment_intent: order.payment[i].payRef,
          });
        } catch (error) {
          logger(error);
        }
        if (refund?.status == 'succeeded') {
          order.payment[i].status = 'Refunded';
        } else {
          //notify admin of the failed refund and ask to do manually
        }
      }
    }
    order.orderUpdate.cancelled = Date.now();
    await order.save({ session: session });
    await session.commitTransaction();
    return { status: 200, message: 'Success' };
  } catch (error) {
    await session.abortTransaction();
    return { status: 500, message: error.message };
  }
};
exports.cancelOrder = cancelOrder;
exports.getDashboard = async (req, res, next) => {
  const user = {
    fname: req.user.fname,
    lname: req.user.lname,
    email: req.user.email,
    profilePicUrl: req.user.profilePicUrl,
  };
  const toPay = await Order.countDocuments({
    customer: req.user._id,
    'orderUpdate.payment': null,
    'orderUpdate.cancelled': { $eq: null },
    'orderUpdate.failed': { $eq: null },
  });
  const toProcess = await Order.countDocuments({
    customer: req.user._id,
    'orderUpdate.failed': { $eq: null },
    'orderUpdate.cancelled': { $eq: null },
    'orderUpdate.payment': { $ne: null },
    'orderUpdate.processed': null,
  });
  const toShip = await Order.countDocuments({
    customer: req.user._id,
    'orderUpdate.failed': { $eq: null },
    'orderUpdate.cancelled': { $eq: null },
    'orderUpdate.payment': { $ne: null },
    'orderUpdate.processed': { $ne: null },
    'orderUpdate.shipped': null,
    isDelivery: true,
  });
  const toReceive = await Order.countDocuments({
    customer: req.user._id,
    'orderUpdate.failed': { $eq: null },
    'orderUpdate.cancelled': { $eq: null },
    'orderUpdate.payment': { $ne: null },
    'orderUpdate.processed': { $ne: null },
    'orderUpdate.shipped': { $ne: null },
    'orderUpdate.delivered': null,
  });
  const toPickup = await Order.countDocuments({
    customer: req.user._id,
    'orderUpdate.failed': { $eq: null },
    'orderUpdate.cancelled': { $eq: null },
    'orderUpdate.payment': { $ne: null },
    'orderUpdate.processed': { $ne: null },
    'orderUpdate.pickedUp': null,
    isDelivery: false,
  });
  const toReview = await Order.countDocuments({
    $or: [
      {
        customer: req.user._id,
        farmerRating: -1,
        deliveryRating: -1,
        'orderUpdate.delivered': { $ne: null },
        'orderUpdate.failed': { $eq: null },
        'orderUpdate.cancelled': { $eq: null },
      },
      {
        customer: req.user._id,
        farmerRating: -1,
        'orderUpdate.pickedUp': { $ne: null },
        'orderUpdate.failed': { $eq: null },
        'orderUpdate.cancelled': { $eq: null },
      },
    ],
  });
  const all = await Order.countDocuments({
    customer: req.user._id,
    'orderUpdate.failed': { $eq: null },
    'orderUpdate.cancelled': { $eq: null },
  });
  res.status(200).json({
    message: 'Success',
    user: user,
    toPay: toPay,
    toProcess: toProcess,
    toShip: toShip,
    toReceive: toReceive,
    toPickup: toPickup,
    all: all,
    toReview: toReview,
  });
};

exports.postOrder = async (req, res, next) => {
  const deliveryCharges = req.body.deliveryCharges; //retrieves what orders the customer wants to get delivered
  const session = await mongoose.startSession();
  if (!deliveryCharges) {
    res.status(400).json({ message: 'Bad Request' });
    return;
  }
  try {
    session.startTransaction(); //uses mongoose transactions to roll back anytime an error occurs
    const cart = req.user.customer.cart; // retrieve cart from customer document
    const isEveryFarmerThere = deliveryCharges.every((item) => {
      return cart.find(
        (cartItem) => ObjectId(cartItem.farmer).toString() == item.farmer
      );
    });
    if (!isEveryFarmerThere) {
      throw new Error('Validation Error');
    }
    //validate if the client has correctly marked all the farmer orders' delivery preference
    const orders = [];
    for (let farmerItem of cart) {
      //for every farmer in cart
      const isDelivery = deliveryCharges.find(
        (item) => item.farmer == ObjectId(farmerItem.farmer).toString()
      ).delivery;

      const order = new Order({
        farmer: farmerItem.farmer,
        customer: ObjectId(req.user),
        isDelivery: isDelivery,
      });
      order.totalDeliveryCharge = 0;
      if (isDelivery) {
        order.deliveryDistance = farmerItem.distance;
        order.deliveryCostPerKM = farmerItem.costPerKM;
        order.deliveryLocation = null;
        order.totalDeliveryCharge = farmerItem.distance * farmerItem.costPerKM;
        order.deliveryRating = -1;
      }

      let total = 0;
      for (let cartItem of farmerItem.items) {
        //for every item in cart for a particular farmer
        const result = await Product.findOneAndUpdate(
          {
            _id: cartItem.item,
            qtyAvailable: { $gte: cartItem.qty },
            status: 'Live',
          },
          //filter order item and validate if the quantity is available and whether the produce listing is live

          {
            $inc: { qtyAvailable: cartItem.qty * -1 },
          },
          { new: true, session: session }
        );
        if (!result) {
          throw new Error('Not Available');
          //if one of them fails, abort the transaction by throwing an error
        }
        order.items.push({
          itemId: ObjectId(result),
          qty: cartItem.qty,
          uPrice: result.price,
        });
        total += cartItem.qty * result.price;
      }
      order.totalPrice = total;
      order.commission = total * req.config.siteCommission;
      order.farmerName = (await User.findById(farmerItem.farmer)).fname;
      await order.save({ session });
      orders.push(order);
    }
    //remember to clear the cart in production
    session.commitTransaction(); //change this to commit
    res.status(200).json({ message: 'Success', orderDetails: orders });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: error.message });
    logger(error);
    return;
  }
};

exports.postPickupOrder = async (req, res, next) => {
  const orderId = req.params?.orderId;
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (order.orderUpdate.processed == null) {
      return res
        .status(403)
        .json({ message: 'Not possible pickup at this moment' });
    }
    if (order.isDelivery != false) {
      return res.status(403).json({ message: 'This order will be delivered' });
    }
    order.orderUpdate.pickedUp = Date.now();
    order.save();
    return res.status(200).json({ message: 'Success' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.postCancelOrder = async (req, res, next) => {
  const orderId = req.params?.orderId;
  const { status, message } = await cancelOrder(orderId);
  return res.status(status).json({ message: message });
};

exports.postPayment = async (req, res, next) => {
  const payFrom = req.body.payFrom;
  const orders = req.body.orders;
  const saveCard = req.body.saveCard;
  const session = await mongoose.startSession();
  if (!payFrom || !orders || !Array.isArray(orders)) {
    res.status(400).json({ message: 'Bad Request' });
    return;
  }

  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET);
    session.startTransaction(); //uses mongoose transactions to roll back anytime an error occurs
    for (let orderId of orders) {
      const order = await Order.findById(orderId).session(session);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      if (order.orderUpdate.payment != null) {
        return res.status(403).json({ message: 'Already Paid' });
      }
      let total = order.totalPrice + order.totalDeliveryCharge;
      let totalPaid = 0;
      for (pay in order.payment) {
        if (pay.status == 'Success') totalPaid += pay.amount;
      }
      const totalToPay = total - totalPaid; //get outstanding balance to be paid
      if (payFrom == 'cod') {
        order.payment.push({
          type: 'COD',
          status: 'Success',
          amount: totalToPay,
        });
        order.orderUpdate.payment = new Date();
      } else {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: totalToPay * 100,
          currency: 'lkr',
          customer: req.user.stripeId,
          confirm: true,
          payment_method: payFrom,
        });
        order.payment.push({
          type: 'Card',
          status: 'Success',
          amount: totalToPay,
          payRef: paymentIntent.id,
        });
        order.orderUpdate.payment = new Date();
      }
      await order.save({ session });
    }
    if (!saveCard) {
      await stripe.paymentMethods.detach(payFrom);
    }
    session.commitTransaction(); //change this to commit
    res.status(200).json({ message: 'Success', orderDetails: orders });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: error.message });
    logger(error);
    return;
  }
};

exports.getPaymentIntent = async (req, res, next) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 100000,
      currency: 'lkr',
    });
    const clientSecret = paymentIntent.client_secret;
    res.status(200).json({ message: 'Success', clientSecret: clientSecret });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
    logger(error);
    return;
  }
};

exports.getCardSetupIntent = async (req, res, next) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET);
    const setupIntent = await stripe.setupIntents.create({
      customer: req.user.stripeId,
    });
    res.json({
      message: 'Success',
      id: setupIntent.id,
      clientSecret: setupIntent.client_secret,
      customer: req.user.stripeId,
    });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
    logger(error);
    return;
  }
};

exports.getCreateStripeCustomer = async (req, res, next) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET);
    const customer = await stripe.customers.create({ email: req.user.email });
    req.user.stripeId = customer.id;
    await req.user.save();
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
    logger(error);
    return;
  }
};

exports.getCreateStripeAccount = async (req, res, next) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET);

    const account = await stripe.accounts.create({
      type: 'express',
      country: 'LK',
      email: 'haritha@hasathcharu.com',
    });
    req.user.stripeId = account.id;
    await req.user.save();
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
    logger(error);
    return;
  }
};

exports.getCart = async (req, res, next) => {
  //needs to be edited when adding cart management
  const cart = req.user.customer.cart.toObject();
  if (!cart) {
    res.status(200).json({ message: 'Success', cart: null });
  }
  try {
    for (let farmerItem of cart) {
      const farmer = await User.findById(farmerItem.farmer);
      farmerItem.farmerName = farmer.fname;
      for (let cartItem of farmerItem.items) {
        const product = await Product.findOne({
          _id: cartItem.item,
        });
        cartItem.imageUri = product.imageUrls[0];
        cartItem.title = product.title;
        cartItem.uPrice = product.price;
        cartItem.farmerName = farmer.fname;
      }
    }
    res.status(200).json({ message: 'Success', cart: cart });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
    logger(error);
    return;
  }
};

exports.getCards = async (req, res, next) => {
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
    res.status(200).json({ message: 'Success', cards: cards });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
    logger(error);
    return;
  }
};

exports.deleteRemoveCard = async (req, res, next) => {
  const cardId = req.params.cardId;
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET);

    const paymentMethod = await stripe.paymentMethods.detach(cardId);
    res.status(200).json({ message: 'Success' });
  } catch (error) {
    res.status(500).json({ message: error.message });
    logger(error);
    return;
  }
};

exports.postEditCard = async (req, res, next) => {
  const cardId = req.params.cardId;
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(422).json({ message: 'Vaildation Error' });
  const { Nickname } = req.body;
  try {
    req.user.customer.paymentMethods.forEach((card) => {
      if (card._id == cardId) {
        card.CardName = Nickname;
      }
    });
    await req.user.save();
    res.status(200).json({ message: 'Success' });
  } catch (error) {
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
      customer: req.user._id,
    });
    if (!order) {
      throw new Error('Order Not Found');
    }

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
    if (error.message == 'Order Not Found') {
      res.status(404).json({ message: error.message });
      return;
    }
    res.status(500).json({ message: error.message });
    return;
  }
};

exports.getOrders = async (req, res, next) => {
  const type = req.params.type;
  if (!type) {
    return res.status(422).json({ message: 'Vaildation Error' });
  }
  try {
    let orders;

    switch (type) {
      case 'all':
        orders = await Order.find({
          'orderUpdate.failed': { $eq: null },
          'orderUpdate.cancelled': { $eq: null },
          customer: req.user._id,
        }).sort({ _id: -1 });
        break;
      case 'to-pay':
        orders = await Order.find({
          'orderUpdate.failed': { $eq: null },
          'orderUpdate.payment': null,
          'orderUpdate.cancelled': { $eq: null },
          customer: req.user._id,
        }).sort({ _id: -1 });
        break;
      case 'processing':
        orders = await Order.find({
          'orderUpdate.payment': { $ne: null },
          'orderUpdate.processed': null,
          'orderUpdate.cancelled': null,
          'orderUpdate.failed': null,
          customer: req.user._id,
        }).sort({ _id: -1 });
        break;
      case 'to-pickup':
        orders = await Order.find({
          'orderUpdate.failed': { $eq: null },
          'orderUpdate.payment': { $ne: null },
          'orderUpdate.processed': { $ne: null },
          'orderUpdate.pickedUp': null,
          'orderUpdate.cancelled': { $eq: null },
          isDelivery: false,
          customer: req.user._id,
        }).sort({ _id: -1 });
        break;
      case 'shipped':
        orders = await Order.find({
          customer: req.user._id,
          'orderUpdate.failed': { $eq: null },
          'orderUpdate.payment': { $ne: null },
          'orderUpdate.processed': { $ne: null },
          'orderUpdate.shipped': { $ne: null },
          'orderUpdate.delivered': null,
          'orderUpdate.cancelled': { $eq: null },
        }).sort({ _id: -1 });
        break;
      case 'to-review':
        orders = await Order.find({
          $or: [
            {
              customer: req.user._id,
              farmerRating: -1,
              deliveryRating: -1,
              'orderUpdate.delivered': { $ne: null },
              'orderUpdate.failed': { $eq: null },
              'orderUpdate.cancelled': { $eq: null },
            },
            {
              customer: req.user._id,
              farmerRating: -1,
              'orderUpdate.pickedUp': { $ne: null },
              'orderUpdate.failed': { $eq: null },
              'orderUpdate.cancelled': { $eq: null },
            },
          ],
        }).sort({ _id: -1 });
        break;
      case 'completed':
        orders = await Order.find({
          customer: req.user._id,
          farmerRating: { $ne: -1 },
          deliveryRating: { $ne: -1 },
          'orderUpdate.failed': { $eq: null },
          'orderUpdate.cancelled': { $eq: null },
        }).sort({ _id: -1 });
        break;
      case 'cancelled':
        orders = await Order.find({
          'orderUpdate.failed': { $eq: null },
          'orderUpdate.cancelled': { $ne: null },
          customer: req.user._id,
        }).sort({ 'orderUpdate.cancelled': -1 });
        break;
      default:
        orders = await Order.find({
          'orderUpdate.failed': { $eq: null },
          customer: req.user._id,
        }).sort({ _id: -1 });
        break;
    }

    if (!orders) {
      throw new Error('No Orders');
    }
    let orderData = [];
    orders.forEach((order) => {
      let status = 'to-pay';
      if (order.orderUpdate.cancelled) {
        status = 'cancelled';
      } else if (!order.orderUpdate.payment) {
        status = 'to-pay';
      } else if (
        !order.orderUpdate.processed ||
        (order.orderUpdate.processed &&
          order.isDelivery &&
          !order.orderUpdate.shipped)
      ) {
        status = 'processing';
      } else if (order.orderUpdate.shipped && !order.orderUpdate.delivered) {
        status = 'shipped';
      } else if (!order.orderUpdate.pickedUp && !order.isDelivery) {
        status = 'to-pickup';
      } else if (
        (order.orderUpdate.delivered || order.orderUpdate.pickedUp) &&
        order.farmerRating == -1
      ) {
        status = 'to-review';
      } else if (order.farmerRating != -1) {
        status = 'completed';
      }
      orderData.push({
        farmerName: order.farmerName,
        orderId: order._id,
        orderPlaced: order.orderUpdate.placed
          ? moment(order.orderUpdate.placed).format('YYYY-MM-DD')
          : null,
        orderPaid: order.orderUpdate.payment
          ? moment(order.orderUpdate.payment).format('YYYY-MM-DD')
          : null,
        orderCancelled: order.orderUpdate.cancelled
          ? moment(order.orderUpdate.cancelled).format('YYYY-MM-DD')
          : null,
        orderTotal: order.totalPrice + order.totalDeliveryCharge,
        status: status,
      });
    });
    res.status(200).json({ message: 'Success', orders: orderData });
  } catch (error) {
    logger(error);
    if (error.message == 'No Orders') {
      res.status(404).json({ message: error.message });
      return;
    }
    res.status(500).json({ message: error.message });
    return;
  }
};
