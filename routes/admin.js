const express = require("express");

const adminController = require("../controllers/admin");

const router = express.Router();

const { body } = require("express-validator");

router.get("/adminDashboard", adminController.getDashboard);

router.get("/coupons", adminController.getCoupons);

router.post("/createCoupons", adminController.createCoupon);

router.get("/editCoupons", adminController.editCoupons);

router.put("/updateCoupons/:id", adminController.updateCoupons);

router.post("/verifyCouponCode", adminController.verifyCouponCode);

module.exports = router;
