const express = require('express');

const customerController = require('../controllers/customer');

const router = express.Router();

router.put('/place-order/', customerController.putOrder);

module.exports = router;
