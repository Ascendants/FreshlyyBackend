const express = require('express');

const customerController = require('../controllers/customer');

const router = express.Router();

router.post('/place-order/', customerController.postOrder);

router.get('/cart/', customerController.getCart);

module.exports = router;
