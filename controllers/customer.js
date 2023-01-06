const Product = require('../models/Product');
const { logger } = require('../util/logger');
const User = require('../models/User');
const Order = require('../models/Order');
const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

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
          throw new Error('One or more items are not available.');
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
      await order.save({ session });
      orders.push(order);
    }
    session.abortTransaction();
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
