const express = require("express");

const adminController = require("../controllers/admin");

const router = express.Router();

const { body } = require("express-validator");

router.get("/adminDashboard", adminController.getDashboard);

router.get("/coupons", adminController.getCoupons);

router.post("/createCoupons", adminController.createCoupon);

module.exports = router;
