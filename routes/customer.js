const express = require('express');

const customerController = require('../controllers/customer');
const authController = require('../controllers/auth');

const router = express.Router();

const { body } = require('express-validator');
router.use('*',authController.checkCommonAuth);
router.post('/signup',customerController.signUp);
//router.use('*',customerController.checkSignupCustomer);

router.post('/place-order/', customerController.postOrder);

router.post('/payment/', customerController.postPayment);

router.post('/like/:productId', customerController.postLike);

router.get('/get-payment-intent', customerController.getPaymentIntent);

router.get('/get-card-setup-intent', customerController.getCardSetupIntent);

//testing route
router.get(
  '/create-stripe-customer',
  customerController.getCreateStripeCustomer
);

router.get('/create-stripe-account', customerController.getCreateStripeAccount);

router.get('/cart/', customerController.getCart);

router.post('/cart/add', customerController.postCart);

router.get('/wishlist/', customerController.getWishList);

router.get('/cards/', customerController.getCards);

router.get('/dashboard', customerController.getDashboard);


router.get('/mainpage', customerController.getProducts);

router.get('/social-corner', customerController.getSocialProducts);

router.get('/get-support-tickets', customerController.getTickets);

const cardTypes = {
  visa: /^4[0-9]{12}(?:[0-9]{3})?$/,
  master:
    /^(5[1-5][0-9]{14}|2(22[1-9][0-9]{12}|2[3-9][0-9]{13}|[3-6][0-9]{14}|7[0-1][0-9]{13}|720[0-9]{12}))$/,
  amex: /^3[47][0-9]{13}$/,
};

router.delete('/delete-card/:cardId', customerController.deleteRemoveCard);

router.post('/cancel-order/:orderId', customerController.postCancelOrder);
router.post('/confirm-pickup/:orderId', customerController.postPickupOrder);

router.get('/get-order/:orderId', customerController.getOrderDetails);
router.get('/get-orders/:type', customerController.getOrders);

router.get('/getSpecificOrder/:orderId', customerController.getSpecificOrder);

router.get('/notifications', customerController.getNotifications);

module.exports = router;
