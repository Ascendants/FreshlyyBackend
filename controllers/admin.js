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
const Reports = require("../models/DailyTaskReport");
const { validationResult } = require("express-validator");
const DailyTaskReport = require("../models/DailyTaskReport");

exports.getDashboard = async (req, res, next) => {
  // console.log("Hello");
  const numOfProducts = await Product.countDocuments({ status: "Live" });
  const numOfUsers = await User.countDocuments({});
  const numOfSupportTickets = await SupportTicket.countDocuments({});
  const numOfActiveCoupons = await Coupon.countDocuments({ status: "Active" });
  const numOfPendingProducts = await Product.countDocuments({
    status: "Paused",
  });
  const numOfWithdrawRequests = await PayoutRequest.countDocuments({});
  const numOfReports = await DailyTaskReport.countDocuments({});
  res.status(200).json({
    message: "Success",
    numOfProducts: numOfProducts,
    numOfUsers: numOfUsers,
    numOfSupportTickets: numOfSupportTickets,
    numOfActiveCoupons: numOfActiveCoupons,
    numOfPendingProducts: numOfPendingProducts,
    numOfWithdrawRequests: numOfWithdrawRequests,
    numOfReports: numOfReports,
  });
};

exports.getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({ status: "Pending" });
    res.status(200).json({ message: "Success", coupons: coupons });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error fetching coupons from database" });
  }
};

exports.createCoupon = async (req, res) => {
  const { presentage, cCode, cDate, eDate, userEmail } = req.body;
  const coupon = await Coupon.findOne({ cCode: cCode });
  if (coupon) {
    return res.status(422).json({ message: "coupon code already exits" });
  }
  if (!presentage || !cCode || !cDate || !eDate || !userEmail) {
    // Check if any required field is missing in the request body
    return res.status(400).json({ error: "Missing required fields" });
  }
  const newCoupon = new Coupon({
    userEmail: userEmail,
    presentage: presentage,
    cCode: cCode,
    cDate: cDate,
    eDate: eDate,
    status: "Paused",
  });
  console.log(newCoupon);
  try {
    const doc = await new Coupon(newCoupon).save();
    res.status(200).json({ message: "Success", coupon: doc });
  } catch (error) {
    res.status(500).send(error);
  }
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
exports.verifyCouponCode = async (req, res) => {
  const cCode = req.body.cCode;
  try {
    const coupon = await Coupon.findOne({ cCode: cCode });
    // console.log(coupon);
    if (coupon.length > 0) {
      res.status(200).json({
        message: "Code is already in the database",
        cCode: cCode,
        isExist: true,
      });
    } else {
      res
        .status(200)
        .json({ message: "Code is unique", cCode: cCode, isExist: false });
    }
  } catch (error) {
    res.status(500).json({ message: error });
  }
};
