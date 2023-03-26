const express = require('express');

const farmerController = require('../controllers/farmer');

const router = express.Router();

const { body } = require('express-validator');

// router.get('/product/:purl', publicController.getProduct);
// router.get('/user', publicController.createUser);
router.get('/hello', farmerController.getHello);
router.get('/dashboard', farmerController.getDashboard);

router.get('/get-banks', farmerController.getBanks);

router.get('/earnings', farmerController.getEarnings);

router.post('/payout-request', farmerController.postPayoutRequest);

router.get('/payout-requests', farmerController.getPayoutRequests);

router.get('/invoices', farmerController.getInvoices);

router.post(
  '/save-account',
  [
    body('AccountName').trim().isLength({ min: 2, max: 20 }),
    body('AccountNumber').trim().isNumeric(),
    body('bankId').trim(),
  ],
  farmerController.postSaveAccount
);

//test route. must be removed in production
// router.post('/add-bank', farmerController.postCreateBank);

module.exports = router;
