const Product = require('../models/Product');
const { validationResult } = require('express-validator');
const { logger } = require('../util/logger');
const User = require('../models/User');
const Order = require('../models/Order');
const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const cardTypes = {
  visa: /^4[0-9]{12}(?:[0-9]{3})?$/,
  master:
    /^(5[1-5][0-9]{14}|2(22[1-9][0-9]{12}|2[3-9][0-9]{13}|[3-6][0-9]{14}|7[0-1][0-9]{13}|720[0-9]{12}))$/,
  amex: /^3[47][0-9]{13}$/,
};
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
  });
  const toProcess = await Order.countDocuments({
    customer: req.user._id,
    'orderUpdate.payment': { $ne: null },
    'orderUpdate.processed': null,
  });
  const toShip = await Order.countDocuments({
    customer: req.user._id,
    'orderUpdate.payment': { $ne: null },
    'orderUpdate.processed': { $ne: null },
    'orderUpdate.shipped': null,
    isDelivery: true,
  });
  const toReceive = await Order.countDocuments({
    customer: req.user._id,
    'orderUpdate.payment': { $ne: null },
    'orderUpdate.processed': { $ne: null },
    'orderUpdate.shipped': { $ne: null },
    'orderUpdate.delivered': null,
  });
  const toPickup = await Order.countDocuments({
    customer: req.user._id,
    'orderUpdate.payment': { $ne: null },
    'orderUpdate.processed': { $ne: null },
    'orderUpdate.pickedUp': null,
    isDelivery: false,
  });
  const toReview =
    (await Order.countDocuments({
      customer: req.user._id,
      farmerRating: -1,
      deliveryRating: -1,
      'orderUpdate.pickedUp': { $ne: null },
    })) +
    (await Order.countDocuments({
      customer: req.user._id,
      farmerRating: -1,
      deliveryRating: -1,
      'orderUpdate.delivered': { $ne: null },
    }));
  const all = await Order.countDocuments({
    customer: req.user._id,
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
          commission: result.price * req.config.siteCommission,
        });
        total += cartItem.qty * result.price;
      }
      order.totalPrice = total;
      order.farmerName = (await User.findById(farmerItem.farmer)).fname;
      await order.save({ session });
      orders.push(order);
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

exports.postPayment = async (req, res, next) => {
  const payFrom = req.body.payFrom; //retrieves what orders the customer wants to get delivered
  const orders = req.body.orders;
  const cvv = req.body.cvv;
  const session = await mongoose.startSession();
  if (!payFrom || !orders || !Array.isArray(orders)) {
    res.status(400).json({ message: 'Bad Request' });
    return;
  }
  if (payFrom != 'cod' && !cvv) {
    res.status(400).json({ message: 'Missing CVV' });
    return;
  }

  try {
    session.startTransaction(); //uses mongoose transactions to roll back anytime an error occurs
    for (let orderId of orders) {
      const order = await Order.findById(orderId).session(session);
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
      } else {
        //code for payment gateway...
        console.log('Make payment gateway api call');
      }
      order.orderUpdate.payment = new Date();
      await order.save({ session });
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
  const cards = req.user.customer.paymentMethods.filter(
    (item) => item.Status == 'Active'
  );
  if (!cards) {
    res.status(200).json({ message: 'Success', cards: null });
  }
  const cardIds = [];
  try {
    for (let card in cards) {
      cardIds.push({
        cardName: cards[card].CardName,
        cardId: cards[card]._id,
        cardNo: cards[card].CardNo.replace(
          cards[card].CardNo.substring(4, 12),
          '********'
        )
          .match(/.{1,4}/g)
          .join(' '),
        cardExp: cards[card].ExpiryDate,
        cardType: cards[card].CardType,
      });
    }
    res.status(200).json({ message: 'Success', cards: cardIds });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
    logger(error);
    return;
  }
};

exports.postSaveCard = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(422).json({ message: 'Vaildation Error' });
  const { CardNumber, Nickname, CardHolderName, CVV, ExpiryDate } = req.body;
  let cardType = 'Amex';
  if (cardTypes.visa.test(CardNumber)) {
    cardType = 'Visa';
  } else if (cardTypes.master.test(CardNumber)) {
    cardType = 'Master';
  }
  try {
    req.user.customer.paymentMethods.push({
      CardNo: CardNumber,
      CardHolderName: CardHolderName,
      ExpiryDate: ExpiryDate,
      CardName: Nickname,
      CardType: cardType,
    });
    await req.user.save();
    res.status(200).json({ message: 'Success' });
  } catch (error) {
    res.status(500).json({ message: error.message });
    logger(error);
    return;
  }
};

exports.deleteRemoveCard = async (req, res, next) => {
  const cardId = req.params.cardId;
  try {
    req.user.customer.paymentMethods.forEach((card) => {
      if (card._id == cardId) {
        card.Status = 'Deleted';
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
