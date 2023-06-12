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
const Config = require('../models/Config');
const Coupon = require('../models/Coupon');
const { sendLoyaltyLevelUpNotifs } = require('./notifications');
const FarmerPayment = require('../models/FarmerPayment');

async function generateCouponCode() {
  while (true) {
    const code = 'CP' + Math.floor(Math.random() * 1000000);
    const coupon = await Coupon.findOne({ cCode: code });
    if (!coupon) {
      return code;
    }
  }
}
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
exports.runHourlyTasks = async () => {
  const session = await mongoose.startSession();
  try {
    const report = new DailyTaskReport({ report: '' });
    const date = new Date();
    appendToReport(report, 'Freshlyy Hourly Tasks');
    appendToReport(report);
    appendToReport(report, 'Cancelling unpaid settlements');
    appendToReport(report);
    await cancelUnpaidSettlements(session, date, report);
    appendToReport(report, 'Done Cancelling unpaid settlements');
    appendToReport(report);
    await session.endSession();
    appendToReport(report, 'Cancelling unpaid orders');
    appendToReport(report);
    await this.cancelOrdersNotPaid(report);
    appendToReport(report, 'Done Cancelling unpaid orders');
    appendToReport(report);
    appendToReport(report);
    appendToReport(report, 'Done Running Hourly Tasks');
    report.save();
  } catch (err) {
    console.log(err);
  }
};

exports.runTasks = async () => {
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
    appendToReport(report, 'Cancelling unpaid settlements');
    appendToReport(report);
    await cancelUnpaidSettlements(session, date, report);
    appendToReport(report, 'Done Cancelling unpaid settlements');
    appendToReport(report);
    await session.endSession();
    appendToReport(report, 'Cancelling unpaid orders');
    appendToReport(report);
    await this.cancelOrdersNotPaid(report);
    appendToReport(report, 'Done Cancelling unpaid orders');
    appendToReport(report);

    appendToReport(report);
    appendToReport(report, 'Done Running Daily Tasks');
    report.save();
  } catch (err) {
    console.log(err);
  }
};

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
    appendToReport(report);
    appendToReport(report, 'Done Suspending Farmers who havent paid');
    appendToReport(report, 'Done Running Daily Tasks');
    report.save();
  } catch (err) {
    console.log(err);
  }
};

exports.runMonthly1stTasks = async () => {
  const session = await mongoose.startSession();
  try {
    const report = new DailyTaskReport({ report: '' });
    const date = new Date();
    appendToReport(report, 'Freshlyy Monthly 1st Tasks');
    appendToReport(report);
    await resetLoyaltyPoints(session, date, report);
    await session.endSession();

    appendToReport(report);
    appendToReport(report, 'Done Monthly 1st Tasks');
    report.save();
  } catch (err) {
    console.log(err);
  }
};

exports.runMonthly5thTasks = async () => {
  const session = await mongoose.startSession();
  try {
    const report = new DailyTaskReport({ report: '' });
    const date = new Date();

    appendToReport(report, 'Start Clearing Invoices');
    appendToReport(report);
    await closeInvoicesAtMonthEnd(session, date, report);
    appendToReport(report, 'Done Clearing Invoices');

    appendToReport(report, 'Done Running Monthly 5th Tasks');
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
    let totalPayment = 0;
    let balanceToUpdate = 0;
    let cashOnDelivery = 0;

    for (payment of order.payment) {
      if (payment.status != 'Success') {
        continue;
      }

      if (payment.type == 'COD') {
        balanceToUpdate += order.commission * -1;
        totalPayment = payment.amount;
        cashOnDelivery += payment.amount;
        break;
      } else if (payment.type == 'Card') {
        balanceToUpdate +=
          order.totalPrice + order.totalDeliveryCharge - order.commission;
        totalPayment += payment.amount;
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

        //updating loyalty points of customer
        const user = await User.findById(order.customer).session(session);
        const loyaltyScheme = (await Config.findOne({})).loyaltyScheme;
        let existingLoyaltyLevel;
        for (let loyaltyLevel of loyaltyScheme) {
          if (
            loyaltyLevel.minPoints <= user.customer.loyaltyPoints &&
            loyaltyLevel.maxPoints >= user.customer.loyaltyPoints
          ) {
            existingLoyaltyLevel = loyaltyLevel;
            break;
          }
        }
        const newLoyaltyPoints =
          user.customer.loyaltyPoints + Math.floor(totalPayment / 100);
        let newLoyaltyLevel;
        for (let loyaltyLevel of loyaltyScheme) {
          if (
            loyaltyLevel.minPoints <= newLoyaltyPoints &&
            loyaltyLevel.maxPoints >= newLoyaltyPoints
          ) {
            newLoyaltyLevel = loyaltyLevel;
            break;
          }
        }
        await User.findByIdAndUpdate(order.customer, {
          $inc: { 'customer.loyaltyPoints': Math.floor(totalPayment / 100) },
        }).session(session);
        if (newLoyaltyLevel.name != existingLoyaltyLevel.name) {
          const code = await generateCouponCode();
          const gift = new Coupon({
            cCode: code,
            type: 'Loyalty',
            eDate: new Date().setDate(new Date().getDate() + 30),
            percentage: newLoyaltyLevel.gift,
            status: 'Active',
          });
          await gift.save({ session: session });

          sendLoyaltyLevelUpNotifs(user, newLoyaltyLevel, gift.cCode);
        }
        appendToReport(
          report,
          'Added ' +
            Math.floor(totalPayment / 100) +
            ' Loyalty points to customer ' +
            order.customer +
            ' for order #' +
            order._id
        );

        const farmerInvoiceId = `${order.farmer}-${(orderDate.getMonth() + 1)
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

        const companyInvoiceId = `${(orderDate.getMonth() + 1)
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
  appendToReport(report, 'Today is the 5th of the month, closing invoices...');
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
    appendToReport(report, 'Error: Could not close Invoices for ' + prevMonth);
    console.log(err);
  }
}

async function resetLoyaltyPoints(session, date, report) {
  //reseting loyaltypoints at the end of month
  appendToReport(
    report,
    'Today is the 1th of month, resetting loyalty points to 0...'
  );
  try {
    await session.withTransaction(async () => {
      await User.updateMany(
        { 'customer.loyaltyPoints': { $gt: 0 } },
        { 'customer.loyaltyPoints': 0 },
        { session: session }
      );
    });
    appendToReport(report, 'Successfully reset loyalty points.');
  } catch (err) {
    appendToReport(report, 'Error: Could not reset loyalty points');
    console.log(err);
  }
}

async function cancelUnpaidSettlements(session, date, report) {
  try {
    await session.withTransaction(async () => {
      const unpaidSettlements = await FarmerPayment.find({
        status: 'Pending',
      });
      for (let settlement of unpaidSettlements) {
        const hoursAfterPlaced = (Date.now() - settlement.createdDate) / 36e5;
        if (hoursAfterPlaced > 1) {
          settlement.status = 'Failed';
          await settlement.save({ session: session });
          appendToReport(report, `Cancelled settlement ${settlement._id}`);
        }
      }
    });
  } catch (err) {
    appendToReport(report, 'Error: Could not cancel unpaid settlements');
    console.log(err);
  }
}
exports.cancelOrdersNotPaid = async (report) => {
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
      appendToReport(report, `Cancelled order ${order._id}`);
    }
  }
};
