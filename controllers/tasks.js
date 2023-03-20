const Product = require('../models/Product');
const { logger } = require('../util/logger');
const User = require('../models/User');
const Order = require('../models/Order');
const FarmerMonthInvoice = require('../models/FarmerMonthInvoice');
const CompanyMonthInvoice = require('../models/CompanyMonthInvoice');
const mongoose = require('mongoose');
const customerController = require('../controllers/customer');
const farmerController = require('../controllers/farmer');

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

exports.runDailyTasks = async () => {
  const session = await mongoose.startSession();
  const date = new Date();
  await clearFundsForOrder(session, date);
  await suspendFarmersWhoHaventPaid(session, date);
  await closeInvoicesAtMonthEnd(session, date);
};

async function clearFundsForOrder(session, date) {
  let orders;
  try {
    //fetch orders that has been completed
    orders = await Order.find({
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
  } catch (err) {
    logger(err);
    return;
  }

  if (!orders) {
    return;
  }

  for (let order of orders) {
    const orderDate = new Date(order.orderUpdate.placed);

    const completionTime =
      order.orderUpdate.delivered || order.orderUpdate.pickedUp;

    const hoursAfterComplete = (Date.now() - completionTime) / 36e5 + 72;
    //remove the + 72. added for testing

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
        await Order.findByIdAndUpdate(order._id, {
          'orderUpdate.closed': date,
        }).session(session);
        const farmerInvoiceId = `${order.farmer}-${orderDate
          .getMonth()
          .toString()
          .padStart(2, 0)}-${orderDate.getFullYear()}`;
        const farmerUser = await User.findById(order.farmer).session(session);

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
            farmerName: farmerUser.fname + ' ' + farmerUser.lname,
            farmerEmail: farmerUser.email,
            farmerAddress: farmerUser.bAddress,
          },
          { upsert: true, session: session }
        );

        let farmerUpdates = {
          $inc: {
            'farmer.withdrawable': balanceToUpdate,
            'farmer.accCommissionCharges': order.commission,
            'farmer.accTotalEarnings':
              order.totalPrice + order.totalDeliveryCharge,
            'farmer.accCashEarnings': cashOnDelivery,
            //'farmer.accCouponCharges': someamount, coupon management
          },
          'farmer.lastBalanceUpdate': date,
        };

        if (farmerInvoice == null) {
          //if a new invoice was created, then its a new month, therefore,
          //reset accumulated balances to 0 and close the last month invoice
          farmerUpdates = {
            $inc: {
              'farmer.withdrawable': balanceToUpdate,
            },
            'farmer.lastBalanceUpdate': date,
            'farmer.accCommissionCharges': order.commission,
            'farmer.accTotalEarnings':
              order.totalPrice + order.totalDeliveryCharge,
            'farmer.accCashEarnings': cashOnDelivery,
          };
        }

        if (
          !farmerUser.farmer.negativeBalanceSince &&
          farmerUser.farmer.withdrawable + balanceToUpdate < 0
        ) {
          farmerUpdates['farmer.negativeBalanceSince'] = date;
        }

        if (farmerUser.farmer.withdrawable + balanceToUpdate >= 0) {
          farmerUpdates['farmer.negativeBalanceSince'] = null;
        }

        await User.findByIdAndUpdate(order.farmer, farmerUpdates, {
          session: session,
        });
        if (farmerUser.farmer.withdrawable + balanceToUpdate >= 0) {
          await farmerController.changeFarmerFinStatus(
            order.farmer,
            'Active',
            session
          );
        }

        //updating company invoice for the current month

        const companyInvoiceId = `${orderDate
          .getMonth()
          .toString()
          .padStart(2, 0)}-${orderDate.getFullYear()}`;

        await CompanyMonthInvoice.findOneAndUpdate(
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
}

async function suspendFarmersWhoHaventPaid(session, date) {
  const farmers = await User.find({
    accessLevel: 'Farmer',
    'farmer.finStatus': 'Active',
    'farmer.status': 'Active',
    status: 'Active',
  });
  for (let farmerUser of farmers) {
    if (!farmerUser.farmer.negativeBalanceSince) {
      continue;
    }
    const timeSinceNegativeBalance =
      (date - new Date(farmerUser.farmer.negativeBalanceSince)) / 36e5 / 24 +
      30;
    if (timeSinceNegativeBalance > 30) {
      await farmerController.changeFarmerFinStatus(
        farmerUser._id,
        'Suspended',
        session,
        true
      );
    }
  }
}

async function closeInvoicesAtMonthEnd(session, date) {
  //closing invoices at the end of month
  if (date.getDate() == 5) {
    const prevMonth = getPreviousMonth(date);
    try {
      await session.withTransaction(async () => {
        await CompanyMonthInvoice.findOneAndUpdate(
          { invoiceId: prevMonth },
          {
            status: 'Closed',
          },
          { session: session }
        );
        await FarmerMonthInvoice.updateMany(
          {
            invoiceId: { $regex: `.*${prevMonth}$`, $options: 'i' },
          },
          {
            status: 'Closed',
          },
          { session: session }
        );
      });
    } catch (err) {
      console.log(err);
    }
  }
}
