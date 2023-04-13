const { Expo } = require('expo-server-sdk');

const expo = new Expo({ accessToken: process.env.EXPO_PUSH });
const SibApiV3Sdk = require('sib-api-v3-sdk');
const defaultClient = SibApiV3Sdk.ApiClient.instance;

const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.SENDINBLUE_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

exports.sendPushNotification = async (user, notification) => {
  if (!user.pushToken) return;
  try {
    const message = {
      to: user.pushToken,
      sound: 'default',
      ...notification,
    };
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
    await sendPushNotification(farmer, farmerNotification);
    await sendPushNotification(customer, customerNotification);
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
      totalPrice: order.totalPrice,
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

exports.sendOrderConfirmedNotifs = async (farmer, customer, order) => {
  await sendOrderConfirmedPushNotification(farmer, customer, order.totalPrice);
  await sendOrderConfirmedEmail(farmer, customer, order);
};
