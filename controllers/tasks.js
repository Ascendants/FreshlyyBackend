const Product = require('../models/Product');
const { logger } = require('../util/logger');
const User = require('../models/User');
const Order = require('../models/Order');
const FarmerMonthInvoice = require('../models/FarmerMonthInvoice');
const CompanyMonthInvoice = require('../models/CompanyMonthInvoice');
const mongoose = require('mongoose');
const customerController = require('../controllers/customer');

exports.cancelOrdersNotPaid = async () => {
  const orders = await Order.find({
    'orderUpdate.failed': { $eq: null },
    'orderUpdate.payment': { $eq: null },
    'orderUpdate.placed': { $ne: null },
    'orderUpdate.cancelled': { $eq: null },
    'orderUpdate.closed': { $eq: null },
  }).sort({ _id: -1 });
  for (let order of orders) {
    const hoursAfterPlaced = (Date.now() - order.orderUpdate.placed) / 36e5;
    if (hoursAfterPlaced > 12) {
      await customerController.cancelOrder(order._id);
    }
  }
};
function getPreviousMonth(date) {
  const prevMonth = new Date(date.getFullYear(), date.getMonth() - 1);
  const year = prevMonth.getFullYear();
  const month = (prevMonth.getMonth() + 1).toString().padStart(2, 0);

  return `${month}-${year}`;
}

exports.clearFundsForOrder = async () => {
  const session = await mongoose.startSession();
  const date = new Date();
  try {
    //fetch orders that has been completed
    const orders = await Order.find({
      $or: [
        {
          'orderUpdate.delivered': { $ne: null },
          'orderUpdate.failed': { $eq: null },
          'orderUpdate.cancelled': { $eq: null },
          'orderUpdate.closed': { $eq: null },
        },
        {
          'orderUpdate.pickedUp': { $ne: null },
          'orderUpdate.failed': { $eq: null },
          'orderUpdate.cancelled': { $eq: null },
          'orderUpdate.closed': { $eq: null },
        },
      ],
    });
    for (let order of orders) {
      const orderDate = new Date(order.orderUpdate.placed);
      const completionTime =
        order.orderUpdate.delivered || order.orderUpdate.pickedUp;
      const hoursAfterComplete = (Date.now() - completionTime) / 36e5 + 72;
      if (hoursAfterComplete < 72) {
        continue;
      }

      let balanceToUpdate = 0;
      let cashOnDelivery = 0;
      for (payment of order.payment) {
        if (payment.status != 'Success') {
          continue;
        }
        if (payment.type == 'COD') {
          balanceToUpdate += order.commission * -1;
          cashOnDelivery = payment.amount;
          break;
        } else if (payment.type == 'Card') {
          balanceToUpdate +=
            order.totalPrice + order.totalDeliveryCharge - order.commission;
          break;
        }
        // else if(payment.type=='Coupon') // coupon management
      }
      try {
        await session.withTransaction(async () => {
          //closing the order as completed
          await Order.findByIdAndUpdate(
            order._id,
            {
              'orderUpdate.closed': date,
            },
            { session: session }
          );
          const farmerInvoiceId = `${order.farmer}-${orderDate
            .getMonth()
            .toString()
            .padStart(2, 0)}-${orderDate.getFullYear()}`;
          const farmer = await User.findById(order.farmer);

          //updating the monthly invoice of farmer
          const farmerInvoice = await FarmerMonthInvoice.findOneAndUpdate(
            { invoiceId: farmerInvoiceId },
            {
              farmerId: order.farmer,
              $inc: {
                totalEarnings: order.totalPrice + order.totalDeliveryCharge,
                commissionAmount: order.commission,
                cashInHand: cashOnDelivery,
              },
              $push: { orders: order._id },
              date: {
                year: orderDate.getFullYear(),
                month: orderDate.getMonth(),
              },
              farmerName: farmer.fname + ' ' + farmer.lname,
              farmerEmail: farmer.email,
              farmerAddress: farmer.bAddress,
            },
            { upsert: true, session: session }
          );

          //updating farmer balances and closing the past month invoice if a new one was created
          if (farmerInvoice == null) {
            //if a new invoice was created, then its a new month, therefore,
            //reset accumulated balances to 0 and close the last month invoice
            await User.findByIdAndUpdate(
              order.farmer,
              {
                $inc: {
                  'farmer.withdrawable': balanceToUpdate,
                },
                'farmer.lastBalanceUpdate': date,
                'farmer.accCommissionCharges': order.commission,
                'farmer.accTotalEarnings':
                  order.totalPrice + order.totalDeliveryCharge,
                'farmer.accCashEarnings': cashOnDelivery,
              },

              { session: session }
            );
          } else {
            await User.findByIdAndUpdate(
              order.farmer,
              {
                $inc: {
                  'farmer.withdrawable': balanceToUpdate,
                  'farmer.accCommissionCharges': order.commission,
                  'farmer.accTotalEarnings':
                    order.totalPrice + order.totalDeliveryCharge,
                  'farmer.accCashEarnings': cashOnDelivery,
                  //'farmer.accCouponCharges': someamount, coupon management
                },
                'farmer.lastBalanceUpdate': date,
              },
              { session: session }
            );
          }
          //updating company invoice for the current month

          const companyInvoiceId = `${orderDate
            .getMonth()
            .toString()
            .padStart(2, 0)}-${orderDate.getFullYear()}`;
          const companyInvoice = await CompanyMonthInvoice.findOneAndUpdate(
            { invoiceId: companyInvoiceId },
            {
              $inc: {
                totalEarnings: order.totalPrice + order.totalDeliveryCharge,
                commissionAmount: order.commission,
              },
              $push: { orders: order._id },
              date: {
                year: orderDate.getFullYear(),
                month: orderDate.getMonth(),
              },
            },
            { upsert: true, session: session }
          );
        });
      } catch (err) {
        console.log('Error: ', err);
      }
    }
  } catch (err) {
    console.log('Error 2: ', err);
  }

  //closing invoices of past month
  if (date.getDate() == 5) {
    const prevMonth = getPreviousMonth(date);
    try {
      await session.withTransaction(async () => {
        await CompanyMonthInvoice.findOneAndUpdate(
          { invoiceId: prevMonth },
          {
            status: 'Closed',
          }
        );
        await FarmerMonthInvoice.updateMany(
          {
            invoiceId: { $regex: `.*${prevMonth}$`, $options: 'i' },
          },
          {
            status: 'Closed',
          }
        );
      });
    } catch (err) {
      console.log(err);
    }
  }
};
