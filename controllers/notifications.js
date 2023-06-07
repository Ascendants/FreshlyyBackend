const { Expo } = require('expo-server-sdk');

const expo = new Expo({ accessToken: process.env.EXPO_PUSH });
const SibApiV3Sdk = require('sib-api-v3-sdk');
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const Notification = require('../models/Notification');
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.SENDINBLUE_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

exports.sendPushNotification = async (user, notification, customer = true) => {
  if (!user.pushToken) return;
  try {
    const message = {
      to: user.pushToken,
      sound: 'default',
      ...notification,
    };
    const notif = new Notification({
      user: user._id,
      customer,
      title: notification.title,
      body: notification.body,
    });
    await notif.save();
    await expo.sendPushNotificationsAsync([message]);
  } catch (err) {
    console.log(err);
  }
};

const sendOrderConfirmedPushNotification = async (farmer, customer, total) => {
  try {
    const { sendPushNotification } = require('./notifications');
    const farmerNotification = {
      title: 'Order Confirmed!',
      body: `Hooray 🥳, you have a new order from ${customer.fname} for ${total}!`,
    };
    const customerNotification = {
      title: 'Order Confirmed!',
      body: `Hooray 🎉, your order from ${farmer.fname} has been confirmed!`,
    };
    await sendPushNotification(farmer, farmerNotification, false);
    await sendPushNotification(customer, customerNotification, true);
  } catch (err) {
    console.log(err);
  }
};

const sendOrderConfirmedEmail = async (farmer, customer, order) => {
  try {
    const params = {
      customer: customer.fname,
      farmer: farmer.fname,
      orderNumber: order._id,
      items: order.items.map((item) => {
        return {
          title: item.title,
          qty: item.qty,
          price: item.price,
          uprice: item.uPrice,
          imageUrl: item.imageUrl,
        };
      }),
      totalPrice: order.totalPrice,
      totalDeliveryCharge: order.totalDeliveryCharge,
    };
    customerEmail = {
      to: [
        { email: customer.email, name: customer.fname + ' ' + customer.lname },
      ],
      templateId: 1,
      params,
    };
    farmerEmail = {
      to: [{ email: farmer.email, name: farmer.fname + ' ' + farmer.lname }],
      templateId: 2,
      params,
    };
    await apiInstance.sendTransacEmail(customerEmail);
    await apiInstance.sendTransacEmail(farmerEmail);
  } catch (err) {
    console.log(err);
  }
};

const sendOrderCancelledPushNotification = async (farmer, customer, reason) => {
  try {
    const { sendPushNotification } = require('./notifications');
    if (reason == 'payment') {
      const customerNotification = {
        title: 'Order Cancelled',
        body: `Your order from ${farmer.fname} was cancelled due to no payment 😬`,
      };
      await sendPushNotification(customer, customerNotification, true);
      return;
    }
    const farmerNotification = {
      title: 'Order Cancelled',
      body: `Your order from ${customer.fname} was cancelled 🥹`,
    };
    const customerNotification = {
      title: 'Order Cancelled',
      body: `Your order from ${farmer.fname} was cancelled!`,
    };
    await sendPushNotification(farmer, farmerNotification, false);
    await sendPushNotification(customer, customerNotification, true);
  } catch (err) {
    console.log(err);
  }
};

const sendOrderCancelledEmail = async (farmer, customer, order) => {
  try {
    const params = {
      customer: customer.fname,
      farmer: farmer.fname,
      order: order._id,
    };
    customerEmail = {
      to: [
        { email: customer.email, name: customer.fname + ' ' + customer.lname },
      ],
      templateId: 3,
      params,
    };
    farmerEmail = {
      to: [{ email: farmer.email, name: farmer.fname + ' ' + farmer.lname }],
      templateId: 4,
      params,
    };
    await apiInstance.sendTransacEmail(customerEmail);
    await apiInstance.sendTransacEmail(farmerEmail);
  } catch (err) {
    console.log(err);
  }
};

const sendOrderPickedUpPushNotification = async (farmer, customer, reason) => {
  try {
    const { sendPushNotification } = require('./notifications');
    const farmerNotification = {
      title: 'Order Picked Up',
      body: `Your order from ${customer.fname} was picked up 🥳`,
    };
    const customerNotification = {
      title: 'Order Picked Up',
      body: `You picked up your order from ${farmer.fname} 🎉!`,
    };
    await sendPushNotification(farmer, farmerNotification, false);
    await sendPushNotification(customer, customerNotification, true);
  } catch (err) {
    console.log(err);
  }
};

const sendOrderPickedUpEmail = async (farmer, customer, order) => {
  try {
    const params = {
      customer: customer.fname,
      farmer: farmer.fname,
      order: order._id,
    };
    farmerEmail = {
      to: [{ email: farmer.email, name: farmer.fname + ' ' + farmer.lname }],
      templateId: 6,
      params,
    };
    await apiInstance.sendTransacEmail(farmerEmail);
  } catch (err) {
    console.log(err);
  }
};

const sendLoyaltyLevelUpPushNotification = async (customer, loyaltyLevel) => {
  try {
    const { sendPushNotification } = require('./notifications');
    const customerNotification = {
      title: 'You reached a new loyalty level 🎉!',
      body: `Hooray 🎉, you have reached ${loyaltyLevel.name} loyalty level! Check your coupons to see what you can get!`,
    };
    await sendPushNotification(customer, customerNotification, true);
  } catch (err) {
    console.log(err);
  }
};

const sendLoyaltyLevelUpEmail = async (customer, loyaltyLevel) => {
  try {
    const params = {
      customer: customer.fname,
      loyaltyLevel: loyaltyLevel.name,
      loyaltyBadge: loyaltyLevel.badge,
    };
    customerEmail = {
      to: [
        { email: customer.email, name: customer.fname + ' ' + customer.lname },
      ],
      templateId: 8,
      params,
    };
    await apiInstance.sendTransacEmail(customerEmail);
  } catch (err) {
    console.log(err);
  }
};

exports.sendOrderConfirmedNotifs = async (farmer, customer, order) => {
  await sendOrderConfirmedPushNotification(farmer, customer, order.totalPrice);
  await sendOrderConfirmedEmail(farmer, customer, order);
};

exports.sendOrderCancelledNotifs = async (
  farmer,
  customer,
  order,
  reason = 'customer'
) => {
  if (reason == 'payment') {
    await sendOrderCancelledPushNotification(farmer, customer, reason);
    return;
  }
  await sendOrderCancelledPushNotification(farmer, customer);
  await sendOrderCancelledEmail(farmer, customer, order);
};

exports.sendOrderPickedUpNotifs = async (farmer, customer, order) => {
  await sendOrderPickedUpPushNotification(farmer, customer);
  await sendOrderPickedUpEmail(farmer, customer, order);
};

exports.sendLoyaltyLevelUpNotifs = async (customer, loyaltyLevel) => {
  await sendLoyaltyLevelUpPushNotification(customer, loyaltyLevel);
  await sendLoyaltyLevelUpEmail(customer, loyaltyLevel);
};
