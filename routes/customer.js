const express = require('express');

const customerController = require('../controllers/customer');

const router = express.Router();

const { body } = require('express-validator');

router.post('/place-order/', customerController.postOrder);

router.post('/payment/', customerController.postPayment);

router.get('/cart/', customerController.getCart);

router.get('/cards/', customerController.getCards);

router.get('/dashboard', customerController.getDashboard);

const cardTypes = {
  visa: /^4[0-9]{12}(?:[0-9]{3})?$/,
  master:
    /^(5[1-5][0-9]{14}|2(22[1-9][0-9]{12}|2[3-9][0-9]{13}|[3-6][0-9]{14}|7[0-1][0-9]{13}|720[0-9]{12}))$/,
  amex: /^3[47][0-9]{13}$/,
};

router.post(
  '/save-card',
  [
    body('CardNumber')
      .trim()
      .matches(
        cardTypes.amex.source +
          '|' +
          cardTypes.master.source +
          '|' +
          cardTypes.visa.source
      ),
    body('Nickname').trim().isLength({ min: 2, max: 15 }),
    body('CardHolderName').trim().isLength({ min: 2, max: 22 }),
    body('CVV')
      .trim()
      .matches(/^[0-9]{3,4}$/),
    body('ExpiryDate')
      .trim()
      .matches(/((0[1-9])|(1[02]))\/\d{2}/),
  ],
  customerController.postSaveCard
);

router.delete('/delete-card/:cardId', customerController.deleteRemoveCard);

router.post(
  '/edit-card/:cardId',
  [body('Nickname').trim().isLength({ min: 2, max: 15 })],
  customerController.postEditCard
);

router.get('/get-order/:orderId', customerController.getOrderDetails);
router.get('/get-orders/:type', customerController.getOrders);

module.exports = router;
