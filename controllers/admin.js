const Product = require("../models/Product");
const User = require("../models/User");
const moment = require("moment");
const Order = require("../models/Order");
const { ObjectId } = require("mongodb");
const Bank = require("../models/Bank");
const SupportTicket = require("../models/SupportTicket");
const Coupon = require("../models/Coupon");
const { logger } = require("../util/logger");
const PayoutRequest = require("../models/PayoutRequest");
const mongoose = require("mongoose");

const { validationResult } = require("express-validator");

exports.getDashboard = async (req, res, next) => {
  // console.log("Hello");
  const numOfProducts = await Product.countDocuments({ status: "Live" });
  const numOfUsers = await User.countDocuments({});
  const numOfSupportTickets = await SupportTicket.countDocuments({});
  res.status(200).json({
    message: "Success",
    numOfProducts: numOfProducts,
    numOfUsers: numOfUsers,
    numOfSupportTickets: numOfSupportTickets,
  });
};

exports.getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({});
    res.status(200).json({ message: "Success", coupons: coupons });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error fetching coupons from database" });
  }
};

exports.createCoupon = (req, res) => {
  console.log(req.body);
  const { presentage, cCode, cDate, eDate, userEmail } = req.body;

  const newCoupon = new Coupon({
    userEmail: userEmail,
    presentage: presentage,
    cCode: cCode,
    cDate: cDate,
    eDate: eDate,
  });

  newCoupon.save((error) => {
    if (error) {
      res.status(500).send(error);
    } else {
      console.log("success");
      res.status(200).json({ message: "Success" });
    }
  });
};

exports.editCoupons = async (req, res) => {
  try {
    const data = await Coupon.find({ status: { $ne: "delete" } });
    res.status(200).json({ message: "Success", coupon: data });
  } catch (error) {
    res.status(500).json({ message: "fail" });
  }
};

exports.updateCoupons = async (req, res) => {
  try {
    const data = await Coupon.findByIdAndUpdate(req.params.id, req.body);
    res.status(200).json({ message: "Success", coupon: data });
  } catch (error) {
    res.status(500).json({ message: error });
  }
};
