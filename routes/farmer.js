const express = require("express");

const farmerController = require("../controllers/farmer");

const router = express.Router();

const { body } = require('express-validator');

// router.get('/product/:purl', publicController.getProduct);
// router.get('/user', publicController.createUser);
router.get("/hello", farmerController.getHello);
router.get("/dashboard", farmerController.getDashboard);

router.get('/get-banks', farmerController.getBanks);

router.post(
  '/save-account',
  [
    body('AccountName').trim().isLength({ min: 2, max: 20 }),
    body('AccountNumber').trim().isNumeric(),
    body('bankId').trim(),
  ],
  farmerController.postSaveAccount
);

//make this admin routes
router.get('/get-support-tickets', farmerController.getSupportTicket);
router.put('/update-support-ticket/:id', farmerController.updateSupportTicket);
router.delete('/delete-support-ticket/:id', farmerController.deleteSupportTicket);
router.post('/support-ticket', farmerController.supportTicket);

router.post('/create-coupon',farmerController.createCoupon);
router.post('/verify-coupon-code',farmerController.verifyCouponCode);

//test route. must be removed in production
// router.post('/add-bank', farmerController.postCreateBank);

module.exports = router;
