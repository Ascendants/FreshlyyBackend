const cron = require('node-cron');
const taskController = require('./controllers/tasks');
exports.hourly = () => {
  cron.schedule('0 0 * * * *', () => {
    taskController.runHourlyTasks();
    //cancelling unpaid orders
    //cancelling unpaid farmer settlements
  });
};

exports.daily = () => {
  cron.schedule('0 15 0 * * *', () => {
    taskController.runDailyTasks();
    // - this starts at 12:15 am everyday to prevent conflicts with hourly
    //clear funds for orders that are older than 3 days and completed
    // - activate farmers with positive balance
    // - suspend farmers with negative balance
    // - adjust customer loyalty levels and send gifts
    // - update farmer invoices
    // - update the whole company invoice
    //suspend farmers with negative balance for more than 30 days
  });
};

exports.monthly1st = () => {
  cron.schedule('0 30 0 0 * *', () => {
    taskController.runMonthly1stTasks();
    // - reset customer loyalay points to zero
  });
};

exports.monthly5th = () => {
  cron.schedule('0 30 0 5 * *', () => {
    taskController.runMonthly5thTasks();
    // - close farmer invoices for the past month
    // - close the whole company invoice for the past month
  });
};
