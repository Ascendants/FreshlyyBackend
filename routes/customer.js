const express = require('express');

const customerController = require('../controllers/customer');

const router = express.Router();

router.post('/place-order/', customerController.postOrder);

router.post('/payment/', customerController.postPayment);

router.get('/cart/', customerController.getCart);

router.get('/cards/', customerController.getCards);

module.exports = router;
