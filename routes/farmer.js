const express = require('express');

const farmerController = require('../controllers/farmer');

const router = express.Router();

// router.get('/product/:purl', publicController.getProduct);
// router.get('/user', publicController.createUser);
router.get('/hello', farmerController.getHello);
router.get('/dashboard', farmerController.getDashboard);
router.post('/insertProduct',farmerController.insertProduct)

module.exports = router;
