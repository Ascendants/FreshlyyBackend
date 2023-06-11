const express = require('express');

const publicController = require('../controllers/public');

const router = express.Router();

router.get('/product/:purl', publicController.getProduct);
router.get('/user', publicController.createUser);
router.get('/hello', publicController.createProduct);


module.exports = router;
