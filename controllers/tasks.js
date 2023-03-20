const Product = require('../models/Product');
const { logger } = require('../util/logger');
const User = require('../models/User');
const Order = require('../models/Order');
const FarmerMonthInvoice = require('../models/FarmerMonthInvoice');
const CompanyMonthInvoice = require('../models/CompanyMonthInvoice');
const mongoose = require('mongoose');
const customerController = require('../controllers/customer');
const farmerController = require('../controllers/farmer');
const DailyTaskReport = require('../models/DailyTaskReport');

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
function appendToReport(
  report,
  message = '======================================================'
) {
  report.report +=
    new Date().toLocaleString(undefined, { timeZone: 'Asia/Colombo' }) +
    ' ' +
    message +
    '\n';
}
exports.runDailyTasks = async () => {
  const session = await mongoose.startSession();
  try {
    const report = new DailyTaskReport({ report: '' });
    const date = new Date();
    appendToReport(report, 'Start Clearning Funds for Orders');
    appendToReport(report);
    await clearFundsForOrder(session, date, report);
    appendToReport(report, 'Done Clearing Funds for Orders');
    appendToReport(report);

    appendToReport(report, 'Start Suspending Farmers who havent paid');
    appendToReport(report);

    await suspendFarmersWhoHaventPaid(session, date, report);
    appendToReport(report, 'Done Suspending Farmers who havent paid');
    appendToReport(report);

    appendToReport(report, 'Start Clearing Invoices');
    appendToReport(report);

    await closeInvoicesAtMonthEnd(session, date, report);
    appendToReport(report, 'Done Clearing Invoices');
    appendToReport(report);

    report.save();
  } catch (err) {
    console.log(err);
  }
};

async function clearFundsForOrder(session, date, report) {
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
  appendToReport(report, 'Fetched ' + orders.length + ' orders');
  for (let order of orders) {
    const orderDate = new Date(order.orderUpdate.placed);

    const completionTime =
      order.orderUpdate.delivered || order.orderUpdate.pickedUp;

    const hoursAfterComplete = (Date.now() - completionTime) / 36e5 + 72;
    //remove the + 72. added for testing

    if (hoursAfterComplete < 72) {
      continue;
    }
    appendToReport(report, 'Order #' + order._id + ' is being processed');

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
        appendToReport(report, 'Marked Order #' + order._id + ' as closed');

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
        appendToReport(
          report,
          'Updated Farmer Invoice for order #' + order._id
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
          const activate = await farmerController.changeFarmerFinStatus(
            order.farmer,
            'Active',
            session
          );
          if (activate) {
            appendToReport(
              report,
              'Reactivated Farmer #' + farmerUser._id + ' financially.'
            );
          } else {
            throw new Error('Could not activate farmer');
          }
        }
        appendToReport(
          report,
          'Updated Farmer #' + farmerUser._id + ' balance'
        );

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
      appendToReport(report, 'Updated Company Invoice for order #' + order._id);
      appendToReport(report, 'Successfully closed order #' + order._id);
    } catch (err) {
      console.log('Error: ', err);
      appendToReport(report, 'Error with closing order #' + order._id);
    }
    appendToReport(report);
  }
  appendToReport(report);
}

async function suspendFarmersWhoHaventPaid(session, date, report) {
  const farmers = await User.find({
    accessLevel: 'Farmer',
    'farmer.finStatus': 'Active',
    'farmer.status': 'Active',
    status: 'Active',
  });
  appendToReport(report, 'Fetched ' + farmers.length + ' farmers');
  for (let farmerUser of farmers) {
    if (!farmerUser.farmer.negativeBalanceSince) {
      continue;
    }
    const timeSinceNegativeBalance =
      (date - new Date(farmerUser.farmer.negativeBalanceSince)) / 36e5 / 24 +
      30;
    if (timeSinceNegativeBalance > 30) {
      appendToReport(report, 'Suspending Farmer ' + farmerUser._id + '...');
      const suspend = await farmerController.changeFarmerFinStatus(
        farmerUser._id,
        'Suspended',
        session,
        true
      );
      if (suspend) {
        appendToReport(report, 'Suspended ' + farmerUser._id);
      } else {
        appendToReport(report, 'Error: Could not suspend ' + farmerUser._id);
      }
      appendToReport(report);
    }
  }
}

async function closeInvoicesAtMonthEnd(session, date, report) {
  //closing invoices at the end of month
  if (date.getDate() == 5) {
    appendToReport(
      report,
      'Today is the 5th of the month, closing invoices...'
    );
    const prevMonth = getPreviousMonth(date);
    try {
      await session.withTransaction(async () => {
        appendToReport(report, 'Closing Company Invoices for ' + prevMonth);
        await CompanyMonthInvoice.findOneAndUpdate(
          { invoiceId: prevMonth },
          {
            status: 'Closed',
          },
          { session: session }
        );
        appendToReport(report, 'Closing Farmer Invoices for ' + prevMonth);
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
      appendToReport(report, 'Successfully Closed Invoices for ' + prevMonth);
    } catch (err) {
      appendToReport(
        report,
        'Error: Could not close Invoices for ' + prevMonth
      );
      console.log(err);
    }
  }
}
