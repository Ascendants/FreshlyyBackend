const express = require('express');

const farmerController = require('../controllers/farmer');

const router = express.Router();

// router.get('/product/:purl', publicController.getProduct);
// router.get('/user', publicController.createUser);
router.get('/hello', farmerController.getHello);
router.get('/dashboard', farmerController.getDashboard);

router.post('/support-ticket', farmerController.supportTicket);
router.get('/support-ticket', farmerController.getSupportTicket); 
router.patch('/support-ticket/:id', farmerController.updateSupportTicket);
router.delete('/support-ticket/:id', farmerController.deleteSupportTicket);

router.post('/create-coupon', farmerController.createCoupon);

module.exports = router;
