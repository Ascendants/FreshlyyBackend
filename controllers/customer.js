const Product = require('../models/Product');
const { validationResult } = require('express-validator');
const { logger } = require('../util/logger');
const User = require('../models/User');
const Order = require('../models/Order');
const mongoose = require('mongoose');
const moment = require('moment');
const { ObjectId } = require('mongodb');
const cron = require('node-cron');
const SupportTicket = require('../models/SupportTicket');

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

exports.postCart = async (req, res) => {
  let { productId, quantity } = req.body;
  quantity = parseFloat(quantity);
  const product = await Product.findById(productId);
  const cart = req.user.customer.cart;
  
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }
  //Check if the product is already in the cart
  let cartItem;
  cart.forEach((farmer) => {
    farmer.items.forEach((item) => {
      if (item.item == productId) {
        cartItem = item;
      }
    });
  });
  if (cartItem) {
    if (quantity < product.qtyAvailable) {
      cartItem.qty += quantity;
      req.user.save();
      return res.status(200).json({ message: 'Success' }); 
    }
    return res.status(404).json({ message: 'Quantity unavailable' });
  }
  let farmer = cart.find((farmer) => farmer.farmer == product.farmer);
  if (farmer) {
    farmer.items.push({
      item: product._id,
      qty: quantity,
    });
    req.user.save();
    return res.status(200).json({ message: 'Success' });
  }

  cart.push({
    farmer: product.farmer,
    distance: 3,
    costPerKM: 200,
    items: [
      {
        item: product._id,
        qty: quantity,
      },
    ],
  });
  console.log(req.user.customer.cart);
  req.user.save();
  return res.status(200).json({ message: 'Success' });
};

exports.getWishList = async (req, res, next) => {
  const wishList = req.user.customer.wishList.toObject();
  console.log(wishList);
  if (!wishList) {
    res.status(200).json({ message: 'Success', cart: null });
  }
  try {
    for (let farmerItem of wishList) {
      const farmer = await User.findById(farmerItem.farmer);
      farmerItem.farmerName = farmer.fname;
      for (let wishListItem of farmerItem.items) {
        const product = await Product.findOne({
          _id: wishListItem.item,
        });
        wishListItem.imageUri = product.imageUrls[0];
        wishListItem.title = product.title;
        wishListItem.uPrice = product.price;
        wishListItem.farmerName = farmer.fname;
      }
    }
    res.status(200).json({ message: 'Success', wishList: wishList });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
    logger(error);
    return;
  }
};

exports.postWishListt = async (req, res) => {
  let { productId, quantity } = req.body;
  quantity = parseFloat(quantity);
  const product = await Product.findById(productId);
  const wishList = req.user.customer.wishList;
  
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }
  //Check if the product is already in the cart
  let wishListItem;
  wishList.forEach((farmer) => {
    farmer.items.forEach((item) => {
      if (item.item == productId) {
        wishListItem = item;
      }
    });
  });
  if (wishListItem) {
    if (quantity < product.qtyAvailable) {
      cartItem.qty += quantity;
      req.user.save();
      return res.status(200).json({ message: 'Success' }); 
    }
    return res.status(404).json({ message: 'Quantity unavailable' });
  }
  let farmer = wishList.find((farmer) => farmer.farmer == product.farmer);
  if (farmer) {
    farmer.items.push({
      item: product._id,
      qty: quantity,
    });
    req.user.save();
    return res.status(200).json({ message: 'Success' });
  }

  wishList.push({
    farmer: product.farmer,
    distance: 3,
    costPerKM: 200,
    items: [
      {
        item: product._id,
        qty: quantity,
      },
    ],
  });
  console.log(req.user.customer.wishList);
  req.user.save();
  return res.status(200).json({ message: 'Success' });
};
 
// exports.removeWishlistItem = async (req, res) => {
//   const itemId = req.params.id;
//   const wishList = req.user.customer.wishList;

//   let foundItem = false;
//   wishList.forEach((farmer) => {
//     const itemIndex = farmer.items.findIndex((item) => item._id == itemId);
//     if (itemIndex !== -1) {
//       farmer.items.splice(itemIndex, 1);
//       foundItem = true;
//       return;
//     }
//   });

//   if (foundItem) {
//     req.user.save();
//     return res.status(200).json({ message: 'Success' });
//   } else {
//     return res.status(404).json({ message: 'Item not found in wishlist' });
//   }
// };  

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

// exports.getProducts = async (req, res, next) => {
//   Product.find()
//     .populate({ path: 'farmer', populate: { path: 'farmer' } })
//     .then((products) => {
//       const dataToSend = [];

//       for (let prod of products) {
//         const data = {};
//         data['_id'] = prod._id;
//         data['title'] = prod.title;
//         data['imageUrl'] = prod.imageUrls[0];
//         data['price'] = prod.price;
//         data['overallRating'] = prod.overallRating;
//         data['unit'] = prod.unit;
//         data['farmer'] = prod.farmer;
//         data['description'] = prod.description;
//         data['likes'] = prod.likes;
//         dataToSend.push(data);
//       }

//       res.status(200).send({ message: 'success', products: dataToSend });
//     })
//     .catch((err) => {
//       res.status(500).send(err);
//     });
// };

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
        });
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

// exports.getProducts = async (req, res, next) => {
//   Product.find().populate({ path: 'farmer', populate: { path: 'farmer' } })
//     .then((products) => {
//       const dataToSend = [];

//       for (let prod of products) {
//         const data = {};
//         data['_id'] = prod._id;
//         data['title'] = prod.title;
//         data['imageUrl'] = prod.imageUrls[0];
//         data['price'] = prod.price;
//         data['overallRating'] = prod.overallRating;
//         data['unit'] = prod.unit;
//         data['farmer'] = prod.farmer;
//         data['description'] = prod.description;
//         data['likes'] = prod.likes;
//         dataToSend.push(data);
//       }

//       res.status(200).send({ message: 'success', products: dataToSend });
//     })
//     .catch((err) => {
//       res.status(500).send(err);
//     });
// };

exports.postLike = async (req, res, next) => {
  const id = req.params.productId;
  console.log(req.body.newLike);
  const { method } = req.body;
  const userEmail = req.user.email;
  const product = await Product.findById(id);
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }
  const likes = new Set(product.likes);
  if (method === 'add') {
    likes.add(userEmail);
  } else if (method === 'remove') {
    likes.delete(userEmail);
  } else {
    return res.status(400).json({ message: 'Invalid method' });
  }
  product.likes = Array.from(likes);
  await product.save();
  res.json({ message: 'Success saved the Like' });
};

exports.getProducts = async (req, res, next) => {
  const DEFAULT_QUANTITY = 1;

  function calculateTotalPrice(productPrice, deliveryCost, quantity) {
    return productPrice * quantity + deliveryCost;
  }
  try {
    const userEmail = req.user.email;
    const user = await User.findOne({ email: userEmail });
    const isFarmer = user.accessLevel === 'farmer';
    const products = await Product.find({ status: 'Live' });

    const productDetails = await Promise.all(
      products.map(async (product) => {
        const farmer = await User.findById(product.farmer);
        const farmerSaleLocation = farmer.farmer.saleLocation;
        const customerLocation = isFarmer ? null : user.customer.slctdLocation;

        let deliveryCost = 0;
        let distanceValue = 0;
        let distanceNum = 0;
        let totalPrice = 0;
        let title = product.title;
        if (farmerSaleLocation && customerLocation) {
          // console.log(farmerSaleLocation.longitude)

          try {
            const distanceResponse = await fetch(
              `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${customerLocation.latitude},${customerLocation.longitude}&destinations=${farmerSaleLocation.latitude},${farmerSaleLocation.longitude}&key=${process.env.GOOGLE_MAPS_API_KEY}`
            );
            const distanceData = await distanceResponse.json();
            // console.log(distanceData)
            distanceValue = distanceData.rows[0].elements[0].distance.text;
            distanceNum = parseFloat(distanceValue.replace('Km', '').trim());
            deliveryCost = distanceNum * farmer.farmer.deliveryCharge;
            totalPrice = calculateTotalPrice(
              product.price,
              deliveryCost,
              DEFAULT_QUANTITY
            );
          } catch (err) {
            console.log(err);
          }
        }

        return {
          _id: product._id,
          price: product.price,
          title: title,
          farmerName: farmer.fname,
          imageUrl: product.imageUrls[0],
          overallRating: product.overallRating,
          unit: product.unit,
          likes: product.likes,
          deliveryCost: deliveryCost,
          distance: distanceNum,
          distanceAway: distanceValue,
          totalPrice: totalPrice,
          publicUrl: product.publicUrl,
        };
      })
    );
    // console.log(Product.aggregate([{$group:{_id:"$title",minTotPrice:{$min:"$price"}}}]))
    const result = Object.values(
      productDetails.reduce((acc, cur) => {
        if (!(cur.title in acc) || acc[cur.title].totalPrice > cur.totalPrice) {
          acc[cur.title] = cur;
        }
        return acc;
      }, {})
    ).map((obj) => ({ ...obj, cheaper: true }));

    const cheaperProductsUnsorted = productDetails.map((obj) => ({
      ...obj,
      cheaper:
        obj.totalPrice === result.find((r) => r.title === obj.title).totalPrice,
    }));
    const cheaperProducts = cheaperProductsUnsorted.filter(
      (item) => item.cheaper === true
    );
    const expensiveProducts = cheaperProductsUnsorted.filter(
      (item) => item.cheaper === false
    );
    const sortedResult = cheaperProducts.concat(expensiveProducts);

    res
      .status(200)
      .json({ message: 'Success', mainPageProducts: sortedResult });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unsuccessful' });
  }
};

exports.getSocialProducts = async (req, res, next) => {
  try {
    const userEmail = req.user.email;
    const user = await User.findOne({ email: userEmail });
    const todayDate = new Date();
    const products = await Product.find({
      status: 'Live',
      dateAdded: {
        $gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
      },
    }).sort({ dateAdded: -1 });

    const recentlyAdded = await Promise.all(
      products.map(async (product) => {
        const farmer = await User.findById(product.farmer);
        let title = product.title;
        return {
          _id: product._id,
          price: product.price,
          title: title,
          farmerName: farmer.fname,
          imageUrl: product.imageUrls[0],
          overallRating: product.overallRating,
          unit: product.unit,
          likes: product.likes,
          publicUrl: product.publicUrl,
        };
      })
    );

    const topselling = await Order.aggregate([
      {
        $unwind: '$items',
      },
      {
        $group: {
          _id: '$items.itemId',
          sum: {
            $sum: '$items.qty',
          },
        },
      },
      {
        $sort: {
          sum: -1,
        },
      },
      {
        $group: {
          _id: null,
          top_selling_products: {
            $push: '$_id',
          },
        },
      },
    ]);

    const topSellingProducts = await Promise.all(
      topselling[0].top_selling_products.map(async (item) => {
        const product = await Product.findById(item);
        const farmer = await User.findById(product.farmer);
        return {
          _id: product._id,
          price: product.price,
          title: product.title,
          farmerName: farmer.fname,
          imageUrl: product.imageUrls[0],
          overallRating: product.overallRating,
          unit: product.unit,
          likes: product.likes,
          publicUrl: product.publicUrl,
        };
      })
    );

    const likes = user.customer.following;
    const followingProducts = await Product.find({ farmer: { $in: likes } });

    const productsWithImageUrl = await Promise.all(
      followingProducts.map(async (product) => {
        const farmer = await User.findById(product.farmer);
        return {
          _id: product._id,
          price: product.price,
          title: product.title,
          farmerName: farmer.fname,
          imageUrl: product.imageUrls[0],
          overallRating: product.overallRating,
          unit: product.unit,
          likes: product.likes,
          publicUrl: product.publicUrl,
        };
      })
    );

    // const threePartIndex = Math.ceil(productsWithImageUrl.length / 3);
    // const thirdPart = productsWithImageUrl.splice(-threePartIndex);
    // const secondPart = productsWithImageUrl.splice(-threePartIndex);
    // const firstPart = productsWithImageUrl;

    const famousProducts = await Product.aggregate([
      { $match: { status: 'Live', likes: { $exists: true } } },
      {
        $project: {
          _id: 1,
          price: 1,
          farmer: 1,
          imageUrls: 1,
          overallRating: 1,
          title: 1,
          unit: 1,
          publicUrl: 1,
          likes: 1,
          likesCount: { $size: '$likes' },
        },
      },
      { $sort: { likesCount: -1 } },
    ]);

    const allFamousProducts = await Promise.all(
      famousProducts.map(async (product) => {
        const farmer = await User.findById(product.farmer);
        return {
          _id: product._id,
          price: product.price,
          title: product.title,
          farmerName: farmer.fname,
          imageUrl: product.imageUrls[0],
          overallRating: product.overallRating,
          unit: product.unit,
          likes: product.likes,
          likeCount: product.likesCount,
          publicUrl: product.publicUrl,
        };
      })
    );

    const section = [
      'Recently Added',
      'Following',
      'Top Selling Products',
      'Famous Products',
    ];
    const data = [
      recentlyAdded,
      productsWithImageUrl,
      topSellingProducts,
      allFamousProducts,
    ];
    const dataOfProducts = [];

    for (const index in section) {
      const dataP = {};
      const showSection = data[index].length > 0 ? true : false;
      dataP['title'] = section[index] == null ? null : section[index];
      dataP['data'] = data[index];
      dataP['showSection'] = showSection;
      // dataP["horizontalScroll"]=section[index]==null?false:true;
      // console.log(dataP);
      dataOfProducts.push(dataP);
    }

    res
      .status(200)
      .json({ message: 'Success', socialProducts: dataOfProducts });
  } catch (error) {
    console.log(error);
  }
};

exports.getFollowingProducts = async (req, res, next) => {
  res.send({ message: 'success' });
};

exports.getSpecificOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    // console.log(order);
    res.status(200).json({ message: 'Success', order: order });
  } catch (error) {
    console.log(error);
  }
};

exports.getTickets = async (req, res, next) => {
  try {
    // console.log(req.user.email);
    // const email = req.user.email;
    const email = 'harini@freshlyy.com';
    const tickets = await SupportTicket.find({ userEmail: email });
    res.status(200).json({ message: 'Success', tickets: tickets });
  } catch (error) {
    console.log(error);
  }
};
